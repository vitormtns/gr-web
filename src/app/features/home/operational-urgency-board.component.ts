import { ChangeDetectionStrategy, Component, EventEmitter, Output, computed } from '@angular/core';
import { ErrorStateComponent, SkeletonComponent } from '../../design-system/feedback/feedback';
import { DomainIconComponent } from '../../design-system/primitives/domain-icon';
import { DashboardStore } from './dashboard.store';
import {
  buildOperationalUrgencies,
  formatUrgencyLabel,
  selectUrgencySpotlight,
  todayLocalIso,
  type OperationalUrgency,
} from './operational-urgency';
import type { HomeDetailRequest } from './home-detail.models';
import type { PendingWorkType } from '../herd/herd-operations.models';

export interface FocusCategory {
  key: string;
  title: string;
  count: number;
  pendingType: PendingWorkType | null;
  tone: 'danger' | 'warning' | 'normal';
}
export function selectFocusCategories(summary: {
  brucellosisWindowMissed: number;
  calvingOverdue: number;
  plannerOverdue: number;
  brucellosisDue: number;
  vaccinationDue: number;
  weighingDue: number;
  dewormingDue: number;
  calvingUpcoming: number;
}): FocusCategory[] {
  const options: FocusCategory[] = [
    {
      key: 'brucellosisWindowMissed',
      title: 'Janela de brucelose perdida',
      count: summary.brucellosisWindowMissed,
      pendingType: 'BRUCELLOSIS_WINDOW_MISSED',
      tone: 'danger',
    },
    {
      key: 'calvingOverdue',
      title: 'Partos atrasados',
      count: summary.calvingOverdue,
      pendingType: 'CALVING_OVERDUE',
      tone: 'danger',
    },
    {
      key: 'plannerOverdue',
      title: 'Planejamento em atraso',
      count: summary.plannerOverdue,
      pendingType: null,
      tone: 'danger',
    },
    {
      key: 'brucellosisDue',
      title: 'Brucelose na janela',
      count: summary.brucellosisDue,
      pendingType: 'BRUCELLOSIS_DUE',
      tone: 'warning',
    },
    {
      key: 'vaccinationDue',
      title: 'Vacinação pendente',
      count: summary.vaccinationDue,
      pendingType: 'VACCINATION_DUE',
      tone: 'warning',
    },
    {
      key: 'weighingDue',
      title: 'Pesagens pendentes',
      count: summary.weighingDue,
      pendingType: 'WEIGHING_DUE',
      tone: 'normal',
    },
    {
      key: 'dewormingDue',
      title: 'Vermifugação pendente',
      count: summary.dewormingDue,
      pendingType: 'DEWORMING_DUE',
      tone: 'normal',
    },
    {
      key: 'calvingUpcoming',
      title: 'Partos próximos',
      count: summary.calvingUpcoming,
      pendingType: 'CALVING_UPCOMING',
      tone: 'normal',
    },
  ];
  return options.filter((item) => item.count > 0).slice(0, 4);
}

