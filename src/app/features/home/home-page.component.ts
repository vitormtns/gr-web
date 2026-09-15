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
  template: `<div class="dashboard page-enter">
    <header class="dashboard-header"><div><span class="eyebrow">{{context.selectedOrganization()?.organizationName}} / {{context.selectedFarm()?.farmName}}</span><h1>Visão geral<span class="header-name">{{firstName() ? ' · ' + firstName() : ''}}</span></h1><p>O rebanho, as pendências e a atividade da fazenda em uma só leitura.</p></div>
      <div class="period-area"><span class="control-label">Período de leitura</span><div class="period-pills" role="group" aria-label="Período do dashboard">@for(option of periods; track option.value){<button type="button" [class.active]="store.period().period===option.value" [attr.aria-pressed]="store.period().period===option.value" (click)="choosePeriod(option.value)">{{option.label}}</button>}</div></div></header>
    @if(customOpen()){<form class="custom-period" (submit)="applyCustom($event)"><label>De <input type="date" [value]="customFrom()" (input)="updateDate($event, 'from')" required /></label><label>Até <input type="date" [value]="customTo()" (input)="updateDate($event, 'to')" required /></label><button type="submit">Aplicar período</button><button type="button" class="quiet-button" (click)="customOpen.set(false)">Cancelar</button>@if(customError()){<p role="alert">{{customError()}}</p>}</form>}
    @if(context.status()==='error'){<gr-error-state level="page" title="Não foi possível carregar o contexto" [description]="context.error()?.message || 'Verifique sua conexão e tente novamente.'" [reference]="reference(context.error()?.requestId)" (retry)="retryContext()" />}
    @else if(context.status()==='empty'){<gr-empty-state title="Nenhuma fazenda disponível" description="Peça ao administrador para revisar seu acesso às fazendas." />}
    @else {
      <div class="top-grid">
        <app-territory-overview />
        <section class="attention-section section-frame" aria-labelledby="attention-title"><div class="section-heading"><div><span class="section-kicker">FILA OPERACIONAL</span><h2 id="attention-title">O que precisa de atenção</h2></div></div>
          @if(store.attention().status==='ready' && store.attention().value; as attention){@if(attention.preview.length){<div class="queue" role="list">@for(item of attention.preview; track item.stableId){@let entry = queue(item);<div class="queue-entry" role="listitem"><button type="button" class="queue-button" [attr.aria-expanded]="openItem()===entry.id" (click)="toggleItem(entry.id)"><span class="queue-dot" aria-hidden="true"></span><span class="queue-copy"><strong>{{entry.title}}</strong><small>{{entry.context || kindLabel(entry.kind)}} · {{sourceLabel(entry.source)}}</small></span><span class="queue-date">{{formatDate(entry.date)}}</span></button>@if(openItem()===entry.id){<div class="queue-detail"><span>{{kindLabel(entry.kind)}}</span><span>Data operacional: {{formatDate(entry.date)}}</span>@if(entry.status){<span>Situação: {{statusLabel(entry.status)}}</span>}</div>}</div>}</div>}
          @else{<div class="compact-empty"><strong>Nenhuma pendência agora.</strong><p>A fila de atenção está vazia para esta fazenda.</p></div>}}
          @else if(store.attention().status==='error'){<gr-error-state title="Não foi possível carregar as pendências" [description]="errorText(store.attention().error?.message)" [reference]="reference(store.attention().error?.requestId)" (retry)="store.retry('attention')" />}
          @else{<div class="queue-skeleton" aria-label="Carregando pendências"><gr-skeleton /><gr-skeleton /><gr-skeleton /><gr-skeleton /></div>}
          <a class="section-link" routerLink="/rebanho/agenda">Ver agenda <span aria-hidden="true">→</span></a>
        </section>
      </div>
      <section class="activity-section section-frame" aria-labelledby="activity-title"><div class="section-heading"><div><span class="section-kicker">RITMO DA FAZENDA</span><h2 id="activity-title">Atividade da fazenda</h2></div>@if(store.activity().value; as activity){<span class="section-note">{{formatDate(activity.period.from)}} — {{formatDate(activity.period.to)}}</span>}</div>
        @if(store.activity().status==='ready' && store.activity().value; as activity){<div class="activity-grid"><div class="chart-column"><app-activity-chart [buckets]="activity.series" /></div><div class="period-summary"><span class="control-label">NESTE PERÍODO</span><dl><div><dt>Nascimentos</dt><dd>{{formatNumber(activity.totals.births)}}</dd></div><div><dt>Movimentações</dt><dd>{{formatNumber(activity.totals.movements)}}</dd></div><div><dt>Pesagens</dt><dd>{{formatNumber(activity.totals.weightMeasurements)}}</dd></div><div><dt>Vacinações</dt><dd>{{formatNumber(activity.totals.vaccinations)}}</dd></div><div><dt>Partos</dt><dd>{{formatNumber(activity.totals.calvings)}}</dd></div></dl></div></div>}
        @else if(store.activity().status==='error'){<gr-error-state title="Não foi possível carregar a atividade" [description]="errorText(store.activity().error?.message)" [reference]="reference(store.activity().error?.requestId)" (retry)="store.retry('activity')" />}
        @else{<div class="activity-skeleton" aria-label="Carregando atividade"><gr-skeleton /><gr-skeleton /><gr-skeleton /></div>}
      </section>
      <div class="bottom-grid">
        <section class="agenda-section section-frame" aria-labelledby="agenda-title"><div class="section-heading"><div><span class="section-kicker">PRÓXIMOS PASSOS</span><h2 id="agenda-title">Agenda</h2></div></div>
          @if(store.agenda().status==='ready' && store.agenda().value; as agenda){@if(agenda.items.length){<div class="agenda-list">@for(item of agenda.items; track item.stableId){@let entry = queue(item);<div class="agenda-row"><time [attr.datetime]="entry.date"><strong>{{day(entry.date)}}</strong><small>{{month(entry.date)}}</small></time><div><strong>{{entry.title}}</strong><span>{{entry.context || kindLabel(entry.kind)}} · {{sourceLabel(entry.source)}}</span></div></div>}</div>}@else{<div class="compact-empty"><strong>Nada programado a partir de hoje.</strong><p>Os próximos itens da agenda aparecerão aqui.</p></div>}}
          @else if(store.agenda().status==='error'){<gr-error-state title="Não foi possível carregar a agenda" [description]="errorText(store.agenda().error?.message)" [reference]="reference(store.agenda().error?.requestId)" (retry)="store.retry('agenda')" />}
          @else{<div class="queue-skeleton"><gr-skeleton /><gr-skeleton /><gr-skeleton /></div>}
          <a class="section-link" routerLink="/rebanho/agenda">Ver agenda <span aria-hidden="true">→</span></a>
        </section>
        <section class="insights-section section-frame" aria-labelledby="insights-title"><div class="section-heading"><div><span class="section-kicker">LEITURAS OPERACIONAIS</span><h2 id="insights-title">Sinais do rebanho</h2></div></div>
          @if(store.overview().status==='ready' && store.overview().value; as overview){<div class="insight-list">
            <div class="insight"><span>Pesagens em dia</span><strong>{{formatNumber(overview.insights.weighingCoverage.coveredAnimals)}} de {{formatNumber(overview.insights.weighingCoverage.totalEligibleAnimals)}} animais</strong><div class="insight-track" role="progressbar" aria-label="Cobertura de pesagens" [attr.aria-valuenow]="overview.insights.weighingCoverage.coveragePercentage" aria-valuemin="0" aria-valuemax="100"><i [style.width.%]="overview.insights.weighingCoverage.coveragePercentage"></i></div></div>
            <div class="insight"><span>Cuidados pendentes</span><strong>{{formatNumber(overview.insights.healthDue.vaccinationDue)}} vacinações · {{formatNumber(overview.insights.healthDue.dewormingDue)}} vermifugações</strong></div>
            <div class="insight"><span>Reprodução em acompanhamento</span><strong>{{formatNumber(overview.insights.reproductionPipeline.openPossiblePregnancies)}} possíveis · {{formatNumber(overview.insights.reproductionPipeline.openConfirmedPregnancies)}} gestações confirmadas</strong></div>
            <div class="insight"><span>Partos que pedem atenção</span><strong>{{formatNumber(overview.insights.calvingAttention.upcomingCalvings)}} próximos · {{formatNumber(overview.insights.calvingAttention.overdueCalvings)}} atrasados</strong></div>
            <div class="insight"><span>Planejamento</span><strong>{{formatNumber(overview.insights.plannerExecution.completed)}} concluídos no período · {{formatNumber(overview.insights.plannerExecution.currentlyOpen)}} abertos agora</strong></div>
            <div class="insight"><span>Movimento do rebanho</span><strong>{{formatNumber(overview.insights.herdActivity.births)}} nascimentos · {{formatNumber(overview.insights.herdActivity.movements)}} movimentações no período</strong></div>
          </div>}@else if(store.overview().status==='error'){<p class="insight-unavailable">As leituras do rebanho dependem da visão geral. <button type="button" (click)="store.retry('overview')">Tentar novamente</button></p>}
          @else{<div class="queue-skeleton"><gr-skeleton /><gr-skeleton /><gr-skeleton /></div>}
        </section>
      </div>
    }
  </div>`,
  styleUrl: './home-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent {
  readonly periods: { value: DashboardPeriod; label: string }[] = [{ value: 'TODAY', label: 'Hoje' }, { value: 'LAST_7_DAYS', label: '7 dias' }, { value: 'LAST_30_DAYS', label: '30 dias' }, { value: 'CUSTOM', label: 'Personalizado' }];
  readonly customOpen = signal(false);
  readonly customFrom = signal('');
  readonly customTo = signal('');
  readonly customError = signal('');
  readonly openItem = signal<string | null>(null);
  readonly firstName = computed(() => this.context.user()?.displayName?.trim().split(/\s+/)[0] || '');
  constructor(readonly context: ContextStore, readonly store: DashboardStore) {}
  choosePeriod(period: DashboardPeriod): void {
    if (period === 'CUSTOM') { this.customFrom.set(this.store.period().from ?? ''); this.customTo.set(this.store.period().to ?? ''); this.customError.set(''); this.customOpen.set(true); return; }
    this.customOpen.set(false); this.store.selectPeriod({ period });
  }
  applyCustom(event: Event): void {
    event.preventDefault();
    if (this.store.selectPeriod({ period: 'CUSTOM', from: this.customFrom(), to: this.customTo() })) { this.customOpen.set(false); this.customError.set(''); }
    else this.customError.set('Informe datas válidas em ordem, com intervalo máximo de 366 dias.');
  }
  updateDate(event: Event, field: 'from' | 'to'): void {
    const value = (event.target as HTMLInputElement).value;
    if (field === 'from') this.customFrom.set(value);
    else this.customTo.set(value);
  }
  toggleItem(id: string): void { this.openItem.set(this.openItem() === id ? null : id); }
  retryContext(): void { void this.context.retry().catch(() => {}); }
  queue = mapQueueItem;
  formatNumber(value: number): string { return new Intl.NumberFormat('pt-BR').format(value); }
  formatDate(value?: string): string { if (!value) return '—'; const [year, month, day] = value.split('-'); return `${day}/${month}/${year}`; }
  day(value: string): string { return value.slice(8, 10); }
  month(value: string): string { return new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`)).replace('.', ''); }
  sourceLabel(source: QueueItem['source']): string { return source === 'MANUAL' ? 'Planejado' : 'Identificado pelos dados'; }
  kindLabel(kind: string): string { return ({ GENERAL: 'Atividade geral', VACCINATION: 'Vacinação', DEWORMING: 'Vermifugação', WEIGHING: 'Pesagem', CALVING: 'Parto', BREEDING: 'Cobertura', PREGNANCY_CHECK: 'Exame de gestação', MOVEMENT: 'Movimentação' } as Record<string, string>)[kind] ?? 'Atividade'; }
  statusLabel(status: string): string { return ({ OPEN: 'Aberta', OVERDUE: 'Atrasada', COMPLETED: 'Concluída', CANCELLED: 'Cancelada' } as Record<string, string>)[status] ?? status.toLocaleLowerCase('pt-BR'); }
  errorText(value?: string): string { return value || 'Verifique sua conexão e tente novamente.'; }
  reference(value?: string): string { return value?.slice(0, 12) || ''; }
}
