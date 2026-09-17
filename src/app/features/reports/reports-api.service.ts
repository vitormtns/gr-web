import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../core/api/api-client.service';
import { AnyReportPage, HealthPage, HerdPositionPage, LifecyclePage, MovementPage, PlannerPage, ReportFilters, ReproductionPage, TransferPage, WeightPage } from './reports.models';

@Injectable()
export class ReportsApi {
  constructor(private readonly api:ApiClient){}
  load(filters:ReportFilters):Observable<AnyReportPage>{
    const query=reportQuery(filters);
    switch(filters.report){
      case 'herd-position':return this.api.get<HerdPositionPage>(`/api/v1/herd/reports/herd-position?${query}`,true);
      case 'lifecycle':return this.api.get<LifecyclePage>(`/api/v1/herd/reports/lifecycle?${query}`,true);
      case 'movements':return this.api.get<MovementPage>(`/api/v1/herd/reports/movements?${query}`,true);
      case 'transfers':return this.api.get<TransferPage>(`/api/v1/herd/reports/transfers?${query}`,true);
      case 'weights':return this.api.get<WeightPage>(`/api/v1/herd/reports/weights?${query}`,true);
      case 'health':return this.api.get<HealthPage>(`/api/v1/herd/reports/health?${query}`,true);
      case 'reproduction':return this.api.get<ReproductionPage>(`/api/v1/herd/reports/reproduction?${query}`,true);
      case 'planner':return this.api.get<PlannerPage>(`/api/v1/herd/reports/planner?${query}`,true);
    }
  }
}

export function reportQuery(f:ReportFilters):string{
  const q=new URLSearchParams();
  const add=(key:string,value:string)=>{if(value)q.set(key,value)};
  if(f.report!=='herd-position'){add('from',f.from);add('to',f.to);}
  const animalKey=f.report==='reproduction'?'motherId':'animalId';
  if(['lifecycle','movements','transfers','weights','health','planner','reproduction'].includes(f.report))add(animalKey,f.animalId);
  if(f.report==='herd-position'){add('category',f.category);add('sex',f.sex);add('paddockId',f.paddockId);}
  if(f.report==='lifecycle')add('event',f.event);
  if(f.report==='movements'){add('sourcePaddockId',f.sourcePaddockId);add('destinationPaddockId',f.destinationPaddockId);}
  if(f.report==='transfers'&&f.direction!=='ALL')add('direction',f.direction);
  if(f.report==='weights')add('category',f.category);
  if(f.report==='health')add('treatmentType',f.treatmentType);
  if(f.report==='reproduction'){add('serviceType',f.serviceType);add('pregnancyStatus',f.pregnancyStatus);}
  if(f.report==='planner'){add('status',f.plannerStatus);add('type',f.plannerType);}
  q.set('page',String(f.page));q.set('size',String(f.size));return q.toString();
}