@Component({
  selector: 'app-urgency-board',
  imports: [ErrorStateComponent, SkeletonComponent, DomainIconComponent],
  template: `<section class="focus" aria-labelledby="focus-title">
    <header>
      <span class="mark"><gr-domain-icon domain="attention" size="md" /></span>
      <div>
        <h2 id="focus-title">Foco da operação</h2>
        <p>O que exige atenção agora na fazenda.</p>
      </div>
    </header>
    @if (boardState() === 'error') {
      <gr-error-state title="Não foi possível carregar as prioridades" (retry)="retryBoth()" />
    } @else if (boardState() === 'loading') {
      <div class="loading"><gr-skeleton /><gr-skeleton /><gr-skeleton /></div>
    } @else if (!hero() && categories().length === 0 && !isPartial()) {
      <div class="calm">
        <strong>Operação em dia</strong><span>Nenhuma situação prioritária identificada.</span>
      </div>
    } @else {
      @if (isPartial()) {
        <p class="partial">Exibindo dados parciais: uma fonte está indisponível.</p>
      }
      <div class="focus-grid">
        @if (hero(); as item) {
          <button type="button" class="hero" (click)="inspect.emit({ kind: 'urgency', item })">
            <span class="badge">{{ item.level === 'overdue' ? 'URGENTE' : 'PRIORIDADE' }}</span
            ><span class="hero-icon"><gr-domain-icon [domain]="item.domain" size="lg" /></span
            ><span class="hero-copy"
              ><small
                >{{ item.source === 'MANUAL' ? 'Planejado' : 'Identificado pelos dados' }} ·
                {{ date(item.date) }}</small
              ><strong>{{ item.title }}</strong
              ><span>{{ item.context || 'Acompanhe esta atividade na agenda.' }}</span
              ><em>{{ formatUrgencyLabel(item.daysUntil) }}</em></span
            ><span class="hero-action">Ver detalhes <span aria-hidden="true">→</span></span>
          </button>
        }
        <div class="categories">
          @for (category of categories(); track category.key) {
            <button
              type="button"
              class="category"
              [attr.data-tone]="category.tone"
              (click)="openCategory(category)"
            >
              <span class="category-icon"
                ><gr-domain-icon
                  [domain]="
                    category.pendingType?.includes('WEIGH')
                      ? 'weight'
                      : category.key.includes('calving')
                        ? 'reproduction'
                        : category.key.includes('planner')
                          ? 'planner'
                          : 'health'
                  "
                  size="md" /></span
              ><span
                ><strong>{{ category.title }}</strong
                ><small
                  >{{ category.count }} {{ category.count === 1 ? 'situação' : 'situações' }}</small
                ></span
              ><b>{{ category.count }}</b
              ><span class="arrow" aria-hidden="true">›</span>
            </button>
          }
        </div>
      </div>
    }
  </section>`,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }
      .focus {
        padding: 1rem;
        border: 1px solid #efb7b0;
        border-radius: 1.15rem;
        background: linear-gradient(105deg, #fff6f4, #ffeceb);
        box-shadow: 0 6px 24px #7f2d1b0d;
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
        border-radius: 50%;
        background: #d42232;
        color: white;
      }
      h2 {
        margin: 0;
        font-family: var(--font-display);
        font-size: 1.15rem;
      }
      p {
        margin: 0.1rem 0 0;
        color: #665a60;
        font-size: 0.76rem;
      }
      .partial {
        margin: 0 0 0.5rem !important;
      }
      .focus-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.45fr) minmax(20rem, 0.95fr);
        gap: 0.65rem;
      }
      .hero {
        min-height: 13rem;
        display: grid;
        grid-template-columns: 3rem 1fr;
        grid-template-rows: auto 1fr auto;
        gap: 0.55rem;
        padding: 1rem;
        border: 1px solid #e9aaa7;
        border-radius: 0.8rem;
        background: linear-gradient(120deg, #fff, #fff6f2);
        text-align: left;
        color: #162d38;
        cursor: pointer;
      }
      .badge {
        grid-column: 1/-1;
        justify-self: start;
        padding: 0.2rem 0.5rem;
        border-radius: 1rem;
        background: #c81f30;
        color: white;
        font-size: 0.65rem;
        font-weight: 800;
      }
      .hero-icon {
        display: grid;
        place-items: center;
        width: 3rem;
        height: 3rem;
        border-radius: 50%;
        background: #ffe3e1;
        color: #ca2231;
      }
      .hero-copy {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
      }
      .hero-copy small {
        font-size: 0.7rem;
        color: #a54046;
      }
      .hero-copy strong {
        font-family: var(--font-display);
        font-size: 1.35rem;
        line-height: 1.1;
      }
      .hero-copy span {
        font-size: 0.76rem;
        color: #53626f;
      }
      .hero-copy em {
        font-size: 0.7rem;
        color: #be2632;
        font-style: normal;
        font-weight: 800;
      }
      .hero-action {
        grid-column: 1/-1;
        justify-self: end;
        padding: 0.4rem 0.75rem;
        border-radius: 0.5rem;
        background: #bd1227;
        color: white;
        font-size: 0.72rem;
        font-weight: 700;
      }
      .categories {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        grid-auto-rows: minmax(5.8rem, auto);
        align-content: start;
        gap: 0.5rem;
      }
      .category {
        min-width: 0;
        display: grid;
        grid-template-columns: 2rem 1fr auto;
        align-items: center;
        gap: 0.4rem;
        padding: 0.65rem;
        border: 1px solid #f0d6d0;
        border-radius: 0.7rem;
        background: #fff;
        text-align: left;
        color: #1a3038;
        cursor: pointer;
      }
      .category-icon {
        display: grid;
        place-items: center;
        width: 2rem;
        height: 2rem;
        border-radius: 0.5rem;
        background: #fff0e5;
        color: #ba5a14;
      }
      .category strong {
        display: block;
        font-size: 0.73rem;
        line-height: 1.2;
      }
      .category small {
        font-size: 0.67rem;
        color: #697781;
      }
      .category b {
        padding: 0.15rem 0.35rem;
        border-radius: 1rem;
        background: #ffdcdf;
        color: #b7172b;
        font-size: 0.75rem;
      }
      .category .arrow {
        display: none;
      }
      .category[data-tone='normal'] b {
        background: #e3f4e9;
        color: #067346;
      }
      .hero:hover,
      .category:hover,
      .hero:focus-visible,
      .category:focus-visible {
        outline: none;
        border-color: #cf5861;
        box-shadow: 0 5px 15px #79261c1b;
      }
      .calm {
        display: flex;
        gap: 0.5rem;
        padding: 1rem;
        background: white;
        border-radius: 0.7rem;
      }
      .calm span {
        color: #607079;
        font-size: 0.78rem;
      }
      .loading {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr;
        gap: 0.5rem;
      }
      .loading gr-skeleton {
        height: 12rem;
      }
      @media (max-width: 70rem) {
        .focus-grid {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 40rem) {
        .categories {
          grid-template-columns: 1fr;
        }
        .loading {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationalUrgencyBoardComponent {
  @Output() inspect = new EventEmitter<HomeDetailRequest>();
  readonly pool = computed(() =>
    buildOperationalUrgencies({
      attention: this.store.attention().value?.preview ?? [],
      agenda: this.store.agenda().value?.items ?? [],
      referenceDate: this.store.attention().value?.referenceDate ?? todayLocalIso(),
    }),
  );
  readonly hero = computed<OperationalUrgency | null>(
    () => selectUrgencySpotlight(this.pool()).featured,
  );
  readonly categories = computed(() => {
    const summary = this.store.attention().value?.summary;
    if (!summary) return [];
    return selectFocusCategories({
      brucellosisWindowMissed: summary.brucellosisWindowMissed ?? 0,
      calvingOverdue: summary.calvingOverdue ?? 0,
      plannerOverdue: summary.plannerOverdue ?? 0,
      brucellosisDue: summary.brucellosisDue ?? 0,
      vaccinationDue: summary.vaccinationDue ?? 0,
      weighingDue: summary.weighingDue ?? 0,
      dewormingDue: summary.dewormingDue ?? 0,
      calvingUpcoming: summary.calvingUpcoming ?? 0,
    });
  });
  readonly boardState = computed(() => {
    const a = this.store.attention().status;
    const b = this.store.agenda().status;
    return a === 'error' && b === 'error'
      ? 'error'
      : a === 'ready' || b === 'ready'
        ? 'ready'
        : 'loading';
  });
  readonly isPartial = computed(
    () =>
      this.boardState() === 'ready' &&
      (this.store.attention().status === 'error' || this.store.agenda().status === 'error'),
  );
  readonly promotedIds = computed<ReadonlySet<string>>(
    () => new Set(this.hero() ? [this.hero()!.id] : []),
  );
  constructor(readonly store: DashboardStore) {}
  openCategory(item: FocusCategory): void {
    if (item.pendingType)
      this.inspect.emit({ kind: 'pending', pendingType: item.pendingType, title: item.title });
    else this.inspect.emit({ kind: 'metric', metric: 'attention' });
  }
  retryBoth(): void {
    this.store.retry('attention');
    this.store.retry('agenda');
  }
  formatUrgencyLabel = formatUrgencyLabel;
  date(value: string): string {
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }
}
