import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiClient } from '../../core/api/api-client.service';
import { ContextStore } from '../../core/context/context.store';
import { ErrorStateComponent, SkeletonComponent } from '../../design-system/feedback/feedback';
import { ContextRequestScope } from '../management/management.shared';
import { localDateOnly } from '../../core/date/date-only';
import { formatDate } from './herd.shared';
export interface SummaryDay {
  displayOn: string;
  count: number;
  maxLevel: 'INFO' | 'WARNING' | 'DANGER';
}
interface DailySummary {
  referenceDate: string;
  from: string;
  to: string;
  totalElements: number;
  days: SummaryDay[];
}
const levelRanks = { INFO: 0, WARNING: 1, DANGER: 2 };
export function mergeSummaryDays(pages: DailySummary[]): SummaryDay[] {
  const days = new Map<string, SummaryDay>();
  for (const page of pages)
    for (const day of page.days) {
      const previous = days.get(day.displayOn);
      days.set(day.displayOn, {
        ...day,
        count: day.count + (previous?.count ?? 0),
        maxLevel:
          previous && levelRanks[previous.maxLevel] > levelRanks[day.maxLevel]
            ? previous.maxLevel
            : day.maxLevel,
      });
    }
  return [...days.values()].sort((a, b) => a.displayOn.localeCompare(b.displayOn));
}
@Component({
  selector: 'app-agenda-daily-summary',
  imports: [RouterLink, ErrorStateComponent, SkeletonComponent],
  template: `<section aria-label="Contagens completas da agenda por dia">
    <h3>Agenda geral por dia · próximos 7 dias</h3>
    <p>
      Contagens de todos os itens da consulta. Pendências anteriores permanecem em Hoje, com a data
      original nos detalhes.
    </p>
    @if (loading()) {
      <div aria-busy="true" aria-label="Carregando resumo diário"><gr-skeleton /></div>
    } @else if (failed()) {
      <gr-error-state title="Não foi possível consultar o resumo diário" (retry)="load()" />
    } @else if (!days().length) {
      <p>Nenhum item previsto nesta janela.</p>
    } @else {
      <ul>
        @for (day of days(); track day.displayOn) {
          <li [attr.data-level]="day.maxLevel">
            <a
              routerLink="/rebanho/agenda"
              [queryParams]="{ from: day.displayOn, to: day.displayOn, includeOverdue: day.displayOn === referenceDate() ? 'true' : null }"
              >{{ date(day.displayOn) }} · {{ day.count }}
              {{ day.count === 1 ? 'item' : 'itens' }}</a
            ><span>{{ levelLabels[day.maxLevel] }}</span>
          </li>
        }
      </ul>
    }
  </section>`,
  styles: [
    `
      :host {
        display: block;
        margin-block: 1rem;
      }
      section {
        padding-block: 1rem;
        border-block: 1px solid var(--color-border);
      }
      h3 {
        font-size: 1rem;
      }
      p {
        font-size: 0.85rem;
        color: var(--color-text-muted);
      }
      ul {
        display: flex;
        flex-wrap: wrap;
        list-style: none;
        padding: 0;
        gap: 0.75rem;
      }
      li {
        display: grid;
        gap: 0.3rem;
        border: 1px solid var(--color-border);
        padding: 0.75rem;
        border-radius: 0.5rem;
      }
      li[data-level='DANGER'] {
        border-color: var(--color-danger);
      }
      a {
        font-weight: 600;
        color: var(--color-text);
      }
      span {
        font-size: 0.75rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgendaDailySummaryComponent {
  readonly kinds = input<string[]>([]);
  readonly summaryLoaded = output<SummaryDay[] | null>();
  readonly days = signal<SummaryDay[]>([]);
  readonly referenceDate = signal<string | null>(null);
  readonly loading = signal(true);
  readonly failed = signal(false);
  readonly date = formatDate;
  readonly levelLabels = {
    INFO: 'Acompanhamento',
    WARNING: 'Atenção',
    DANGER: 'Revisão prioritária',
  };
  private readonly api = inject(ApiClient);
  private readonly context = inject(ContextStore);
  private readonly scope = new ContextRequestScope(inject(DestroyRef));
  constructor() {
    effect(() => {
      this.context.contextVersion();
      const pending = this.context.transitionPending();
      const farm = this.context.selectedFarm();
      this.kinds();
      untracked(() => {
        this.scope.reset();
        this.days.set([]);
        this.referenceDate.set(null);
        this.summaryLoaded.emit(null);
        this.failed.set(false);
        this.loading.set(true);
        if (farm && !pending) this.load();
      });
    });
  }
  load() {
    if (!this.context.selectedFarm() || this.context.transitionPending()) return;
    this.scope.reset();
    this.days.set([]);
    this.referenceDate.set(null);
    this.summaryLoaded.emit(null);
    this.loading.set(true);
    this.failed.set(false);
    const from = localDateOnly();
    const end = new Date(`${from}T12:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 6);
    const to = end.toISOString().slice(0, 10);
    const kinds = this.kinds().length ? [...new Set(this.kinds())] : [''];
    this.scope.run(
      forkJoin(
        kinds.map((type) =>
          this.api.get<DailySummary>(
            `/api/v1/herd/agenda/daily-summary?from=${from}&to=${to}&includeOverdue=true${type ? '&type=' + encodeURIComponent(type) : ''}`,
            true,
          ),
        ),
      ),
      (pages) => {
        this.referenceDate.set(pages[0]?.referenceDate ?? null);
        const days = mergeSummaryDays(pages);
        this.days.set(days);
        this.summaryLoaded.emit(days);
        this.loading.set(false);
      },
      () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    );
  }
}
