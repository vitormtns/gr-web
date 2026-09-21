import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ErrorStateComponent, SkeletonComponent } from '../../design-system/feedback/feedback';
import { DashboardStore } from './dashboard.store';
import { QueueItem, mapQueueItem } from './dashboard.models';

@Component({
  selector: 'app-home-actions',
  imports: [RouterLink, ErrorStateComponent, SkeletonComponent],
  template: `<div class="action-column">
    <section class="surface-panel attention-section" aria-labelledby="attention-title">
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
              <div class="queue-entry" role="listitem" [class.critical]="entry.status==='OVERDUE'">
                <button type="button" class="queue-button" [attr.aria-expanded]="openItem()===entry.id" (click)="toggleItem(entry.id)">
                  <span class="domain-dot" [attr.data-domain]="domain(entry.kind)" aria-hidden="true"></span>
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
                      <span class="status-tag">Situação: {{statusLabel(entry.status)}}</span>
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

    <section class="surface-panel agenda-section" aria-labelledby="agenda-title">
      <div class="section-heading">
        <div>
          <span class="section-kicker">PRÓXIMOS PASSOS</span>
          <h2 id="agenda-title">Agenda operacional</h2>
        </div>
        <a class="inline-link" routerLink="/rebanho/agenda">Ver agenda <span aria-hidden="true">→</span></a>
      </div>
      @if(store.agenda().status==='ready' && store.agenda().value; as agenda){
        @if(agenda.items.length){
          <div class="agenda-list">
            @for(item of agenda.items; track item.stableId){
              @let entry = queue(item);
              <div class="agenda-row">
                <time [attr.datetime]="entry.date" class="agenda-calendar-tile">
                  <strong>{{day(entry.date)}}</strong>
                  <small>{{month(entry.date)}}</small>
                </time>
                <span class="agenda-axis" [attr.data-domain]="domain(entry.kind)" aria-hidden="true"></span>
                <div class="agenda-copy">
                  <strong>{{entry.title}}</strong>
                  <span>{{entry.context || kindLabel(entry.kind)}} · {{sourceLabel(entry.source)}}</span>
                </div>
              </div>
            }
          </div>
        } @else {
          <div class="compact-empty">
            <strong>Nada programado a partir de hoje</strong>
            <p>Os próximos itens da operação aparecerão aqui.</p>
          </div>
        }
      } @else if(store.agenda().status==='error'){
        <gr-error-state title="Não foi possível carregar a agenda" [description]="errorText(store.agenda().error?.message)" [reference]="reference(store.agenda().error?.requestId)" (retry)="store.retry('agenda')" />
      } @else {
        <div class="queue-skeleton"><gr-skeleton /><gr-skeleton /></div>
      }
    </section>
  </div>`,
  styles: [`
    :host {
      display: block;
      min-width: 0;
      height: 100%;
    }
    .action-column {
      min-width: 0;
      height: 100%;
      display: grid;
      grid-template-rows: minmax(14rem, 1.15fr) minmax(12rem, 0.85fr);
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
      transition: box-shadow var(--motion-fast) var(--ease-standard);
    }
    .surface-panel:hover {
      box-shadow: var(--shadow-2);
    }
    .attention-section::before {
      content: '';
      position: absolute;
      top: 0;
      left: 1.5rem;
      right: 1.5rem;
      height: 2px;
      background: linear-gradient(90deg, transparent, var(--semantic-warning), transparent);
      border-radius: var(--radius-pill);
    }
    .agenda-section::before {
      content: '';
      position: absolute;
      top: 0;
      left: 1.5rem;
      right: 1.5rem;
      height: 2px;
      background: linear-gradient(90deg, transparent, var(--color-primary), transparent);
      border-radius: var(--radius-pill);
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
      width: 1.85rem;
      height: 1.85rem;
      display: grid;
      place-items: center;
      border-radius: 50%;
      color: #925304;
      background: var(--color-warning-subtle);
      border: 1px solid rgba(179, 102, 5, 0.28);
      font-size: 0.75rem;
      font-weight: 800;
      box-shadow: 0 0 8px rgba(179, 102, 5, 0.18);
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
      border-bottom: 1px solid var(--border-soft);
      transition: background var(--motion-fast);
      border-radius: var(--radius-sm);
    }
    .queue-entry:last-child {
      border-bottom: 0;
    }
    .queue-button {
      width: 100%;
      display: grid;
      grid-template-columns: 0.55rem minmax(0, 1fr) auto 0.75rem;
      align-items: center;
      gap: 0.75rem;
      padding: 0.7rem 0.45rem;
      border: 0;
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      background: transparent;
      text-align: left;
      cursor: pointer;
      transition: background var(--motion-fast);
    }
    .queue-button:hover, .queue-button[aria-expanded="true"] {
      background: rgba(179, 102, 5, 0.06);
    }
    .domain-dot {
      width: 0.55rem;
      height: 0.55rem;
      border-radius: 50%;
      background: var(--color-primary);
      box-shadow: 0 0 4px rgba(18, 84, 52, 0.25);
    }
    .domain-dot[data-domain="health"] {
      background: var(--data-amber);
      box-shadow: 0 0 6px rgba(179, 102, 5, 0.45);
    }
    .domain-dot[data-domain="weight"] {
      background: var(--data-violet);
      box-shadow: 0 0 6px rgba(107, 82, 165, 0.45);
    }
    .domain-dot[data-domain="reproduction"] {
      background: #8a58a6;
      box-shadow: 0 0 6px rgba(138, 88, 166, 0.45);
    }
    .domain-dot[data-domain="movement"] {
      background: var(--color-info);
      box-shadow: 0 0 6px rgba(42, 105, 136, 0.45);
    }
    .critical .domain-dot {
      background: var(--semantic-danger);
      box-shadow: 0 0 6px rgba(193, 60, 49, 0.5);
    }
    .queue-copy { min-width: 0; }
    .queue-copy strong, .agenda-copy strong {
      display: block;
      font-size: 0.8125rem;
      font-weight: 700;
      line-height: 1.25;
      color: var(--text-primary);
    }
    .queue-copy small, .agenda-copy span {
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
      padding: 0 var(--space-3) var(--space-3) 1.6rem;
      color: var(--text-secondary);
      font-size: 0.6875rem;
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
    .status-tag {
      color: var(--semantic-warning);
      font-weight: 650;
    }
    .critical .status-tag {
      color: var(--semantic-danger);
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
    .agenda-list {
      max-height: 11rem;
      overflow-y: auto;
      padding-right: 4px;
    }
    .agenda-row {
      display: grid;
      grid-template-columns: 2.5rem 0.6rem minmax(0, 1fr);
      align-items: center;
      gap: 0.75rem;
      min-height: 3.4rem;
    }
    .agenda-calendar-tile {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3px;
      border-radius: var(--radius-sm);
      background: var(--surface-subtle);
      border: 1px solid var(--border-soft);
      line-height: 1;
      box-shadow: 0 1px 2px rgba(11, 25, 16, 0.05);
    }
    .agenda-calendar-tile strong {
      font-size: 0.95rem;
      font-weight: 800;
      color: var(--color-primary);
      font-variant-numeric: tabular-nums;
    }
    .agenda-calendar-tile small {
      margin-top: 2px;
      color: var(--text-tertiary);
      font-size: 0.58rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .agenda-axis {
      position: relative;
      width: 1px;
      height: 100%;
      justify-self: center;
      background: var(--border-soft);
    }
    .agenda-axis::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 0.55rem;
      height: 0.55rem;
      border: 2px solid var(--canvas-elevated);
      border-radius: 50%;
      background: var(--color-primary);
      transform: translate(-50%, -50%);
      box-shadow: 0 0 0 1px var(--border-soft);
    }
    .agenda-axis[data-domain="health"]::before { background: var(--data-amber); }
    .agenda-axis[data-domain="weight"]::before { background: var(--data-violet); }
    .agenda-axis[data-domain="reproduction"]::before { background: #8a58a6; }
    .agenda-axis[data-domain="movement"]::before { background: var(--color-info); }
    .agenda-copy {
      min-width: 0;
      padding: 0.65rem 0;
      border-bottom: 1px solid var(--border-soft);
    }
    .agenda-row:last-child .agenda-copy {
      border-bottom: 0;
    }
    .compact-empty {
      min-height: 5.5rem;
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
    .queue-skeleton {
      display: grid;
      gap: 0.6rem;
    }
    .queue-skeleton gr-skeleton { height: 2.2rem; }
    @media (max-width: 64rem) {
      .action-column {
        grid-template-columns: 1fr 1fr;
        grid-template-rows: auto;
      }
    }
    @media (max-width: 52rem) {
      .action-column {
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
  queue = mapQueueItem;
  constructor(readonly store: DashboardStore) {}
  toggleItem(id: string): void { this.openItem.set(this.openItem() === id ? null : id); }
  formatDate(value?: string): string {
    if (!value) return '—';
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }
  shortDate(value: string): string {
    const [, month, day] = value.split('-');
    return `${day}/${month}`;
  }
  day(value: string): string { return value.slice(8, 10); }
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
