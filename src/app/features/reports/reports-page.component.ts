import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { KeyValuePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { ContextStore } from '../../core/context/context.store';
import { AppError } from '../../core/api/api.models';
import { EmptyStateComponent, ErrorStateComponent, SkeletonComponent } from '../../design-system/feedback/feedback';
import { PaginationComponent } from '../../design-system/data-display/data-display';
import { AnimalIdentityComponent, errorReference, formatDate } from '../herd/herd.shared';
import { Animal } from '../herd/herd.models';
import { ReportsApi } from './reports-api.service';
import { AnyReportPage, HealthPage, HerdPositionPage, LifecyclePage, MovementPage, PlannerPage, ReportFilters, ReportId, ReproductionPage, TransferPage, WeightPage, healthLabels, lifecycleLabels, plannerLabels, plannerStatusLabels, reportDefinitions, reproductionLabels, serviceLabels } from './reports.models';

@Component({
  selector:'app-reports-page',
  providers:[ReportsApi],
  imports:[FormsModule,KeyValuePipe,SkeletonComponent,EmptyStateComponent,ErrorStateComponent,PaginationComponent,AnimalIdentityComponent],
  templateUrl:'./reports-page.component.html',
  changeDetection:ChangeDetectionStrategy.OnPush,
})
export class ReportsPageComponent {
  private readonly api=inject(ReportsApi);private readonly route=inject(ActivatedRoute);private readonly router=inject(Router);private readonly destroyRef=inject(DestroyRef);
  readonly context=inject(ContextStore);readonly definitions=reportDefinitions;readonly state=signal<'loading'|'ready'|'error'>('loading');readonly result=signal<AnyReportPage|null>(null);readonly error=signal<AppError|null>(null);readonly filters=signal<ReportFilters>(parseFilters(this.route.snapshot.queryParamMap));readonly periodError=signal('');private generation=0;private routeReady=false;
  readonly lifecycleLabels=lifecycleLabels;readonly healthLabels=healthLabels;readonly reproductionLabels=reproductionLabels;readonly plannerLabels=plannerLabels;readonly plannerStatusLabels=plannerStatusLabels;readonly serviceLabels=serviceLabels;
  constructor(){
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(params=>{this.filters.set(parseFilters(params));if(this.routeReady)this.load();this.routeReady=true;});
    effect(()=>{this.context.contextVersion();const pending=this.context.transitionPending();const farm=this.context.selectedFarm();if(pending||!farm){this.generation++;this.result.set(null);this.state.set('loading');return;}this.load();});
  }
  get current(){return this.definitions.find(item=>item.id===this.filters().report)!;}
  get reference(){return errorReference(this.error()?.requestId)}
  get hasFilters(){const f=this.filters();return !!(f.animalId||f.category||f.sex||f.paddockId||f.event||f.sourcePaddockId||f.destinationPaddockId||f.direction!=='ALL'||f.treatmentType||f.serviceType||f.pregnancyStatus||f.plannerStatus||f.plannerType)}
  get emptyTitle(){return this.hasFilters?'Nenhum resultado corresponde aos filtros':'Não há fatos suficientes para esta leitura'}
  switchReport(report:ReportId){if(report===this.filters().report)return;this.navigate({...defaultFilters(report),from:this.filters().from,to:this.filters().to});}
  update<K extends keyof ReportFilters>(key:K,value:ReportFilters[K]){const next={...this.filters(),[key]:value,page:0};if(key==='from'||key==='to'){const issue=periodIssue(next.from,next.to);this.periodError.set(issue);if(issue)return;}this.navigate(next);}
  setPeriod(days:number){const to=today();const from=isoOffset(to,-(days-1));this.periodError.set('');this.navigate({...this.filters(),from,to,page:0});}
  clearFilters(){this.navigate({...defaultFilters(this.filters().report),from:this.filters().from,to:this.filters().to});}
  changePage(page:number){this.navigate({...this.filters(),page});}
  load(){
    const farm=this.context.selectedFarm();if(!farm||this.context.transitionPending())return;
    const current=++this.generation;this.state.set('loading');this.error.set(null);
    this.api.load(this.filters()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next:value=>{if(current!==this.generation)return;this.result.set(value);this.state.set('ready');},error:error=>{if(current!==this.generation)return;this.error.set(error instanceof AppError?error:null);this.state.set('error');}});
  }
  position(){return this.filters().report==='herd-position'?this.result() as HerdPositionPage|null:null}
  lifecycle(){return this.filters().report==='lifecycle'?this.result() as LifecyclePage|null:null}
  movements(){return this.filters().report==='movements'?this.result() as MovementPage|null:null}
  transfers(){return this.filters().report==='transfers'?this.result() as TransferPage|null:null}
  weights(){return this.filters().report==='weights'?this.result() as WeightPage|null:null}
  health(){return this.filters().report==='health'?this.result() as HealthPage|null:null}
  reproduction(){return this.filters().report==='reproduction'?this.result() as ReproductionPage|null:null}
  planner(){return this.filters().report==='planner'?this.result() as PlannerPage|null:null}
  animal(ref:{id:string;identification:string;name:string|null}):Animal{return{id:ref.id,identification:ref.identification,name:ref.name,sex:'FEMALE',birthDate:null,status:'ACTIVE',version:0,paddock:null}}
  date=formatDate;
  number(value:number){return new Intl.NumberFormat('pt-BR').format(value)}
  weight(value:string|null){return value===null?'Não disponível':`${new Intl.NumberFormat('pt-BR',{minimumFractionDigits:0,maximumFractionDigits:3}).format(Number(value))} kg`}
  bar(value:number,total:number){return total>0?Math.max(2,Math.min(100,value/total*100)):0}
  eventCount(values:Partial<Record<string,number>>,key:string){return values[key]||0}
  private navigate(filters:ReportFilters){const q:Record<string,string|number|null>={report:filters.report,from:filters.report==='herd-position'?null:filters.from,to:filters.report==='herd-position'?null:filters.to,page:filters.page||null,size:filters.size===20?null:filters.size,animalId:filters.animalId||null,category:filters.category||null,sex:filters.sex||null,paddockId:filters.paddockId||null,event:filters.event||null,sourcePaddockId:filters.sourcePaddockId||null,destinationPaddockId:filters.destinationPaddockId||null,direction:filters.direction==='ALL'?null:filters.direction,treatmentType:filters.treatmentType||null,serviceType:filters.serviceType||null,pregnancyStatus:filters.pregnancyStatus||null,plannerStatus:filters.plannerStatus||null,plannerType:filters.plannerType||null};void this.router.navigate([],{relativeTo:this.route,queryParams:q});}
}

