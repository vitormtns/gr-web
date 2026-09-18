import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContextStore } from '../../core/context/context.store';
import { EmptyStateComponent, ErrorStateComponent, SkeletonComponent } from '../../design-system/feedback/feedback';
import { ActivityChartComponent } from './activity-chart.component';
import { DashboardStore } from './dashboard.store';
import { DashboardPeriod, QueueItem, mapQueueItem } from './dashboard.models';
import { TerritoryOverviewComponent } from './territory-overview.component';

@Component({
  selector: 'app-home-page',
  providers: [DashboardStore],
  imports: [RouterLink, EmptyStateComponent, ErrorStateComponent, SkeletonComponent, ActivityChartComponent, TerritoryOverviewComponent],
  template: `<div class="dashboard premium-home page-enter">
    <header class="dashboard-hero">
      <div class="hero-copy">
        <span class="eyebrow">VISÃO GERAL DA OPERAÇÃO</span>
        <h1>{{context.selectedFarm()?.farmName || 'Fazenda atual'}}</h1>
        <p>{{operationalSummary()}}</p>
      </div>
      <div class="period-area">
        <span class="control-label">Período de leitura</span>
        <div class="period-pills" role="group" aria-label="Período do dashboard">
          @for(option of periods; track option.value){
            <button type="button" [class.active]="store.period().period===option.value" [attr.aria-pressed]="store.period().period===option.value" (click)="choosePeriod(option.value)">{{option.label}}</button>
          }
        </div>
      </div>
    </header>

    @if(customOpen()){
      <form class="custom-period" (submit)="applyCustom($event)">
        <div class="custom-period-copy"><strong>Período personalizado</strong><span>Escolha até 366 dias para a leitura da operação.</span></div>
        <label>De <input type="date" [value]="customFrom()" (input)="updateDate($event, 'from')" required /></label>
        <label>Até <input type="date" [value]="customTo()" (input)="updateDate($event, 'to')" required /></label>
        <button type="submit">Aplicar período</button>
        <button type="button" class="quiet-button" (click)="customOpen.set(false)">Cancelar</button>
        @if(customError()){<p role="alert">{{customError()}}</p>}
      </form>
    }

    @if(context.status()==='error'){
      <gr-error-state level="page" title="Não foi possível carregar o contexto" [description]="context.error()?.message || 'Verifique sua conexão e tente novamente.'" [reference]="reference(context.error()?.requestId)" (retry)="retryContext()" />
    }
    @else if(context.status()==='empty'){
      <gr-empty-state title="Nenhuma fazenda disponível" description="Peça ao administrador para revisar seu acesso às fazendas." />
    }
    @else {
      @if(store.overview().status==='ready' && store.overview().value; as overview){
        <section class="metric-strip" aria-label="Estado atual da operação">
          <div class="metric-cell primary"><i class="metric-symbol" aria-hidden="true"></i><div><span>Animais ativos</span><strong>{{formatNumber(overview.herdSnapshot.activeAnimals)}}</strong></div></div>
          <div class="metric-cell"><i class="metric-symbol" aria-hidden="true"></i><div><span>Piquetes cadastrados</span><strong>{{formatNumber(paddockCount())}}</strong></div></div>
          <div class="metric-cell"><i class="metric-symbol" aria-hidden="true"></i><div><span>Piquetes ocupados</span><strong>{{formatNumber(occupiedPaddocks())}}</strong></div></div>
          <div class="metric-cell" [class.warning]="overview.herdSnapshot.unlocatedAnimals>0"><i class="metric-symbol" aria-hidden="true"></i><div><span>Sem localização</span><strong>{{formatNumber(overview.herdSnapshot.unlocatedAnimals)}}</strong></div></div>
          <div class="metric-cell attention"><i class="metric-symbol" aria-hidden="true"></i><div><span>Para acompanhar</span><strong>{{formatNumber(attentionTotal())}}</strong></div></div>
        </section>
      } @else {<div class="metric-strip metric-loading" aria-label="Carregando estado da operação"><gr-skeleton /><gr-skeleton /><gr-skeleton /><gr-skeleton /></div>}
      <div class="primary-grid">
        <app-territory-overview />

        <section class="attention-section surface-panel" aria-labelledby="attention-title">
          <div class="section-heading">
            <div>
              <span class="section-kicker">AGORA</span>
              <h2 id="attention-title">O que precisa de atenção</h2>
            </div>
            @if(store.attention().status==='ready' && store.attention().value; as attention){
              <span class="attention-count" [class.empty]="attention.preview.length===0">{{attention.preview.length}}</span>
            }
          </div>

          @if(store.attention().status==='ready' && store.attention().value; as attention){
            @if(attention.preview.length){
              <div class="queue" role="list">
                @for(item of attention.preview; track item.stableId){
                  @let entry = queue(item);
                  <div class="queue-entry" role="listitem">
                    <button type="button" class="queue-button" [attr.aria-expanded]="openItem()===entry.id" (click)="toggleItem(entry.id)">
                      <span class="queue-dot" aria-hidden="true"></span>
                      <span class="queue-copy"><strong>{{entry.title}}</strong><small>{{entry.context || kindLabel(entry.kind)}} · {{sourceLabel(entry.source)}}</small></span>
                      <span class="queue-date">{{shortDate(entry.date)}}</span>
                      <span class="queue-chevron" aria-hidden="true">›</span>
                    </button>
                    @if(openItem()===entry.id){
                      <div class="queue-detail"><span>{{kindLabel(entry.kind)}}</span><span>Data operacional: {{formatDate(entry.date)}}</span>@if(entry.status){<span>Situação: {{statusLabel(entry.status)}}</span>}</div>
                    }
                  </div>
                }
              </div>
            }
            @else{
              <div class="attention-clear"><span class="clear-mark" aria-hidden="true">✓</span><div><strong>Operação em dia.</strong><p>Nenhuma pendência identificada para esta fazenda.</p></div></div>
            }
          }
          @else if(store.attention().status==='error'){
            <gr-error-state title="Não foi possível carregar as pendências" [description]="errorText(store.attention().error?.message)" [reference]="reference(store.attention().error?.requestId)" (retry)="store.retry('attention')" />
          }
          @else{
            <div class="queue-skeleton" aria-label="Carregando pendências"><gr-skeleton /><gr-skeleton /><gr-skeleton /></div>
          }

          <a class="section-link" routerLink="/rebanho/agenda">Abrir agenda <span aria-hidden="true">→</span></a>
        </section>
      </div>

      <section class="activity-section" aria-labelledby="activity-title">
        <div class="section-heading activity-heading">
          <div>
            <span class="section-kicker">RITMO DA FAZENDA</span>
            <h2 id="activity-title">Atividade da fazenda</h2>
            <p>Uma leitura do que movimentou a operação no período.</p>
          </div>
          @if(store.activity().value; as activity){<span class="section-note">{{formatDate(activity.period.from)}} — {{formatDate(activity.period.to)}}</span>}
        </div>

        @if(store.activity().status==='ready' && store.activity().value; as activity){
          <app-activity-chart [buckets]="activity.series" />
          <div class="activity-totals" aria-label="Resumo da atividade no período">
            <div><span>Nascimentos</span><strong>{{formatNumber(activity.totals.births)}}</strong></div>
            <div><span>Movimentações</span><strong>{{formatNumber(activity.totals.movements)}}</strong></div>
            <div><span>Pesagens</span><strong>{{formatNumber(activity.totals.weightMeasurements)}}</strong></div>
            <div><span>Vacinações</span><strong>{{formatNumber(activity.totals.vaccinations)}}</strong></div>
            <div><span>Partos</span><strong>{{formatNumber(activity.totals.calvings)}}</strong></div>
          </div>
        }
        @else if(store.activity().status==='error'){
          <gr-error-state title="Não foi possível carregar a atividade" [description]="errorText(store.activity().error?.message)" [reference]="reference(store.activity().error?.requestId)" (retry)="store.retry('activity')" />
        }
        @else{
          <div class="activity-skeleton" aria-label="Carregando atividade"><gr-skeleton /><gr-skeleton /><gr-skeleton /></div>
        }
      </section>

      <div class="operations-grid">
        <section class="agenda-section surface-panel" aria-labelledby="agenda-title">
          <div class="section-heading">
            <div><span class="section-kicker">PRÓXIMOS PASSOS</span><h2 id="agenda-title">Agenda operacional</h2></div>
            <a class="inline-link" routerLink="/rebanho/agenda">Ver agenda <span aria-hidden="true">→</span></a>
          </div>

          @if(store.agenda().status==='ready' && store.agenda().value; as agenda){
            @if(agenda.items.length){
              <div class="agenda-list">
                @for(item of agenda.items; track item.stableId){
                  @let entry = queue(item);
                  <div class="agenda-row">
                    <time [attr.datetime]="entry.date"><strong>{{day(entry.date)}}</strong><small>{{month(entry.date)}}</small></time>
                    <span class="agenda-axis" aria-hidden="true"></span>
                    <div class="agenda-copy"><strong>{{entry.title}}</strong><span>{{entry.context || kindLabel(entry.kind)}} · {{sourceLabel(entry.source)}}</span></div>
                  </div>
                }
              </div>
            }
            @else{
              <div class="compact-empty"><strong>Nada programado a partir de hoje.</strong><p>Os próximos itens da operação aparecerão aqui.</p></div>
            }
          }
          @else if(store.agenda().status==='error'){
            <gr-error-state title="Não foi possível carregar a agenda" [description]="errorText(store.agenda().error?.message)" [reference]="reference(store.agenda().error?.requestId)" (retry)="store.retry('agenda')" />
          }
          @else{
            <div class="queue-skeleton"><gr-skeleton /><gr-skeleton /><gr-skeleton /></div>
          }
        </section>

        <section class="insights-section surface-panel" aria-labelledby="insights-title">
          <div class="section-heading">
            <div><span class="section-kicker">LEITURA DO REBANHO</span><h2 id="insights-title">Sinais operacionais</h2></div>
          </div>

          @if(store.overview().status==='ready' && store.overview().value; as overview){
            <div class="insight-list">
              <div class="insight insight-progress">
                <span>Pesagens em dia</span>
                <strong>{{formatPercentage(overview.insights.weighingCoverage.coveragePercentage)}}</strong>
                <small>{{formatNumber(overview.insights.weighingCoverage.coveredAnimals)}} de {{formatNumber(overview.insights.weighingCoverage.totalEligibleAnimals)}} animais</small>
                <div class="insight-track" role="progressbar" aria-label="Cobertura de pesagens" [attr.aria-valuenow]="overview.insights.weighingCoverage.coveragePercentage" aria-valuemin="0" aria-valuemax="100"><i [style.width.%]="overview.insights.weighingCoverage.coveragePercentage"></i></div>
              </div>
              <div class="insight">
                <span>Saúde pendente</span>
                <strong>{{formatNumber(overview.insights.healthDue.vaccinationDue + overview.insights.healthDue.dewormingDue)}}</strong>
                <small>{{formatNumber(overview.insights.healthDue.vaccinationDue)}} vacinações · {{formatNumber(overview.insights.healthDue.dewormingDue)}} vermifugações</small>
              </div>
              <div class="insight">
                <span>Gestações confirmadas</span>
                <strong>{{formatNumber(overview.insights.reproductionPipeline.openConfirmedPregnancies)}}</strong>
                <small>{{formatNumber(overview.insights.reproductionPipeline.openPossiblePregnancies)}} possíveis em acompanhamento</small>
              </div>
              <div class="insight">
                <span>Partos em atenção</span>
                <strong>{{formatNumber(overview.insights.calvingAttention.upcomingCalvings + overview.insights.calvingAttention.overdueCalvings)}}</strong>
                <small>{{formatNumber(overview.insights.calvingAttention.upcomingCalvings)}} próximos · {{formatNumber(overview.insights.calvingAttention.overdueCalvings)}} atrasados</small>
              </div>
              <div class="insight">
                <span>Planejamento aberto</span>
                <strong>{{formatNumber(overview.insights.plannerExecution.currentlyOpen)}}</strong>
                <small>{{formatNumber(overview.insights.plannerExecution.completed)}} concluídos no período</small>
              </div>
              <div class="insight">
                <span>Movimento do rebanho</span>
                <strong>{{formatNumber(overview.insights.herdActivity.movements)}}</strong>
                <small>{{formatNumber(overview.insights.herdActivity.births)}} nascimentos no período</small>
              </div>
            </div>
          }
          @else if(store.overview().status==='error'){
            <p class="insight-unavailable">As leituras do rebanho dependem da visão geral. <button type="button" (click)="store.retry('overview')">Tentar novamente</button></p>
          }
          @else{
            <div class="queue-skeleton"><gr-skeleton /><gr-skeleton /><gr-skeleton /></div>
          }
        </section>
      </div>
    }
  </div>`,
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
  readonly openItem = signal<string | null>(null);
  readonly operationalSummary = computed(() => {
    const overview = this.store.overview().value;
    if (!overview) return 'Território, rebanho e próximos passos em uma única leitura.';
    const animals = overview.herdSnapshot.activeAnimals;
    const paddocks = this.store.paddocks().value?.length ?? overview.herdSnapshot.byPaddock.length;
    const attention = overview.attention.vaccinationDue + overview.attention.dewormingDue + overview.attention.weighingDue
      + overview.attention.calvingUpcoming + overview.attention.calvingOverdue + overview.attention.openPlannerItems;
    return `${this.formatNumber(animals)} ${animals === 1 ? 'animal ativo' : 'animais ativos'} · ${this.formatNumber(paddocks)} ${paddocks === 1 ? 'piquete' : 'piquetes'} · ${this.formatNumber(attention)} ${attention === 1 ? 'situação para acompanhar' : 'situações para acompanhar'}`;
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

  toggleItem(id: string): void { this.openItem.set(this.openItem() === id ? null : id); }
  paddockCount(): number { return this.store.paddocks().value?.length ?? this.store.overview().value?.herdSnapshot.byPaddock.length ?? 0; }
  occupiedPaddocks(): number { return this.store.overview().value?.herdSnapshot.byPaddock.filter(item => item.total > 0).length ?? 0; }
  attentionTotal(): number { const value=this.store.overview().value?.attention; return value ? value.vaccinationDue+value.dewormingDue+value.weighingDue+value.calvingUpcoming+value.calvingOverdue+value.openPlannerItems : 0; }
  retryContext(): void { void this.context.retry().catch(() => {}); }
  queue = mapQueueItem;
  formatNumber(value: number): string { return new Intl.NumberFormat('pt-BR').format(value); }
  formatPercentage(value: number): string { return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)}%`; }
  formatDate(value?: string): string { if (!value) return '—'; const [year, month, day] = value.split('-'); return `${day}/${month}/${year}`; }
  shortDate(value: string): string { const [year, month, day] = value.split('-'); return `${day}/${month}`; }
  day(value: string): string { return value.slice(8, 10); }
  month(value: string): string { return new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`)).replace('.', ''); }
  sourceLabel(source: QueueItem['source']): string { return source === 'MANUAL' ? 'Planejado' : 'Identificado pelos dados'; }
  kindLabel(kind: string): string { return ({ GENERAL: 'Atividade geral', VACCINATION: 'Vacinação', DEWORMING: 'Vermifugação', WEIGHING: 'Pesagem', CALVING: 'Parto', BREEDING: 'Cobertura', PREGNANCY_CHECK: 'Exame de gestação', MOVEMENT: 'Movimentação' } as Record<string, string>)[kind] ?? 'Atividade'; }
  statusLabel(status: string): string { return ({ OPEN: 'Aberta', OVERDUE: 'Atrasada', COMPLETED: 'Concluída', CANCELLED: 'Cancelada' } as Record<string, string>)[status] ?? status.toLocaleLowerCase('pt-BR'); }
  errorText(value?: string): string { return value || 'Verifique sua conexão e tente novamente.'; }
  reference(value?: string): string { return value?.slice(0, 12) || ''; }
}
