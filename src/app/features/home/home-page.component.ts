import { ChangeDetectionStrategy, Component, computed, effect, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContextStore } from '../../core/context/context.store';
import {
  EmptyStateComponent,
  ErrorStateComponent,
  SkeletonComponent,
} from '../../design-system/feedback/feedback';
import {
  MetricDeckComponent,
  OperationalMetric,
  HomeMetricKind,
} from '../../design-system/patterns/metric-deck';
import { DashboardStore } from './dashboard.store';
import { DashboardPeriod } from './dashboard.models';
import { OperationalUrgencyBoardComponent } from './operational-urgency-board.component';
import { HomeAgendaSectionComponent } from './home-agenda-section.component';
import { HomeHealthSectionComponent } from './home-health-section.component';
import { HomeIndicatorsSectionComponent } from './home-indicators-section.component';
import { HomeOperationalDetailDialogComponent } from './home-operational-detail-dialog.component';
import type { HomeDetailRequest } from './home-detail.models';
import { DomainIconComponent } from '../../design-system/primitives/domain-icon';

@Component({
  selector: 'app-home-page',
  providers: [DashboardStore],
  imports: [
    RouterLink,
    EmptyStateComponent,
    ErrorStateComponent,
    SkeletonComponent,
    MetricDeckComponent,
    OperationalUrgencyBoardComponent,
    HomeAgendaSectionComponent,
    HomeHealthSectionComponent,
    HomeIndicatorsSectionComponent,
    HomeOperationalDetailDialogComponent,
    DomainIconComponent,
  ],
  template: `<section class="home-page">
    <div class="home-page__content">
      <div class="dashboard page-enter">
        <header class="operation-header">
          <div class="operation-title">
            <h1>Home Operacional</h1>
            <p class="operation-standfirst">
              {{ context.selectedFarm()?.farmName || 'Fazenda atual' }}
            </p>
            <p class="summary-line">{{ operationalSummary() }}</p>
          </div>
          <div class="header-side">
            <div class="period-area">
              <span class="control-label">Período de leitura</span>
              <div class="period-pills" role="group" aria-label="Período do dashboard">
                @for (option of periods; track option.value) {
                  <button
                    type="button"
                    [class.active]="store.period().period === option.value"
                    [attr.aria-pressed]="store.period().period === option.value"
                    (click)="choosePeriod(option.value)"
                  >
                    {{ option.label }}
                  </button>
                }
              </div>
            </div>
            <details class="quick-links">
              <summary>Acessos rápidos</summary>
              <nav aria-label="Gestão da fazenda">
                <a routerLink="/gestao/insumos">Insumos</a
                ><a routerLink="/gestao/financeiro">Financeiro</a
                ><a routerLink="/administracao">Administração</a>
              </nav>
            </details>
          </div>
        </header>
        @if (customOpen()) {
          <form class="custom-period" (submit)="applyCustom($event)">
            <strong>Período personalizado</strong
            ><label
              >De
              <input
                type="date"
                [value]="customFrom()"
                (input)="updateDate($event, 'from')"
                required /></label
            ><label
              >Até
              <input
                type="date"
                [value]="customTo()"
                (input)="updateDate($event, 'to')"
                required /></label
            ><button type="submit">Aplicar período</button
            ><button type="button" (click)="customOpen.set(false)">Cancelar</button>
            @if (customError()) {
              <p role="alert">{{ customError() }}</p>
            }
          </form>
        }
        @if (context.status() === 'error') {
          <gr-error-state
            level="page"
            title="Não foi possível carregar o contexto"
            [description]="context.error()?.message || 'Verifique sua conexão e tente novamente.'"
            (retry)="retryContext()"
          />
        } @else if (context.status() === 'empty') {
          <gr-empty-state
            title="Nenhuma fazenda disponível"
            description="Peça ao administrador para revisar seu acesso às fazendas."
          />
        } @else {
          <section class="home-summary-section" aria-labelledby="summary-title">
            <header>
              <span class="summary-mark" aria-hidden="true"
                ><gr-domain-icon domain="herd" size="md"
              /></span>
              <div>
                <h2 id="summary-title">Resumo operacional imediato</h2>
                <p>Visão geral da fazenda com os principais números e status.</p>
              </div>
            </header>
            @if (store.overview().status === 'ready' && store.overview().value) {
              <gr-metric-deck [metrics]="metrics()" (inspect)="openMetric($event)" />
            } @else if (store.overview().status === 'error') {
              <gr-error-state
                title="Não foi possível carregar o resumo da fazenda"
                [description]="errorText(store.overview().error?.message)"
                (retry)="store.retry('overview')"
              />
            } @else {
              <div class="metric-loading">
                <gr-skeleton /><gr-skeleton /><gr-skeleton /><gr-skeleton />
              </div>
            }
          </section>
          @if (store.paddocks().status === 'error') {
            <gr-error-state
              title="Não foi possível consultar os piquetes"
              description="Os indicadores de território dependem desta consulta."
              (retry)="store.retry('paddocks')"
            />
          }
          <app-urgency-board (inspect)="openDetail($event)" />
          <app-home-agenda-section (inspect)="openDetail($event)" />
          <app-home-health-section (inspect)="openDetail($event)" />
          <app-home-indicators-section (inspect)="openDetail($event)" />
        }
      </div>
    </div>
    @if (detailRequest(); as request) {
      <app-home-operational-detail-dialog [request]="request" (closed)="closeDetail()" />
    }
  </section>`,
  styleUrl: './home-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent {
  readonly periods: { value: DashboardPeriod; label: string }[] = [
    { value: 'TODAY', label: 'Hoje' },
    { value: 'LAST_7_DAYS', label: '7 dias' },
    { value: 'LAST_30_DAYS', label: '30 dias' },
    { value: 'CUSTOM', label: 'Personalizado' },
  ];
  readonly customOpen = signal(false);
  readonly customFrom = signal('');
  readonly customTo = signal('');
  readonly customError = signal('');
  readonly detailRequest = signal<HomeDetailRequest | null>(null);
  readonly operationalSummary = computed(() => {
    const overview = this.store.overview().value;
    if (!overview) return 'Rebanho, território e próximos passos em uma única leitura.';
    const paddocks = this.store.paddocks();
    const territory =
      paddocks.status === 'ready'
        ? `${this.number(paddocks.value?.length ?? 0)} piquetes`
        : paddocks.status === 'error'
          ? 'piquetes indisponíveis'
          : 'consultando piquetes';
    return `${this.number(overview.herdSnapshot.activeAnimals)} animais ativos · ${territory} · ${this.number(this.attentionTotal())} situações em atenção`;
  });
  readonly metrics = computed<OperationalMetric[]>(() => {
    const overview = this.store.overview().value;
    if (!overview) return [];
    const paddocks = this.store.paddocks();
    const ready = paddocks.status === 'ready' && paddocks.value !== null;
    const total = paddocks.value?.length ?? 0;
    const occupied = overview.herdSnapshot.byPaddock.filter((item) => item.total > 0).length;
    const occupancy = ready && total > 0 ? (occupied / total) * 100 : ready ? 0 : null;
    const active = overview.herdSnapshot.activeAnimals;
    const located = Math.max(0, active - overview.herdSnapshot.unlocatedAnimals);
    const attention = this.attentionTotal();
    const segments = Object.entries(overview.herdSnapshot.bySex)
      .filter(([, value]) => value > 0)
      .slice(0, 3)
      .map(([label, value]) => ({ label, value, share: active > 0 ? (value / active) * 100 : 0 }));
    const attentionGroups = [
      {
        label: 'Saúde',
        value:
          overview.attention.vaccinationDue +
          overview.attention.dewormingDue +
          overview.attention.brucellosisDue +
          overview.attention.brucellosisWindowMissed,
      },
      {
        label: 'Reprodução',
        value: overview.attention.calvingUpcoming + overview.attention.calvingOverdue,
      },
      { label: 'Pesagem', value: overview.attention.weighingDue },
      { label: 'Planejamento', value: overview.attention.openPlannerItems },
    ];
    const maxGroup = Math.max(1, ...attentionGroups.map((group) => group.value));
    return [
      { kind: 'herd', animals: this.number(active), segments },
      {
        kind: 'territory',
        total: ready ? this.number(total) : '—',
        occupied: ready ? this.number(occupied) : '—',
        occupancyPercentage: occupancy,
        occupancyLabel:
          occupancy === null
            ? paddocks.status === 'error'
              ? 'Consulta indisponível'
              : 'Consultando território'
            : this.percentage(occupancy) + ' ocupados',
      },
      {
        kind: 'location',
        unlocated: this.number(overview.herdSnapshot.unlocatedAnimals),
        hasPending: overview.herdSnapshot.unlocatedAnimals > 0,
        locatedPercentage: active > 0 ? (located / active) * 100 : null,
      },
      {
        kind: 'attention',
        total: this.number(attention),
        hasPending: attention > 0,
        groups: attentionGroups.map((group) => ({
          ...group,
          share: (group.value / maxGroup) * 100,
        })),
      },
    ];
  });
  private contextVersion: number | null = null;
  constructor(
    readonly context: ContextStore,
    readonly store: DashboardStore,
  ) {
    effect(() => {
      const version = context.contextVersion();
      if (this.contextVersion !== null && version !== this.contextVersion) this.closeDetail();
      this.contextVersion = version;
    });
  }
  openMetric(metric: HomeMetricKind): void {
    this.openDetail({ kind: 'metric', metric });
  }
  openDetail(request: HomeDetailRequest): void {
    this.detailRequest.set(request);
  }
  closeDetail(): void {
    this.detailRequest.set(null);
  }
  choosePeriod(period: DashboardPeriod): void {
    if (period === 'CUSTOM') {
      this.customFrom.set(this.store.period().from ?? '');
      this.customTo.set(this.store.period().to ?? '');
      this.customError.set('');
      this.customOpen.set(true);
      return;
    }
    this.customOpen.set(false);
    this.store.selectPeriod({ period });
  }
  applyCustom(event: Event): void {
    event.preventDefault();
    if (
      this.store.selectPeriod({ period: 'CUSTOM', from: this.customFrom(), to: this.customTo() })
    ) {
      this.customOpen.set(false);
      this.customError.set('');
    } else
      this.customError.set('Informe datas válidas em ordem, com intervalo máximo de 366 dias.');
  }
  updateDate(event: Event, field: 'from' | 'to'): void {
    const value = (event.target as HTMLInputElement).value;
    if (field === 'from') this.customFrom.set(value);
    else this.customTo.set(value);
  }
  attentionTotal(): number {
    const value = this.store.overview().value?.attention;
    return value
      ? value.vaccinationDue +
          value.dewormingDue +
          value.weighingDue +
          value.calvingUpcoming +
          value.calvingOverdue +
          value.openPlannerItems +
          value.brucellosisDue +
          value.brucellosisWindowMissed
      : 0;
  }
  retryContext(): void {
    void this.context.retry().catch(() => {});
  }
  number(value: number): string {
    return new Intl.NumberFormat('pt-BR').format(value);
  }
  percentage(value: number): string {
    return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)}%`;
  }
  errorText(value?: string): string {
    return value || 'Verifique sua conexão e tente novamente.';
  }
}
