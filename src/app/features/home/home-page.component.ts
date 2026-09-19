import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ContextStore } from '../../core/context/context.store';
import { EmptyStateComponent, ErrorStateComponent, SkeletonComponent } from '../../design-system/feedback/feedback';
import { MetricDeckComponent, OperationalMetric } from '../../design-system/patterns/metric-deck';
import { ActivityChartComponent } from './activity-chart.component';
import { DashboardStore } from './dashboard.store';
import { DashboardPeriod } from './dashboard.models';
import { TerritoryOverviewComponent } from './territory-overview.component';
import { HomeActionsComponent } from './home-actions.component';

@Component({
  selector: 'app-home-page',
  providers: [DashboardStore],
  imports: [EmptyStateComponent, ErrorStateComponent, SkeletonComponent, MetricDeckComponent, ActivityChartComponent, TerritoryOverviewComponent, HomeActionsComponent],
  template: `<div class="dashboard page-enter">
    <header class="operation-header">
      <div class="operation-title"><span class="eyebrow">OPERAÇÃO ATIVA</span><h1>{{context.selectedFarm()?.farmName || 'Fazenda atual'}}</h1><p>{{operationalSummary()}}</p></div>
      <div class="period-area"><span class="control-label">Período de leitura</span><div class="period-pills" role="group" aria-label="Período do dashboard">@for(option of periods;track option.value){<button type="button" [class.active]="store.period().period===option.value" [attr.aria-pressed]="store.period().period===option.value" (click)="choosePeriod(option.value)">{{option.label}}</button>}</div></div>
    </header>

    @if(customOpen()){
      <form class="custom-period" (submit)="applyCustom($event)"><div class="custom-period-copy"><strong>Período personalizado</strong><span>Escolha até 366 dias para a leitura da operação.</span></div><label>De <input type="date" [value]="customFrom()" (input)="updateDate($event,'from')" required /></label><label>Até <input type="date" [value]="customTo()" (input)="updateDate($event,'to')" required /></label><button type="submit">Aplicar período</button><button type="button" class="quiet-button" (click)="customOpen.set(false)">Cancelar</button>@if(customError()){<p role="alert">{{customError()}}</p>}</form>
    }

    @if(context.status()==='error'){
      <gr-error-state level="page" title="Não foi possível carregar o contexto" [description]="context.error()?.message || 'Verifique sua conexão e tente novamente.'" [reference]="reference(context.error()?.requestId)" (retry)="retryContext()" />
    } @else if(context.status()==='empty'){
      <gr-empty-state title="Nenhuma fazenda disponível" description="Peça ao administrador para revisar seu acesso às fazendas." />
    } @else {
      @if(store.overview().status==='ready' && store.overview().value){<gr-metric-deck [metrics]="metrics()" />}@else{<div class="metric-loading" aria-label="Carregando estado da operação"><gr-skeleton /><gr-skeleton /><gr-skeleton /><gr-skeleton /><gr-skeleton /></div>}

      <div class="operation-board">
        <app-territory-overview />
        <app-home-actions />
      </div>

      <section class="activity-section" aria-labelledby="activity-title">
        <div class="section-heading"><div><span class="section-kicker movement-kicker">TEMPO</span><h2 id="activity-title">Ritmo da fazenda</h2><p>Quando e quanto a operação se movimentou no período.</p></div>@if(store.activity().value;as activity){<span class="section-note">{{formatDate(activity.period.from)}} — {{formatDate(activity.period.to)}}</span>}</div>
        @if(store.activity().status==='ready'&&store.activity().value;as activity){<app-activity-chart [buckets]="activity.series"/><div class="activity-totals" aria-label="Resumo da atividade"><div><span>Nascimentos</span><strong>{{formatNumber(activity.totals.births)}}</strong></div><div><span>Movimentações</span><strong>{{formatNumber(activity.totals.movements)}}</strong></div><div><span>Pesagens</span><strong>{{formatNumber(activity.totals.weightMeasurements)}}</strong></div><div><span>Vacinações</span><strong>{{formatNumber(activity.totals.vaccinations)}}</strong></div><div><span>Partos</span><strong>{{formatNumber(activity.totals.calvings)}}</strong></div></div>}
        @else if(store.activity().status==='error'){<gr-error-state title="Não foi possível carregar a atividade" [description]="errorText(store.activity().error?.message)" [reference]="reference(store.activity().error?.requestId)" (retry)="store.retry('activity')" />}@else{<div class="activity-skeleton"><gr-skeleton /><gr-skeleton /><gr-skeleton /></div>}
      </section>

      <section class="reading-section" aria-labelledby="reading-title">
        <div class="section-heading reading-heading"><div><span class="section-kicker">LEITURA DO REBANHO</span><h2 id="reading-title">Sinais operacionais</h2></div></div>
        @if(store.overview().status==='ready'&&store.overview().value;as overview){<div class="context-rail">
          <div class="reading weight"><span>Pesagens em dia</span><strong>{{formatPercentage(overview.insights.weighingCoverage.coveragePercentage)}}</strong><small>{{formatNumber(overview.insights.weighingCoverage.coveredAnimals)}} de {{formatNumber(overview.insights.weighingCoverage.totalEligibleAnimals)}} animais</small><i role="progressbar" aria-label="Cobertura de pesagens" [attr.aria-valuenow]="overview.insights.weighingCoverage.coveragePercentage" aria-valuemin="0" aria-valuemax="100"><b [style.width.%]="overview.insights.weighingCoverage.coveragePercentage"></b></i></div>
          <div class="reading health"><span>Saúde pendente</span><strong>{{formatNumber(overview.insights.healthDue.vaccinationDue+overview.insights.healthDue.dewormingDue)}}</strong><small>{{formatNumber(overview.insights.healthDue.vaccinationDue)}} vacinações · {{formatNumber(overview.insights.healthDue.dewormingDue)}} vermifugações</small></div>
          <div class="reading reproduction"><span>Gestações confirmadas</span><strong>{{formatNumber(overview.insights.reproductionPipeline.openConfirmedPregnancies)}}</strong><small>{{formatNumber(overview.insights.reproductionPipeline.openPossiblePregnancies)}} possíveis em acompanhamento</small></div>
          <div class="reading attention"><span>Partos em atenção</span><strong>{{formatNumber(overview.insights.calvingAttention.upcomingCalvings+overview.insights.calvingAttention.overdueCalvings)}}</strong><small>{{formatNumber(overview.insights.calvingAttention.upcomingCalvings)}} próximos · {{formatNumber(overview.insights.calvingAttention.overdueCalvings)}} atrasados</small></div>
          <div class="reading planner"><span>Planejamento aberto</span><strong>{{formatNumber(overview.insights.plannerExecution.currentlyOpen)}}</strong><small>{{formatNumber(overview.insights.plannerExecution.completed)}} concluídos no período</small></div>
          <div class="reading movement"><span>Movimento do rebanho</span><strong>{{formatNumber(overview.insights.herdActivity.movements)}}</strong><small>{{formatNumber(overview.insights.herdActivity.births)}} nascimentos no período</small></div>
        </div>} @else if(store.overview().status==='error'){<p class="insight-unavailable">As leituras dependem da visão geral. <button type="button" (click)="store.retry('overview')">Tentar novamente</button></p>}@else{<div class="reading-skeleton"><gr-skeleton /><gr-skeleton /><gr-skeleton /></div>}
      </section>
    }
  </div>`,
  styleUrl: './home-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent {
  readonly periods: { value: DashboardPeriod; label: string }[] = [{ value:'TODAY',label:'Hoje'},{ value:'LAST_7_DAYS',label:'7 dias'},{ value:'LAST_30_DAYS',label:'30 dias'},{ value:'CUSTOM',label:'Personalizado'}];
  readonly customOpen=signal(false); readonly customFrom=signal(''); readonly customTo=signal(''); readonly customError=signal('');
  readonly operationalSummary=computed(()=>{const overview=this.store.overview().value;if(!overview)return'Território, rebanho e próximos passos em uma única leitura.';const animals=overview.herdSnapshot.activeAnimals;const paddocks=this.paddockCount();const attention=this.attentionTotal();return`${this.formatNumber(animals)} ${animals===1?'animal ativo':'animais ativos'} · ${this.formatNumber(paddocks)} ${paddocks===1?'piquete':'piquetes'} · ${this.formatNumber(attention)} ${attention===1?'atenção':'atenções'}`;});
  readonly metrics=computed<OperationalMetric[]>(()=>{const overview=this.store.overview().value;if(!overview)return[];const paddocks=this.paddockCount();const occupied=this.occupiedPaddocks();const unlocated=overview.herdSnapshot.unlocatedAnimals;const attention=this.attentionTotal();return[
    {label:'Animais ativos',value:this.formatNumber(overview.herdSnapshot.activeAnimals),detail:'no contexto atual',icon:'◒',tone:'territory'},
    {label:'Piquetes',value:this.formatNumber(paddocks),detail:`${this.formatNumber(occupied)} ocupados`,icon:'⌗',tone:'territory'},
    {label:'Áreas ocupadas',value:this.formatNumber(occupied),detail:'com animais associados',icon:'●',tone:'neutral'},
    {label:'Sem localização',value:this.formatNumber(unlocated),detail:'fora do campo territorial',icon:'○',tone:unlocated?'attention':'neutral'},
    {label:'Para acompanhar',value:this.formatNumber(attention),detail:'situações identificadas',icon:'!',tone:attention?'attention':'neutral'},
  ];});
  constructor(readonly context:ContextStore,readonly store:DashboardStore){}
  choosePeriod(period:DashboardPeriod):void{if(period==='CUSTOM'){this.customFrom.set(this.store.period().from??'');this.customTo.set(this.store.period().to??'');this.customError.set('');this.customOpen.set(true);return;}this.customOpen.set(false);this.store.selectPeriod({period});}
  applyCustom(event:Event):void{event.preventDefault();if(this.store.selectPeriod({period:'CUSTOM',from:this.customFrom(),to:this.customTo()})){this.customOpen.set(false);this.customError.set('');}else this.customError.set('Informe datas válidas em ordem, com intervalo máximo de 366 dias.');}
  updateDate(event:Event,field:'from'|'to'):void{const value=(event.target as HTMLInputElement).value;if(field==='from')this.customFrom.set(value);else this.customTo.set(value);}
  paddockCount():number{return this.store.paddocks().value?.length??this.store.overview().value?.herdSnapshot.byPaddock.length??0;} occupiedPaddocks():number{return this.store.overview().value?.herdSnapshot.byPaddock.filter(item=>item.total>0).length??0;}
  attentionTotal():number{const value=this.store.overview().value?.attention;return value?value.vaccinationDue+value.dewormingDue+value.weighingDue+value.calvingUpcoming+value.calvingOverdue+value.openPlannerItems:0;}
  retryContext():void{void this.context.retry().catch(()=>{});} formatNumber(value:number):string{return new Intl.NumberFormat('pt-BR').format(value);} formatPercentage(value:number):string{return`${new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(value)}%`;}
  formatDate(value?:string):string{if(!value)return'—';const[year,month,day]=value.split('-');return`${day}/${month}/${year}`;} errorText(value?:string):string{return value||'Verifique sua conexão e tente novamente.';} reference(value?:string):string{return value?.slice(0,12)||'';}
}
