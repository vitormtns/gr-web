import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { ErrorStateComponent, SkeletonComponent } from '../../design-system/feedback/feedback';
import { BadgeComponent } from '../../design-system/primitives/primitives';
import { DomainIconComponent, type DomainIconName } from '../../design-system/primitives/domain-icon';
import { DashboardStore } from './dashboard.store';
import { QueueItem, mapQueueItem } from './dashboard.models';

interface AgendaDayView {
  isoDate: string;
  weekday: string;
  day: string;
  month: string;
  isToday: boolean;
  count: number;
}

const ISO_DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

@Component({
  selector: 'app-home-actions',
  imports: [RouterLink, LucideDynamicIcon, BadgeComponent, DomainIconComponent, ErrorStateComponent, SkeletonComponent],
  template: `<div class="home-operational-row">
    <section class="surface-panel agenda-section" aria-labelledby="agenda-title">
      <div class="section-heading">
        <div>
          <span class="section-kicker">PRÓXIMOS PASSOS</span>
          <h2 id="agenda-title">Agenda operacional</h2>
        </div>
        <a class="inline-link" routerLink="/rebanho/agenda">Ver agenda <span aria-hidden="true">→</span></a>
      </div>
      @if(store.agenda().status==='ready' && store.agenda().value; as agenda){
        <div class="agenda-week" role="tablist" aria-label="Próximos 7 dias">
          @for(day of agendaDays(); track day.isoDate){
            <button
              type="button"
              role="tab"
              class="agenda-day"
              [id]="'agenda-day-tab-' + day.isoDate"
              [class.today]="day.isToday"
              [class.selected]="day.isoDate === activeAgendaDate()"
              [class.has-events]="day.count > 0"
              [attr.aria-selected]="day.isoDate === activeAgendaDate()"
              aria-controls="agenda-schedule"
              [attr.aria-label]="agendaDayLabel(day)"
              (click)="selectAgendaDate(day.isoDate)"
            >
              <span class="agenda-weekday">{{day.weekday}}</span>
              <strong class="agenda-day-number">{{day.day}}</strong>
              <span class="agenda-day-marker" aria-hidden="true">
                @if(day.count > 1){<b>{{day.count}}</b>}
                @else if(day.count === 1){<i></i>}
              </span>
              @if(day.isToday){<span class="agenda-today-label">Hoje</span>}
            </button>
          }
        </div>
        @if(agenda.items.length){
          <div class="agenda-schedule" id="agenda-schedule" role="tabpanel" [attr.aria-label]="'Atividades de ' + activeAgendaDayLabel()">
            <h3 class="agenda-schedule-title">{{activeAgendaDayLabel()}}</h3>
            @if(selectedAgendaItems().length){
              <ol class="schedule-list">
                @for(entry of selectedAgendaItems(); track entry.id){
                  <li class="schedule-item" [class.critical]="entry.status==='OVERDUE'">
                    <span class="domain-rail schedule-rail" [attr.data-domain]="domain(entry.kind)" aria-hidden="true"></span>
                    <gr-domain-icon [domain]="iconDomain(entry.kind)" size="sm" />
                    <div class="schedule-copy">
                      <strong>{{entry.title}}</strong>
                      <span>{{entry.context || kindLabel(entry.kind)}} · {{sourceLabel(entry.source)}}</span>
                      <time [attr.datetime]="entry.date">{{formatDate(entry.date)}}</time>
                    </div>
                    @if(entry.status){
                      <gr-badge [tone]="statusTone(entry.status)">{{statusLabel(entry.status)}}</gr-badge>
                    }
                  </li>
                }
              </ol>
            } @else {
              <div class="compact-empty schedule-empty">
                <span class="agenda-empty-icon" aria-hidden="true"><svg lucideIcon="calendar-days" [attr.width]="26" [attr.height]="26"></svg></span>
                <div>
                  <strong>Nenhuma atividade neste dia</strong>
                  <p>Selecione outro dia ou abra a agenda completa.</p>
                </div>
              </div>
            }
          </div>
          @if(hasMoreAgendaItems()){
            <p class="agenda-more">Há mais atividades na agenda completa.</p>
          }
        } @else {
          <div class="compact-empty agenda-empty">
            <span class="agenda-empty-icon" aria-hidden="true"><svg lucideIcon="calendar-days" [attr.width]="26" [attr.height]="26"></svg></span>
            <div>
              <strong>Nada programado nos próximos dias</strong>
              <p>Novas atividades aparecerão aqui.</p>
              <a class="inline-link" routerLink="/rebanho/agenda">Ver agenda completa <span aria-hidden="true">→</span></a>
            </div>
          </div>
        }
      } @else if(store.agenda().status==='error'){
        <gr-error-state title="Não foi possível carregar a agenda" [description]="errorText(store.agenda().error?.message)" [reference]="reference(store.agenda().error?.requestId)" (retry)="store.retry('agenda')" />
      } @else {
        <div class="queue-skeleton"><gr-skeleton /><gr-skeleton /></div>
      }
    </section>

    <section class="surface-panel attention-section" aria-labelledby="attention-title" [class.has-items]="hasAttentionItems()">
      <div class="section-heading">
        <div>
          <span class="section-kicker attention-kicker">AGORA · PRIORIDADE</span>
          <h2 id="attention-title">Atenção operacional</h2>
        </div>
        @if(store.attention().status==='ready' && store.attention().value; as attention){
          <span class="attention-count" [class.empty]="!attention.preview.length">
            {{attention.preview.length}}
          </span>
        }
      </div>
      @if(store.attention().status==='ready' && store.attention().value; as attention){
        @if(attention.preview.length){
          <div class="queue" role="list">
            @for(item of attention.preview; track item.stableId){
              @let entry = queue(item);
              <div class="queue-entry" role="listitem" [class.critical]="entry.status==='OVERDUE'" [class.due-today]="isDueToday(entry)" [class.open]="openItem()===entry.id">
                <button type="button" class="queue-button" [attr.aria-expanded]="openItem()===entry.id" (click)="toggleItem(entry.id)">
                  <span class="domain-rail" [attr.data-domain]="domain(entry.kind)" aria-hidden="true"></span>
                  <gr-domain-icon [domain]="iconDomain(entry.kind)" size="sm" />
                  <span class="queue-copy">
                    <strong>{{entry.title}}</strong>
                    <small>{{entry.context || kindLabel(entry.kind)}} · {{sourceLabel(entry.source)}}</small>
                  </span>
                  <time [attr.datetime]="entry.date">{{shortDate(entry.date)}}</time>
                  <span class="queue-chevron" aria-hidden="true">›</span>
                </button>
                @if(openItem()===entry.id){
                  <div class="queue-detail">
                    <span class="detail-badge">{{kindLabel(entry.kind)}}</span>
                    <span>Data operacional: {{formatDate(entry.date)}}</span>
                    @if(entry.status){
                      <gr-badge [tone]="statusTone(entry.status)">Situação: {{statusLabel(entry.status)}}</gr-badge>
                    }
                  </div>
                }
              </div>
            }
          </div>
        } @else {
          <div class="attention-clear">
            <span aria-hidden="true">✓</span>
            <div>
              <strong>Operação em dia</strong>
              <p>Nenhuma pendência identificada para esta fazenda.</p>
            </div>
          </div>
        }
      } @else if(store.attention().status==='error'){
        <gr-error-state title="Não foi possível carregar as pendências" [description]="errorText(store.attention().error?.message)" [reference]="reference(store.attention().error?.requestId)" (retry)="store.retry('attention')" />
      } @else {
        <div class="queue-skeleton"><gr-skeleton /><gr-skeleton /><gr-skeleton /></div>
      }
      <a class="section-link" routerLink="/rebanho/agenda">Abrir agenda completa <span aria-hidden="true">→</span></a>
    </section>
  </div>`,
  styles: [`
    :host {
      display: block;
      align-self: start;
      min-width: 0;
      height: auto;
    }
    .home-operational-row {
      min-width: 0;
      height: auto;
      display: grid;
      grid-template-columns: minmax(0, 1.55fr) minmax(18rem, 0.75fr);
      align-content: start;
      align-items: start;
      gap: var(--space-4);
    }
    .surface-panel {
      min-width: 0;
      padding: var(--space-5);
      border: 1px solid var(--border-soft);
      border-radius: var(--radius-xl);
      background: var(--canvas-elevated);
      box-shadow: var(--shadow-1);
      display: flex;
      flex-direction: column;
      position: relative;
    }
    .attention-section.has-items {
      background: #fbf5e9;
      border-color: #e3cfa0;
    }
    .attention-section:not(.has-items) {
      background: #f1f6f2;
      border-color: var(--border-soft);
    }
    .agenda-section {
      background: #eef3f0;
    }
    .section-heading {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: var(--space-3);
    }
    .section-heading h2 {
      margin: 0.15rem 0 0;
      font-size: 1.125rem;
      letter-spacing: -0.025em;
      font-weight: 750;
      color: var(--text-primary);
    }
    .section-kicker {
      display: block;
      color: var(--color-primary);
      font-size: 0.6875rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .attention-kicker {
      color: var(--semantic-warning);
    }
    .attention-count {
      min-width: 1.85rem;
      height: 1.85rem;
      display: grid;
      place-items: center;
      padding: 0 0.45rem;
      border-radius: var(--radius-pill);
      color: #925304;
      background: #f8ecd4;
      border: 1px solid rgba(179, 102, 5, 0.35);
      font-size: 0.75rem;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
    }
    .attention-count.empty {
      color: var(--semantic-success);
      background: var(--color-success-subtle);
      border-color: rgba(21, 121, 69, 0.22);
      box-shadow: none;
    }
    .queue {
      max-height: 13.5rem;
      display: grid;
      overflow-y: auto;
      overscroll-behavior: contain;
      padding-right: 4px;
    }
    .queue-entry {
      border-bottom: 1px solid rgba(179, 102, 5, 0.14);
      border-radius: var(--radius-sm);
      transition: background var(--motion-fast) var(--ease-standard);
    }
    .queue-entry:last-child {
      border-bottom: 0;
    }
    .queue-button {
      width: 100%;
      display: grid;
      grid-template-columns: 3px auto minmax(0, 1fr) auto 0.75rem;
      align-items: center;
      gap: 0.75rem;
      padding: 0.7rem 0.45rem;
      border: 0;
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      background: transparent;
      text-align: left;
      cursor: pointer;
      transition: background var(--motion-fast) var(--ease-standard);
    }
    .queue-button:hover {
      background: rgba(179, 102, 5, 0.07);
    }
    .queue-entry.open .queue-button {
      border-radius: var(--radius-sm) var(--radius-sm) 0 0;
      background: rgba(179, 102, 5, 0.08);
    }
    .domain-rail {
      width: 3px;
      height: 1.75rem;
      border-radius: var(--radius-pill);
      background: var(--color-primary);
    }
    .domain-rail[data-domain="health"] {
      background: var(--data-amber);
    }
    .domain-rail[data-domain="weight"] {
      background: var(--data-violet);
    }
    .domain-rail[data-domain="reproduction"] {
      background: #8a58a6;
    }
    .domain-rail[data-domain="movement"] {
      background: var(--color-info);
    }
    .critical .domain-rail {
      background: var(--semantic-danger);
    }
    .queue-copy { min-width: 0; }
    .queue-copy strong {
      display: block;
      font-size: 0.8125rem;
      font-weight: 700;
      line-height: 1.25;
      color: var(--text-primary);
    }
    .queue-copy small {
      display: block;
      margin-top: 0.15rem;
      overflow: hidden;
      color: var(--text-tertiary);
      font-size: 0.6875rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .queue-button time {
      color: var(--text-secondary);
      font-size: 0.6875rem;
      font-weight: 650;
      font-variant-numeric: tabular-nums;
    }
    .due-today .queue-button time {
      color: #925304;
      font-weight: 750;
    }
    .critical .queue-button time {
      color: var(--semantic-danger);
      font-weight: 750;
    }
    .queue-chevron {
      color: var(--text-tertiary);
      font-size: 0.95rem;
      font-weight: 700;
      transition: transform var(--motion-fast);
    }
    .queue-button[aria-expanded="true"] .queue-chevron {
      transform: rotate(90deg);
      color: var(--semantic-warning);
    }
    .queue-detail {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
      padding: 0 var(--space-3) var(--space-3) 1.35rem;
      border-radius: 0 0 var(--radius-sm) var(--radius-sm);
      color: var(--text-secondary);
      font-size: 0.6875rem;
      background: rgba(179, 102, 5, 0.08);
      animation: detail-in var(--motion-fast) var(--ease-standard);
    }
    @keyframes detail-in {
      from { opacity: 0; transform: translateY(-3px); }
    }
    .detail-badge {
      padding: 1px 7px;
      border-radius: var(--radius-sm);
      background: var(--surface-subtle);
      border: 1px solid var(--border-soft);
      font-weight: 650;
      color: var(--text-primary);
    }
    .attention-clear {
      min-height: 5.5rem;
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3);
      color: var(--semantic-success);
    }
    .attention-clear > span {
      width: 2.25rem;
      height: 2.25rem;
      display: grid;
      place-items: center;
      border-radius: 50%;
      background: var(--color-success-subtle);
      font-weight: 800;
      font-size: 0.95rem;
    }
    .attention-clear strong {
      font-size: 0.8125rem;
      color: var(--text-primary);
    }
    .attention-clear p {
      margin: 0.1rem 0 0;
      font-size: 0.6875rem;
      color: var(--text-secondary);
    }
    .section-link, .inline-link {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      color: var(--color-primary);
      font-size: 0.75rem;
      font-weight: 700;
      text-decoration: none;
      transition: color var(--motion-fast);
    }
    .section-link {
      align-self: flex-start;
      margin-top: auto;
      padding-top: var(--space-3);
    }
    .section-link:hover, .inline-link:hover {
      text-decoration: underline;
      color: var(--color-primary-hover);
    }
    .agenda-week {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: 4px;
      margin-bottom: var(--space-3);
    }
    .agenda-day {
      min-width: 0;
      display: grid;
      justify-items: center;
      gap: 1px;
      padding: 0.55rem 0.15rem 0.5rem;
      border: 1px solid var(--border-soft);
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
      background: var(--canvas-elevated);
      font-size: 0.6875rem;
      cursor: pointer;
      transition: border-color var(--motion-fast) var(--ease-standard), background var(--motion-fast) var(--ease-standard);
    }
    .agenda-day:hover {
      border-color: var(--border-strong);
      background: var(--surface-subtle);
    }
    .agenda-day.selected {
      border-color: var(--brand-primary);
      color: var(--text-primary);
      background: #f2f7f3;
      box-shadow: inset 0 0 0 1px var(--brand-primary);
    }
    .agenda-weekday {
      font-size: 0.625rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--text-tertiary);
    }
    .agenda-day.selected .agenda-weekday {
      color: var(--brand-primary);
    }
    .agenda-day-number {
      font-family: var(--font-display);
      font-size: 1.0625rem;
      font-weight: 700;
      line-height: 1.1;
      color: var(--text-primary);
      font-variant-numeric: tabular-nums;
    }
    .agenda-day-marker {
      height: 0.9rem;
      display: grid;
      place-items: center;
    }
    .agenda-day-marker i {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: var(--color-info);
    }
    .agenda-day-marker b {
      min-width: 1rem;
      height: 1rem;
      display: grid;
      place-items: center;
      padding: 0 0.2rem;
      border-radius: var(--radius-pill);
      color: #fff;
      background: var(--color-info);
      font-size: 0.625rem;
      font-weight: 750;
      font-variant-numeric: tabular-nums;
    }
    .agenda-today-label {
      font-size: 0.5625rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--brand-primary);
    }
    .agenda-schedule {
      min-width: 0;
    }
    .agenda-schedule-title {
      margin: 0 0 var(--space-2);
      font-size: 0.6875rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--text-secondary);
    }
    .schedule-list {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .schedule-item {
      display: grid;
      grid-template-columns: 3px auto minmax(0, 1fr) auto;
      align-items: center;
      gap: 0.75rem;
      padding: 0.6rem 0.15rem;
      border-bottom: 1px solid var(--border-soft);
    }
    .schedule-item:last-child {
      border-bottom: 0;
    }
    .schedule-rail {
      align-self: stretch;
      height: auto;
      min-height: 2.75rem;
    }
    .schedule-copy {
      min-width: 0;
    }
    .schedule-copy strong {
      display: block;
      font-size: 0.8125rem;
      font-weight: 700;
      line-height: 1.25;
      color: var(--text-primary);
    }
    .schedule-copy span {
      display: block;
      margin-top: 0.15rem;
      overflow: hidden;
      color: var(--text-tertiary);
      font-size: 0.6875rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .schedule-copy time {
      display: block;
      margin-top: 0.15rem;
      color: var(--text-secondary);
      font-size: 0.6875rem;
      font-weight: 650;
      font-variant-numeric: tabular-nums;
    }
    .critical .schedule-copy time {
      color: var(--semantic-danger);
      font-weight: 750;
    }
    .schedule-item gr-badge {
      align-self: start;
    }
    .agenda-more {
      margin: var(--space-3) 0 0;
      font-size: 0.6875rem;
      color: var(--text-tertiary);
    }
    .compact-empty {
      display: grid;
      align-content: center;
      padding: var(--space-3);
      border-block: 1px solid var(--border-soft);
    }
    .compact-empty strong {
      font-size: 0.8125rem;
      color: var(--text-primary);
    }
    .compact-empty p {
      margin: 0.15rem 0 0;
      font-size: 0.6875rem;
      color: var(--text-secondary);
    }
    .agenda-empty {
      grid-template-columns: auto minmax(0, 1fr);
      align-items: center;
      gap: var(--space-3);
      border-block: 0;
      padding: var(--space-2) 0;
    }
    .agenda-empty-icon {
      width: 2.25rem;
      height: 2.25rem;
      display: grid;
      place-items: center;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-soft);
      color: var(--color-info);
      background: var(--canvas-elevated);
    }
    .agenda-empty .inline-link {
      margin-top: 0.35rem;
    }
    .queue-skeleton {
      display: grid;
      gap: 0.6rem;
    }
    .queue-skeleton gr-skeleton { height: 2.2rem; }
    @media (max-width: 64rem) {
      .home-operational-row {
        grid-template-columns: 1fr;
      }
    }
    @media (max-width: 40rem) {
      .surface-panel {
        padding: var(--space-4);
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeActionsComponent {
  readonly openItem = signal<string | null>(null);
  readonly selectedAgendaDate = signal<string | null>(null);
  queue = mapQueueItem;
  constructor(readonly store: DashboardStore) {}
  toggleItem(id: string): void { this.openItem.set(this.openItem() === id ? null : id); }
  hasAttentionItems(): boolean { return (this.store.attention().value?.preview.length ?? 0) > 0; }
  selectAgendaDate(isoDate: string): void { this.selectedAgendaDate.set(isoDate); }
  parseIsoDay(value: string): { year: number; month: number; day: number } | null {
    const match = ISO_DAY_PATTERN.exec(value);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return { year, month, day };
  }
  formatIsoDay(year: number, month: number, day: number): string {
    const pad = (part: number) => String(part).padStart(2, '0');
    return `${year}-${pad(month)}-${pad(day)}`;
  }
  addIsoDays(isoDate: string, delta: number): string | null {
    const parts = this.parseIsoDay(isoDate);
    if (!parts) return null;
    const date = new Date(parts.year, parts.month - 1, parts.day, 12);
    date.setDate(date.getDate() + delta);
    return this.formatIsoDay(date.getFullYear(), date.getMonth() + 1, date.getDate());
  }
  todayIsoDay(): string {
    const now = new Date();
    return this.formatIsoDay(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }
  agendaReferenceDate(): string {
    const reference = this.store.attention().value?.referenceDate;
    return reference && this.parseIsoDay(reference) ? reference : this.todayIsoDay();
  }
  weekday(isoDate: string): string {
    const parts = this.parseIsoDay(isoDate);
    if (!parts) return '';
    return new Intl.DateTimeFormat('pt-BR', { weekday: 'short' })
      .format(new Date(parts.year, parts.month - 1, parts.day, 12))
      .replace('.', '');
  }
  readonly agendaDays = computed<AgendaDayView[]>(() => {
    const reference = this.agendaReferenceDate();
    const today = this.todayIsoDay();
    const counts = new Map<string, number>();
    for (const item of this.store.agenda().value?.items ?? []) {
      if (!this.parseIsoDay(item.operationalDate)) continue;
      counts.set(item.operationalDate, (counts.get(item.operationalDate) ?? 0) + 1);
    }
    const days: AgendaDayView[] = [];
    for (let offset = 0; offset < 7; offset++) {
      const isoDate = this.addIsoDays(reference, offset);
      if (!isoDate) continue;
      days.push({
        isoDate,
        weekday: this.weekday(isoDate),
        day: isoDate.slice(8, 10),
        month: this.month(isoDate),
        isToday: isoDate === today,
        count: counts.get(isoDate) ?? 0,
      });
    }
    return days;
  });
  readonly defaultAgendaDate = computed<string>(() => {
    const days = this.agendaDays();
    return days.find(day => day.count > 0)?.isoDate ?? days[0]?.isoDate ?? this.agendaReferenceDate();
  });
  readonly activeAgendaDate = computed<string>(() => {
    const selected = this.selectedAgendaDate();
    if (selected && this.agendaDays().some(day => day.isoDate === selected)) return selected;
    return this.defaultAgendaDate();
  });
  readonly selectedAgendaItems = computed<QueueItem[]>(() => {
    const active = this.activeAgendaDate();
    return (this.store.agenda().value?.items ?? [])
      .filter(item => item.operationalDate === active)
      .map(item => this.queue(item));
  });
  readonly hasMoreAgendaItems = computed<boolean>(() => {
    const agenda = this.store.agenda().value;
    if (!agenda) return false;
    return (agenda.totalElements ?? agenda.items.length) > agenda.items.length;
  });
  activeAgendaDayLabel(): string {
    const active = this.agendaDays().find(day => day.isoDate === this.activeAgendaDate());
    if (active) return `${active.weekday} · ${active.day} ${active.month}`;
    return this.formatDate(this.activeAgendaDate());
  }
  agendaDayLabel(day: AgendaDayView): string {
    const count = day.count === 0 ? 'sem atividades' : day.count === 1 ? '1 atividade' : `${day.count} atividades`;
    return `${day.weekday} ${day.day}, ${count}${day.isToday ? ', hoje' : ''}`;
  }
  formatDate(value?: string): string {
    if (!value) return '—';
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }
  shortDate(value: string): string {
    const [, month, day] = value.split('-');
    return `${day}/${month}`;
  }
  month(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' })
      .format(new Date(`${value}T12:00:00Z`))
      .replace('.', '');
  }
  sourceLabel(source: QueueItem['source']): string {
    return source === 'MANUAL' ? 'Planejado' : 'Identificado pelos dados';
  }
  kindLabel(kind: string): string {
    return ({
      GENERAL: 'Atividade geral',
      VACCINATION: 'Vacinação',
      DEWORMING: 'Vermifugação',
      WEIGHING: 'Pesagem',
      CALVING: 'Parto',
      BREEDING: 'Cobertura',
      PREGNANCY_CHECK: 'Exame de gestação',
      MOVEMENT: 'Movimentação',
    } as Record<string, string>)[kind] ?? 'Atividade';
  }
  domain(kind: string): string {
    return ({
      VACCINATION: 'health',
      DEWORMING: 'health',
      WEIGHING: 'weight',
      CALVING: 'reproduction',
      BREEDING: 'reproduction',
      PREGNANCY_CHECK: 'reproduction',
      MOVEMENT: 'movement',
    } as Record<string, string>)[kind] ?? 'territory';
  }
  iconDomain(kind: string): DomainIconName {
    const domain = this.domain(kind);
    return domain === 'health' || domain === 'weight' || domain === 'reproduction' || domain === 'movement' ? domain : 'traceability';
  }
  isDueToday(entry: QueueItem): boolean {
    const reference = this.store.attention().value?.referenceDate;
    return !!reference && entry.date === reference && entry.status !== 'OVERDUE';
  }
  statusTone(status: string | null): 'danger' | 'attention' | 'success' | 'neutral' {
    if (status === 'OVERDUE') return 'danger';
    if (status === 'OPEN') return 'attention';
    if (status === 'COMPLETED') return 'success';
    return 'neutral';
  }
  statusLabel(status: string): string {
    return ({
      OPEN: 'Aberta',
      OVERDUE: 'Atrasada',
      COMPLETED: 'Concluída',
      CANCELLED: 'Cancelada',
    } as Record<string, string>)[status] ?? status.toLocaleLowerCase('pt-BR');
  }
  errorText(value?: string): string { return value || 'Verifique sua conexão e tente novamente.'; }
  reference(value?: string): string { return value?.slice(0, 12) || ''; }
}
