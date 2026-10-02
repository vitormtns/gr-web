import { ChangeDetectionStrategy, Component, EventEmitter, Output, computed } from '@angular/core';
import { ErrorStateComponent, SkeletonComponent } from '../../design-system/feedback/feedback';
import { DashboardStore } from './dashboard.store';
import { DomainIconComponent } from '../../design-system/primitives/domain-icon';
import { todayLocalIso } from './operational-urgency';
import type { HomeDetailRequest } from './home-detail.models';

export function agendaWindowDays<T extends { operationalDate: string; displayOn?: string; summary: string }>(
  from: string,
  items: readonly T[],
) {
  const counts = new Map<string, number>();
  for (const item of items)
    counts.set(item.displayOn ?? item.operationalDate, (counts.get(item.displayOn ?? item.operationalDate) ?? 0) + 1);
  const start = new Date(`${from}T12:00:00`);
  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(start);
    date.setDate(start.getDate() + offset);
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return {
      iso,
      label:
        offset === 0
          ? 'Hoje'
          : offset === 1
            ? 'Amanhã'
            : new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).replace('.', ''),
      date: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
        .format(date)
        .replace('.', ''),
      count: counts.get(iso) ?? 0,
      items: items.filter((item) => (item.displayOn ?? item.operationalDate) === iso),
    };
  });
}

