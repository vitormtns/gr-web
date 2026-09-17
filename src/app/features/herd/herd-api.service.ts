import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../core/api/api-client.service';
import { ItemsResponse } from '../../core/api/api.models';
import { Animal, AnimalFilters, AnimalHistory, BatchResult, MovementPage, Page, PaddockRef, TransferResult } from './herd.models';
import { AgendaPage, CalvingResult, HealthReport, OperationResult, PendingWorkPage, PlannerItem, PlannerPage, Pregnancy, PregnancyPage, ReproductionReport, WeightPage } from './herd-operations.models';

@Injectable({ providedIn: 'root' })
export class HerdApi {
  constructor(private readonly api: ApiClient) {}
  animals(filters: AnimalFilters): Observable<Page<Animal>> { return this.api.get(`/api/v1/herd/animals?${animalListQuery(filters)}`, true); }
  animal(id: string): Observable<Animal> { return this.api.get(`/api/v1/herd/animals/${encodeURIComponent(id)}`, true); }
  history(id: string, page = 0): Observable<AnimalHistory> { return this.api.get(`/api/v1/herd/animals/${encodeURIComponent(id)}/history?page=${page}&size=50`, true); }
  paddocks(): Observable<Page<PaddockRef>> { return this.api.get('/api/v1/herd/paddocks?status=ACTIVE&page=0&size=100', true); }
  create(body: { id: string; identification: string; name: string | null; sex: string; birthDate: string | null }): Observable<Animal> { return this.api.post('/api/v1/herd/animals', body, true); }
  correct(id: string, body: object): Observable<Animal> { return this.api.patch(`/api/v1/herd/animals/${encodeURIComponent(id)}`, body, true); }
  move(id: string, body: object): Observable<Animal> { return this.api.post(`/api/v1/herd/animals/${encodeURIComponent(id)}/movements`, body, true); }
  moveBatch(body: object): Observable<BatchResult> { return this.api.post('/api/v1/herd/movements/batch', body, true); }
  transfer(id: string, body: object): Observable<TransferResult> { return this.api.post(`/api/v1/herd/animals/${encodeURIComponent(id)}/transfers`, body, true); }
  movements(page: number): Observable<MovementPage> { return this.api.get(`/api/v1/herd/reports/movements?page=${page}&size=20`, true); }
  accessibleFarms(organizationId: string): Observable<ItemsResponse<{ farmId: string; farmName: string }>> { return this.api.get(`/api/v1/me/organizations/${encodeURIComponent(organizationId)}/farms`); }
  weights(animalId:string,page=0):Observable<WeightPage>{return this.api.get(`/api/v1/herd/animals/${encodeURIComponent(animalId)}/weights?page=${page}&size=20`,true)}
  recordWeight(animalId:string,body:object):Observable<OperationResult>{return this.api.post(`/api/v1/herd/animals/${encodeURIComponent(animalId)}/weights`,body,true)}
  healthReport(filters:{treatmentType?:string;animalId?:string;page?:number}):Observable<HealthReport>{return this.api.get(`/api/v1/herd/reports/health?${query(filters)}`,true)}
  treatments(animalId:string,page=0):Observable<Page<import('./herd-operations.models').HealthTreatment>>{return this.api.get(`/api/v1/herd/animals/${encodeURIComponent(animalId)}/health-treatments?page=${page}&size=20`,true)}
  recordHealth(animalId:string,body:object):Observable<OperationResult>{return this.api.post(`/api/v1/herd/animals/${encodeURIComponent(animalId)}/health-treatments`,body,true)}
  recordHealthBatch(body:object):Observable<OperationResult>{return this.api.post('/api/v1/herd/health-treatments/batch',body,true)}
  reproductionReport(filters:{motherId?:string;serviceType?:string;pregnancyStatus?:string;page?:number}):Observable<ReproductionReport>{return this.api.get(`/api/v1/herd/reports/reproduction?${query(filters)}`,true)}
  pregnancies(motherId:string,page=0):Observable<PregnancyPage>{return this.api.get(`/api/v1/herd/animals/${encodeURIComponent(motherId)}/pregnancies?page=${page}&size=20`,true)}
  pregnancy(id:string):Observable<Pregnancy>{return this.api.get(`/api/v1/herd/pregnancies/${encodeURIComponent(id)}`,true)}
  breed(motherId:string,body:object):Observable<Pregnancy>{return this.api.post(`/api/v1/herd/animals/${encodeURIComponent(motherId)}/breedings`,body,true)}
  confirmPregnancy(id:string,body:object):Observable<Pregnancy>{return this.api.post(`/api/v1/herd/pregnancies/${encodeURIComponent(id)}/confirmation`,body,true)}
  terminatePregnancy(id:string,body:object):Observable<Pregnancy>{return this.api.post(`/api/v1/herd/pregnancies/${encodeURIComponent(id)}/termination`,body,true)}
  calve(motherId:string,body:object):Observable<CalvingResult>{return this.api.post(`/api/v1/herd/animals/${encodeURIComponent(motherId)}/calvings`,body,true)}
  calves(motherId:string):Observable<Animal[]>{return this.api.get(`/api/v1/herd/animals/${encodeURIComponent(motherId)}/calves?page=0&size=100`,true)}
  mother(calfId:string):Observable<Animal>{return this.api.get(`/api/v1/herd/animals/${encodeURIComponent(calfId)}/mother`,true)}
  pendingWork(filters:{type?:string;animalId?:string;page?:number}={}):Observable<PendingWorkPage>{return this.api.get(`/api/v1/herd/pending-work?${query(filters)}`,true)}
  planner(filters:{status?:string;type?:string;animalId?:string;from?:string;to?:string;page?:number}={}):Observable<PlannerPage>{return this.api.get(`/api/v1/herd/planner-items?${query(filters)}`,true)}
  plannerItem(id:string):Observable<PlannerItem>{return this.api.get(`/api/v1/herd/planner-items/${encodeURIComponent(id)}`,true)}
  createPlanner(body:object):Observable<PlannerItem>{return this.api.post('/api/v1/herd/planner-items',body,true)}
  correctPlanner(id:string,body:object):Observable<PlannerItem>{return this.api.patch(`/api/v1/herd/planner-items/${encodeURIComponent(id)}`,body,true)}
  completePlanner(id:string,body:object):Observable<PlannerItem>{return this.api.post(`/api/v1/herd/planner-items/${encodeURIComponent(id)}/completion`,body,true)}
  cancelPlanner(id:string,body:object):Observable<PlannerItem>{return this.api.post(`/api/v1/herd/planner-items/${encodeURIComponent(id)}/cancellation`,body,true)}
  agenda(filters:{source?:string;type?:string;animalId?:string;from?:string;to?:string;page?:number}={}):Observable<AgendaPage>{return this.api.get(`/api/v1/herd/agenda?${query(filters)}`,true)}
}

function query(values:Record<string,string|number|undefined>):string{const p=new URLSearchParams({page:String(values['page']??0),size:'20'});for(const [key,value] of Object.entries(values))if(key!=='page'&&value)p.set(key,String(value));return p.toString()}

export function animalListQuery(filters: AnimalFilters): string {
  const params = new URLSearchParams({ page: String(filters.page), size: String(filters.size) });
  if (filters.search) params.set('search', filters.search);
  if (filters.sex) params.set('sex', filters.sex);
  if (filters.status) params.set('status', filters.status);
  return params.toString();
}