export function defaultFilters(report:ReportId='herd-position'):ReportFilters{const to=today();return{report,from:isoOffset(to,-29),to,animalId:'',category:'',sex:'',paddockId:'',event:'',sourcePaddockId:'',destinationPaddockId:'',direction:'ALL',treatmentType:'',motherId:'',serviceType:'',pregnancyStatus:'',plannerStatus:'',plannerType:'',page:0,size:20}}
export function parseFilters(params:ParamMap):ReportFilters{const validReports=reportDefinitions.map(x=>x.id);const raw=params.get('report') as ReportId|null;const base=defaultFilters(raw&&validReports.includes(raw)?raw:'herd-position');const take=<T extends string>(key:string,values:readonly T[]):T|''=>{const value=params.get(key) as T|null;return value&&values.includes(value)?value:''};const page=Number(params.get('page'));const size=Number(params.get('size'));const from=validIso(params.get('from'))?params.get('from')!:base.from;const to=validIso(params.get('to'))?params.get('to')!:base.to;return{...base,from:periodIssue(from,to)?base.from:from,to:periodIssue(from,to)?base.to:to,animalId:uuid(params.get('animalId')),category:take('category',['UNCLASSIFIED']),sex:take('sex',['FEMALE','MALE']),paddockId:uuid(params.get('paddockId')),event:take('event',['CREATED','BORN','SOLD','DECEASED']),sourcePaddockId:uuid(params.get('sourcePaddockId')),destinationPaddockId:uuid(params.get('destinationPaddockId')),direction:take('direction',['IN','OUT'])||'ALL',treatmentType:take('treatmentType',['VACCINATION','DEWORMING']),serviceType:take('serviceType',['INSEMINATION','NATURAL_SERVICE']),pregnancyStatus:take('pregnancyStatus',['POSSIBLE','CONFIRMED','CALVED','TERMINATED']),plannerStatus:take('plannerStatus',['OPEN','COMPLETED','CANCELLED']),plannerType:take('plannerType',['GENERAL','WEIGHING','VACCINATION','DEWORMING','BREEDING','PREGNANCY_CHECK','CALVING','MOVEMENT']),page:Number.isInteger(page)&&page>=0?page:0,size:[20,50,100].includes(size)?size:20};}
export function periodIssue(from:string,to:string):string{if(!validIso(from)||!validIso(to))return'Datas inválidas.';const days=Math.round((Date.parse(`${to}T12:00:00Z`)-Date.parse(`${from}T12:00:00Z`))/86400000);if(days<0)return'A data inicial deve ser anterior ou igual à data final.';if(days>=3650)return'O período pode ter no máximo 3.650 dias.';return''}
function validIso(value:string|null):boolean{return !!value&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(`${value}T12:00:00Z`))}
function uuid(value:string|null):string{return value&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)?value:''}
function today():string{return new Date().toISOString().slice(0,10)}
function isoOffset(value:string,days:number):string{const date=new Date(`${value}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+days);return date.toISOString().slice(0,10)}
