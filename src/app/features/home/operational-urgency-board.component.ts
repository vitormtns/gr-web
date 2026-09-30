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
      <div
        class="focus-grid"
        [attr.data-secondary-count]="categories().length"
        [class.no-hero]="!hero()"
      >
        @if (hero(); as item) {
          <button type="button" class="hero" (click)="inspect.emit({ kind: 'urgency', item })">
            <span class="badge">{{ item.level === 'overdue' ? 'URGENTE' : 'PRIORIDADE' }}</span
            ><span class="hero-icon"><gr-domain-icon [domain]="item.domain" size="lg" /></span
            ><span class="hero-copy"
              ><strong>{{ item.title }}</strong></span
            ><span class="hero-art" aria-hidden="true"
              ><gr-domain-icon [domain]="item.domain" size="lg" /></span
            ><span class="hero-facts">
              @if (item.context) {
                <span
                  ><b>{{ item.animalId ? 'Animal' : 'Contexto' }}</b
                  >{{ item.context }}</span
                >
              }
              <span><b>Data</b>{{ date(item.date) }}</span>
              @if (formatUrgencyLabel(item.daysUntil); as deadline) {
                <span><b>Prazo</b>{{ deadline }}</span>
              }
              <span
                ><b>Origem</b
                >{{ item.source === 'MANUAL' ? 'Planejado' : 'Dados da fazenda' }}</span
              > </span
            ><span class="hero-action">Ver detalhes <span aria-hidden="true">→</span></span>
          </button>
        }
        @if (categories().length > 0) {
          <div class="categories">
            @for (category of categories(); track category.key) {
              <button
                type="button"
                class="category"
                [attr.data-tone]="category.tone"
                [attr.data-domain]="categoryDomain(category.key)"
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
                    >{{ category.count }}
                    {{ category.count === 1 ? 'situação' : 'situações' }}</small
                  ></span
                ><b>{{ category.count }}</b
                ><span class="arrow" aria-hidden="true">›</span>
              </button>
            }
          </div>
        }
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
        border: 1px solid #f0d8d4;
        border-radius: 1.15rem;
        background: linear-gradient(105deg, #fffaf9, #fff6f5);
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
      .focus-grid[data-secondary-count='0'] {
        grid-template-columns: minmax(0, 1fr);
      }
      .focus-grid.no-hero {
        grid-template-columns: minmax(0, 1fr);
      }
      .hero {
        position: relative;
        overflow: hidden;
        min-height: 13rem;
        display: grid;
        grid-template-columns: 3rem 1fr;
        grid-template-rows: auto 1fr auto auto;
        gap: 0.55rem;
        padding: 1rem;
        border: 1px solid #e9aaa7;
        border-radius: 0.8rem;
        background:
          radial-gradient(circle at 87% 40%, #ffe6e2, transparent 37%),
          linear-gradient(120deg, #fff, #fff6f2);
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
        z-index: 1;
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
      .hero-art {
        position: absolute;
        right: 10%;
        top: 25%;
        opacity: 0.14;
        color: #bf2434;
        transform: scale(4.7);
        pointer-events: none;
      }
      .hero-facts {
        z-index: 1;
        grid-column: 1/-1;
        display: flex;
        flex-wrap: wrap;
        gap: 0.45rem 1rem;
        padding-top: 0.45rem;
        border-top: 1px solid #f2d5d1;
      }
      .hero-facts > span {
        display: flex;
        flex-direction: column;
        max-width: 10rem;
        color: #344d55;
        font-size: 0.68rem;
        line-height: 1.2;
      }
      .hero-facts b {
        color: #9a4d51;
        font-size: 0.58rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
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
        z-index: 1;
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
      .focus-grid[data-secondary-count='1'] .categories,
      .focus-grid[data-secondary-count='2'] .categories {
        grid-template-columns: 1fr;
        grid-template-rows: repeat(var(--secondary-count), minmax(0, 1fr));
      }
      .focus-grid[data-secondary-count='1'] .categories {
        --secondary-count: 1;
      }
      .focus-grid[data-secondary-count='2'] .categories {
        --secondary-count: 2;
      }
      .focus-grid[data-secondary-count='1'] .category,
      .focus-grid[data-secondary-count='2'] .category {
        align-content: center;
      }
      .focus-grid[data-secondary-count='1'] .category {
        grid-template-columns: 2.8rem 1fr auto;
        gap: 0.7rem;
        padding: 1rem;
      }
      .focus-grid[data-secondary-count='1'] .category-icon {
        width: 2.8rem;
        height: 2.8rem;
        border-radius: 0.7rem;
      }
      .focus-grid[data-secondary-count='1'] .category strong {
        font-size: 0.9rem;
      }
      .focus-grid[data-secondary-count='1'] .category small {
        font-size: 0.74rem;
      }
      .focus-grid[data-secondary-count='1'] .category b {
        font-size: 0.88rem;
        padding: 0.25rem 0.5rem;
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
        box-shadow: 0 2px 8px #653b3410;
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
      .category[data-tone='danger'] {
        border-color: #f2c5c8;
        background: #fff9f9;
      }
      .category[data-tone='danger'] .category-icon {
        background: #ffe3e6;
        color: #be2433;
      }
      .category[data-tone='warning'] {
        border-color: #eed9b8;
        background: #fffdf7;
      }
      .category[data-tone='warning'] b {
        background: #fff0d4;
        color: #9b5510;
      }
      .category[data-domain='weight'] {
        border-color: #d8d7ef;
        background: #faf9ff;
      }
      .category[data-domain='weight'] .category-icon {
        background: #eae8fb;
        color: #6253a8;
      }
      .category[data-domain='weight'] b {
        background: #eae8fb;
        color: #6253a8;
      }
      .category[data-domain='reproduction'][data-tone='normal'] {
        border-color: #cde8d9;
        background: #f8fdf9;
      }
      .category[data-domain='reproduction'][data-tone='normal'] .category-icon {
        background: #def2e5;
        color: #08764c;
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
        .focus-grid[data-secondary-count='0'] {
          grid-template-columns: 1fr;
        }
        .focus-grid[data-secondary-count='1'] .categories,
        .focus-grid[data-secondary-count='2'] .categories {
          grid-template-rows: auto;
        }
      }
      @media (max-width: 40rem) {
        .focus-grid[data-secondary-count] .categories {
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
  categoryDomain(key: string): string {
    return key.includes('weigh')
      ? 'weight'
      : key.includes('calving')
        ? 'reproduction'
        : key.includes('planner')
          ? 'planner'
          : 'health';
  }
  date(value: string): string {
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }
}
