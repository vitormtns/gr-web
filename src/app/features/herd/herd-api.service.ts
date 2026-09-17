import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../core/api/api-client.service';
import { ItemsResponse } from '../../core/api/api.models';
import { Animal, AnimalFilters, AnimalHistory, BatchResult, MovementPage, Page, PaddockRef, TransferResult } from './herd.models';

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
}

export function animalListQuery(filters: AnimalFilters): string {
  const params = new URLSearchParams({ page: String(filters.page), size: String(filters.size) });
  if (filters.search) params.set('search', filters.search);
  if (filters.sex) params.set('sex', filters.sex);
  if (filters.status) params.set('status', filters.status);
  return params.toString();
}
