import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ContextStore } from '../../core/context/context.store';
import { EmptyStateComponent, ErrorStateComponent, SkeletonComponent } from '../../design-system/feedback/feedback';
import { MetricDeckComponent, OperationalMetric } from '../../design-system/patterns/metric-deck';
import { BrandedInsightSurfaceComponent } from '../../design-system/patterns/branded-insight-surface';
import { BrandGrowthBarsComponent } from '../../design-system/primitives/brand-growth-bars';
import { DomainIconComponent } from '../../design-system/primitives/domain-icon';
import { OperationalUrgencyBoardComponent } from './operational-urgency-board.component';
import { ActivityChartComponent } from './activity-chart.component';
import { DashboardStore } from './dashboard.store';
import { DashboardPeriod } from './dashboard.models';
import { HomeActionsComponent } from './home-actions.component';

@Component({
  selector: 'app-home-page',
  providers: [DashboardStore],
  imports: [
    EmptyStateComponent,
    ErrorStateComponent,
    SkeletonComponent,
    MetricDeckComponent,
    BrandedInsightSurfaceComponent,
    BrandGrowthBarsComponent,
    DomainIconComponent,
    OperationalUrgencyBoardComponent,
    ActivityChartComponent,
    HomeActionsComponent,
  ],
  template: `<section class="home-page">
  <div class="home-page__content">
  <div class="dashboard page-enter">
    <header class="operation-header">
      <div class="operation-title">
        <div class="operation-eyebrow-row">
          <span class="eyebrow"><i class="live-dot" aria-hidden="true"></i> OPERAÇÃO ATIVA</span>
          <span class="operation-org-chip">{{context.selectedOrganization()?.organizationName || 'Organização'}}</span>
        </div>
        <h1>{{context.selectedFarm()?.farmName || 'Fazenda atual'}}</h1>
        <p class="operation-standfirst">Panorama atual da operação</p>
        <p class="summary-line">{{operationalSummary()}}</p>
      </div>
      <div class="header-side">
        <gr-brand-growth-bars class="header-brand-mark" />
        <div class="period-area">
        <span class="control-label">Período de leitura</span>
        <div class="period-pills" role="group" aria-label="Período do dashboard">
          @for(option of periods; track option.value){
            <button
              type="button"
              [class.active]="store.period().period===option.value"
              [attr.aria-pressed]="store.period().period===option.value"
              (click)="choosePeriod(option.value)"
            >{{option.label}}</button>
          }
        </div>
        </div>
      </div>
    </header>

    @if(customOpen()){
      <form class="custom-period" (submit)="applyCustom($event)">
        <div class="custom-period-copy">
          <strong>Período personalizado</strong>
          <span>Escolha até 366 dias para a leitura da operação.</span>
        </div>
        <div class="custom-fields">
          <label>De <input type="date" [value]="customFrom()" (input)="updateDate($event,'from')" required /></label>
          <label>Até <input type="date" [value]="customTo()" (input)="updateDate($event,'to')" required /></label>
          <div class="custom-buttons">
            <button type="submit">Aplicar período</button>
            <button type="button" class="quiet-button" (click)="customOpen.set(false)">Cancelar</button>
          </div>
        </div>
        @if(customError()){<p role="alert">{{customError()}}</p>}
      </form>
    }

    @if(context.status()==='error'){
      <gr-error-state level="page" title="Não foi possível carregar o contexto" [description]="context.error()?.message || 'Verifique sua conexão e tente novamente.'" [reference]="reference(context.error()?.requestId)" (retry)="retryContext()" />
    } @else if(context.status()==='empty'){
      <gr-empty-state title="Nenhuma fazenda disponível" description="Peça ao administrador para revisar seu acesso às fazendas." />
    } @else {
      @if(store.overview().status==='ready' && store.overview().value){
        <gr-metric-deck [metrics]="metrics()" />
      } @else {
        <div class="metric-loading" aria-label="Carregando estado da operação">
          <gr-skeleton /><gr-skeleton /><gr-skeleton /><gr-skeleton />
        </div>
      }

      <app-urgency-board />

      <app-home-actions />

      @if(editorialInsight(); as insight){
        <gr-branded-insight-surface
          [title]="insight.title"
          [description]="insight.description"
        />
      }

      <section class="activity-section" aria-labelledby="activity-title">
        <div class="section-heading">
          <div>
            <span class="section-kicker movement-kicker">TEMPO & RITMO</span>
            <h2 id="activity-title">Ritmo da fazenda</h2>
            <p>Quando e quanto a operação se movimentou no período.</p>
          </div>
          @if(store.activity().value; as activity){
            <span class="section-note">{{formatDate(activity.period.from)}} — {{formatDate(activity.period.to)}}</span>
          }
        </div>
        @if(store.activity().status==='ready' && store.activity().value; as activity){
          <app-activity-chart [buckets]="activity.series"/>
          <div class="activity-totals" aria-label="Resumo da atividade">
            <div><span>Nascimentos</span><strong>{{formatNumber(activity.totals.births)}}</strong></div>
            <div><span>Movimentações</span><strong>{{formatNumber(activity.totals.movements)}}</strong></div>
            <div><span>Pesagens</span><strong>{{formatNumber(activity.totals.weightMeasurements)}}</strong></div>
            <div><span>Vacinações</span><strong>{{formatNumber(activity.totals.vaccinations)}}</strong></div>
            <div><span>Partos</span><strong>{{formatNumber(activity.totals.calvings)}}</strong></div>
          </div>
        } @else if(store.activity().status==='error'){
          <gr-error-state title="Não foi possível carregar a atividade" [description]="errorText(store.activity().error?.message)" [reference]="reference(store.activity().error?.requestId)" (retry)="store.retry('activity')" />
        } @else {
          <div class="activity-skeleton"><gr-skeleton /><gr-skeleton /><gr-skeleton /></div>
        }
      </section>

      <section class="reading-section" aria-labelledby="reading-title">
        <div class="section-heading">
          <div>
            <span class="section-kicker">LEITURA DO REBANHO</span>
            <h2 id="reading-title">Sinais operacionais</h2>
          </div>
        </div>
        @if(store.overview().status==='ready' && store.overview().value; as overview){
          <div class="context-rail">
            <div class="signal weight">
              <span class="signal-label">Pesagens em dia</span>
              <gr-domain-icon domain="weight" size="sm" />
              <strong class="signal-value">{{formatPercentage(overview.insights.weighingCoverage.coveragePercentage)}}</strong>
              <small class="signal-note">{{formatNumber(overview.insights.weighingCoverage.coveredAnimals)}} de {{formatNumber(overview.insights.weighingCoverage.totalEligibleAnimals)}} animais</small>
              <i class="coverage-meter" role="progressbar" aria-label="Cobertura de pesagens" [attr.aria-valuenow]="overview.insights.weighingCoverage.coveragePercentage" aria-valuemin="0" aria-valuemax="100">
                <b [style.width.%]="overview.insights.weighingCoverage.coveragePercentage"></b>
              </i>
            </div>
            <div class="signal health">
              <span class="signal-label">Saúde pendente</span>
              <gr-domain-icon domain="health" size="sm" />
              <strong class="signal-value">{{formatNumber(overview.insights.healthDue.vaccinationDue + overview.insights.healthDue.dewormingDue)}}</strong>
              <div class="signal-split">
                <span>Vacinas <b>{{formatNumber(overview.insights.healthDue.vaccinationDue)}}</b></span>
                <span>Vermífugos <b>{{formatNumber(overview.insights.healthDue.dewormingDue)}}</b></span>
              </div>
            </div>
            <div class="signal reproduction">
              <span class="signal-label">Gestações confirmadas</span>
              <gr-domain-icon domain="reproduction" size="sm" />
              <strong class="signal-value">{{formatNumber(overview.insights.reproductionPipeline.openConfirmedPregnancies)}}</strong>
              <div class="signal-split">
                <span>Confirmadas <b>{{formatNumber(overview.insights.reproductionPipeline.openConfirmedPregnancies)}}</b></span>
                <span>Possíveis <b>{{formatNumber(overview.insights.reproductionPipeline.openPossiblePregnancies)}}</b></span>
              </div>
            </div>
            <div class="signal calving">
              <span class="signal-label">Partos em atenção</span>
              <gr-domain-icon domain="calving" size="sm" />
              <strong class="signal-value">{{formatNumber(overview.insights.calvingAttention.upcomingCalvings + overview.insights.calvingAttention.overdueCalvings)}}</strong>
              <div class="signal-split">
                <span>Próximos <b>{{formatNumber(overview.insights.calvingAttention.upcomingCalvings)}}</b></span>
                <span [class.is-overdue]="overview.insights.calvingAttention.overdueCalvings > 0">Atrasados <b>{{formatNumber(overview.insights.calvingAttention.overdueCalvings)}}</b></span>
              </div>
            </div>
            <div class="signal planner">
              <span class="signal-label">Planejamento aberto</span>
              <gr-domain-icon domain="planner" size="sm" />
              <strong class="signal-value">{{formatNumber(overview.insights.plannerExecution.currentlyOpen)}}</strong>
              <div class="signal-split">
                <span>Abertos <b>{{formatNumber(overview.insights.plannerExecution.currentlyOpen)}}</b></span>
                <span>Concluídos <b>{{formatNumber(overview.insights.plannerExecution.completed)}}</b></span>
              </div>
            </div>
            <div class="signal movement">
              <span class="signal-label">Movimento do rebanho</span>
              <gr-domain-icon domain="movement" size="sm" />
              <strong class="signal-value">{{formatNumber(overview.insights.herdActivity.movements)}}</strong>
              <div class="signal-split">
                <span>Movimentações <b>{{formatNumber(overview.insights.herdActivity.movements)}}</b></span>
                <span>Nascimentos <b>{{formatNumber(overview.insights.herdActivity.births)}}</b></span>
              </div>
            </div>
          </div>
        } @else if(store.overview().status==='error'){
          <p class="insight-unavailable">As leituras dependem da visão geral. <button type="button" (click)="store.retry('overview')">Tentar novamente</button></p>
        } @else {
          <div class="reading-skeleton"><gr-skeleton /><gr-skeleton /><gr-skeleton /></div>
        }
      </section>
    }
  </div>
  </div>
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
  readonly operationalSummary = computed(() => {
    const overview = this.store.overview().value;
    if (!overview) return 'Território, rebanho e próximos passos em uma única leitura.';
    const animals = overview.herdSnapshot.activeAnimals;
    const paddocks = this.paddockCount();
    const attention = this.attentionTotal();
    return `${this.formatNumber(animals)} ${animals === 1 ? 'animal ativo' : 'animais ativos'} · ${this.formatNumber(paddocks)} ${paddocks === 1 ? 'piquete' : 'piquetes'} · ${this.formatNumber(attention)} ${attention === 1 ? 'situação em atenção' : 'situações em atenção'}`;
  });
  readonly metrics = computed<OperationalMetric[]>(() => {
    const overview = this.store.overview().value;
    if (!overview) return [];
    const paddocks = this.paddockCount();
    const occupied = this.occupiedPaddocks();
    const occupancyPercentage = paddocks > 0 ? (occupied / paddocks) * 100 : 0;
    const unlocated = overview.herdSnapshot.unlocatedAnimals;
    const attention = this.attentionTotal();
    return [
      { kind: 'herd', animals: this.formatNumber(overview.herdSnapshot.activeAnimals) },
      {
        kind: 'territory',
        total: this.formatNumber(paddocks),
        occupied: this.formatNumber(occupied),
        occupancyPercentage,
        occupancyLabel: this.formatPercentage(occupancyPercentage),
      },
      { kind: 'location', unlocated: this.formatNumber(unlocated), hasPending: unlocated > 0 },
      { kind: 'attention', total: this.formatNumber(attention), hasPending: attention > 0 },
    ];
  });
  readonly editorialInsight = computed<{ title: string; description: string; tone: 'territory' | 'warning' | 'info' | 'success' } | null>(() => {
    const overview = this.store.overview().value;
    if (!overview) return null;
    if (overview.herdSnapshot.unlocatedAnimals > 0) {
      return {
        title: 'Localização pendente no rebanho',
        description: `Existem ${this.formatNumber(overview.herdSnapshot.unlocatedAnimals)} animais cadastrados sem vinculação a piquetes. Vincule-os para representação no mapa territorial.`,
        tone: 'warning',
      };
    }
    const calvings = overview.insights.calvingAttention.upcomingCalvings + overview.insights.calvingAttention.overdueCalvings;
    if (calvings > 0) {
      return {
        title: 'Partos requerem acompanhamento',
        description: `${this.formatNumber(calvings)} fêmeas em janela de parto necessitam de conferência operacional nos lotes de maternidade.`,
        tone: 'warning',
      };
    }
    if (overview.insights.weighingCoverage.coveragePercentage >= 70) {
      return {
        title: 'Ritmo ponderal consolidado',
        description: `Cobertura de pesagens atinge ${this.formatPercentage(overview.insights.weighingCoverage.coveragePercentage)} dos animais elegíveis, assegurando confiabilidade nos indicadores zootécnicos.`,
        tone: 'success',
      };
    }
    return {
      title: 'Operação sincronizada',
      description: 'Todos os animais ativos estão devidamente vinculados aos piquetes com status operacional em dia.',
      tone: 'territory',
    };
  });
  constructor(readonly context: ContextStore, readonly store: DashboardStore) {}
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
    if (this.store.selectPeriod({ period: 'CUSTOM', from: this.customFrom(), to: this.customTo() })) {
      this.customOpen.set(false);
      this.customError.set('');
    } else {
      this.customError.set('Informe datas válidas em ordem, com intervalo máximo de 366 dias.');
    }
  }
  updateDate(event: Event, field: 'from' | 'to'): void {
    const value = (event.target as HTMLInputElement).value;
    if (field === 'from') this.customFrom.set(value);
    else this.customTo.set(value);
  }
  paddockCount(): number {
    return this.store.paddocks().value?.length ?? this.store.overview().value?.herdSnapshot.byPaddock.length ?? 0;
  }
  occupiedPaddocks(): number {
    return this.store.overview().value?.herdSnapshot.byPaddock.filter(item => item.total > 0).length ?? 0;
  }
  attentionTotal(): number {
    const value = this.store.overview().value?.attention;
    return value ? value.vaccinationDue + value.dewormingDue + value.weighingDue + value.calvingUpcoming + value.calvingOverdue + value.openPlannerItems : 0;
  }
  retryContext(): void { void this.context.retry().catch(() => {}); }
  formatNumber(value: number): string { return new Intl.NumberFormat('pt-BR').format(value); }
  formatPercentage(value: number): string { return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)}%`; }
  formatDate(value?: string): string {
    if (!value) return '—';
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }
  errorText(value?: string): string { return value || 'Verifique sua conexão e tente novamente.'; }
  reference(value?: string): string { return value?.slice(0, 12) || ''; }
}