@Component({
  selector: 'app-home-agenda-section',
  imports: [ErrorStateComponent, SkeletonComponent, DomainIconComponent],
  template: `<section class="agenda-section" aria-labelledby="agenda-title">
    <header>
      <span class="mark" aria-hidden="true"><gr-domain-icon domain="planner" size="md" /></span>
      <div>
        <h2 id="agenda-title">Agenda operacional</h2>
        <p>Próximos sete dias e atividades programadas.</p>
      </div>
    </header>
    @if (store.agenda().status === 'ready') {
      @if ((store.agenda().value?.items?.length ?? 0) === 0) {
        <p class="empty-window">Nada programado nos próximos 7 dias.</p>
      }
      <div class="days" [class.all-empty]="allEmpty()">
        @for (day of days(); track day.iso) {
          <button
            type="button"
            class="day"
            [class.today]="$index === 0"
            [class.tomorrow]="$index === 1"
            [class.no-events]="day.count === 0"
            (click)="inspect.emit({ kind: 'agenda-day', date: day.iso })"
            [attr.aria-label]="day.label + ', ' + day.date + ', ' + day.count + ' atividades'"
          >
            <span class="day-top"
              ><strong>{{ day.label }}</strong
              ><b>{{ day.count }}</b></span
            ><small>{{ day.date }}</small>
            <span class="events">
              @for (item of day.items.slice(0, 3); track $index) {
                <span class="event" [attr.data-kind]="item.kind"
                  ><i aria-hidden="true"></i><span>{{ item.summary }}</span>
                  @if (item.status === 'OVERDUE') {
                    <b>Atrasada</b>
                  }
                </span>
              }
              @if (day.count > 3) {
                <span class="more">Mais {{ day.count - 3 }} atividades</span>
              }
              @if (day.count === 0 && !allEmpty()) {
                <span class="empty">Nenhuma atividade</span>
              }
            </span>
            <span class="day-action">Ver agenda do dia <span aria-hidden="true">→</span></span>
          </button>
        }
      </div>
    } @else if (store.agenda().status === 'error') {
      <gr-error-state title="Não foi possível carregar a agenda" (retry)="store.retry('agenda')" />
    } @else {
      <div class="loading">
        <gr-skeleton /><gr-skeleton /><gr-skeleton /><gr-skeleton /><gr-skeleton />
      </div>
    }
  </section>`,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }
      .agenda-section {
        padding: 1rem;
        border: 1px solid #cce5d6;
        border-radius: 1.15rem;
        background: linear-gradient(120deg, #edf7f1, #f2faf5);
      }
      header {
        display: flex;
        align-items: center;
        gap: 0.7rem;
        margin-bottom: 0.8rem;
      }
      .mark {
        display: grid;
        place-items: center;
        width: 2.25rem;
        height: 2.25rem;
        border-radius: 0.65rem;
        background: #08704a;
        color: white;
        font-size: 1.2rem;
      }
      h2 {
        margin: 0;
        font-family: var(--font-display);
        font-size: 1.15rem;
      }
      p {
        margin: 0.1rem 0 0;
        color: #50646a;
        font-size: 0.76rem;
      }
      .empty-window {
        margin: 0 0 0.55rem;
        color: #345c4c;
        font-weight: 700;
        padding: 0.45rem 0.65rem;
        border-radius: 0.5rem;
        background: #ffffffad;
      }
      .days,
      .loading {
        display: flex;
        gap: 0.55rem;
        overflow-x: auto;
        scroll-snap-type: x proximity;
        padding-bottom: 0.3rem;
      }
      .day {
        flex: 0 0 calc((100% - 2.2rem) / 5);
        min-width: 0;
        min-height: 10rem;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        padding: 0.7rem;
        border: 1px solid #d8ebe0;
        border-radius: 0.7rem;
        background: rgba(255, 255, 255, 0.93);
        text-align: left;
        color: #163134;
        cursor: pointer;
        scroll-snap-align: start;
      }
      .day.today {
        background: #fff;
        border-color: #55ad7e;
        box-shadow: 0 4px 15px #18573816;
      }
      .day.tomorrow {
        border-color: #9bceae;
        background: #fafffb;
      }
      .day.no-events:not(.today):not(.tomorrow) {
        background: #f8fbf9;
        color: #61756b;
      }
      .day.no-events .day-top b {
        background: #edf3ef;
        color: #6f8178;
      }
      .days.all-empty .day {
        min-height: 4.8rem;
      }
      .days.all-empty .events,
      .days.all-empty .day-action {
        display: none;
      }
      .day:hover,
      .day:focus-visible {
        border-color: #08704a;
        outline: none;
      }
      .day-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .day-top strong {
        font-size: 0.78rem;
      }
      .day-top b {
        display: grid;
        place-items: center;
        min-width: 1.45rem;
        height: 1.45rem;
        border-radius: 50%;
        background: #d9f0e2;
        color: #076c3e;
        font-size: 0.75rem;
      }
      .day small {
        font-size: 0.7rem;
        color: #647781;
      }
      .events {
        display: grid;
        align-content: start;
        gap: 0.28rem;
        flex: 1;
        margin-top: 0.4rem;
      }
      .event {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        min-width: 0;
        overflow: hidden;
        font-size: 0.72rem;
      }
      .event i {
        flex: 0 0 0.36rem;
        width: 0.36rem;
        height: 0.36rem;
        border-radius: 50%;
        background: #19a56e;
      }
      .event span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .event b {
        flex: 0 0 auto;
        color: #b42331;
        font-size: 0.62rem;
      }
      .event[data-kind*='VACCIN'] i,
      .event[data-kind*='BRUC'] i {
        background: #d94747;
      }
      .event[data-kind*='WEIGH'] i {
        background: #7563bf;
      }
      .event[data-kind*='CALV'] i {
        background: #d58b2d;
      }
      .empty,
      .more {
        color: #73868b;
        font-size: 0.7rem;
      }
      .day-action {
        border-top: 1px solid #e5eee8;
        padding-top: 0.4rem;
        font-size: 0.7rem;
        color: #056740;
        font-weight: 700;
      }
      .loading gr-skeleton {
        flex: 0 0 19%;
        height: 10rem;
      }
      @media (max-width: 75rem) {
        .day {
          flex-basis: calc((100% - 1.1rem) / 3);
        }
      }
      @media (max-width: 44rem) {
        .day {
          flex-basis: 75%;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeAgendaSectionComponent {
  @Output() inspect = new EventEmitter<HomeDetailRequest>();
  readonly days = computed(() =>
    agendaWindowDays(todayLocalIso(), this.store.agenda().value?.items ?? []),
  );
  readonly allEmpty = computed(() => this.days().every((day) => day.count === 0));
  constructor(readonly store: DashboardStore) {}
}
