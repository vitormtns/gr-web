import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../core/api/api-client.service';
import { Animal, AnimalStatus, Page, PaddockRef } from '../herd/herd.models';
import { queryString } from '../management/management.shared';

export interface PaddockOccupancy { paddock: PaddockRef; totalAnimals: number; countsByStatus: Partial<Record<AnimalStatus, number>> }
export interface PaddockMovement { eventId: string; animalId: string; identification: string; sourcePaddockId: string | null; sourcePaddockName: string | null; destinationPaddockId: string; destinationPaddockName: string; occurredOn: string; recordedAt: string; actorUserId: string | null }
@Injectable({ providedIn: 'root' })
export class PaddocksApi {
  constructor(private readonly api: ApiClient) {}
  list(filters: { status?: 'ACTIVE' | 'INACTIVE' | ''; search?: string; page?: number }): Observable<Page<PaddockRef>> { return this.api.get(`/api/v1/herd/paddocks?${queryString({ ...filters, page: filters.page ?? 0, size: 20 })}`, true); }
  get(id: string): Observable<PaddockRef> { return this.api.get(`/api/v1/herd/paddocks/${encodeURIComponent(id)}`, true); }
  create(body: { id: string; name: string; code: string | null }): Observable<PaddockRef> { return this.api.post('/api/v1/herd/paddocks', body, true); }
  patch(id: string, body: { expectedVersion: number; name: string; code: string | null; status: 'ACTIVE' | 'INACTIVE' }): Observable<PaddockRef> { return this.api.patch(`/api/v1/herd/paddocks/${encodeURIComponent(id)}`, body, true); }
  occupancy(id: string): Observable<PaddockOccupancy> { return this.api.get(`/api/v1/herd/paddocks/${encodeURIComponent(id)}/occupancy`, true); }
  animals(id: string, page = 0): Observable<Page<Animal>> { return this.api.get(`/api/v1/herd/paddocks/${encodeURIComponent(id)}/animals?page=${page}&size=20`, true); }
  movements(id: string, page = 0): Observable<Page<PaddockMovement>> { return this.api.get(`/api/v1/herd/paddocks/${encodeURIComponent(id)}/movements?page=${page}&size=20`, true); }
}
