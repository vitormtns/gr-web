import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../core/api/api-client.service';
import { AgendaPage, DashboardActivity, DashboardAttention, DashboardOverview, PaddockPage, PeriodSelection } from './dashboard.models';

@Injectable({ providedIn: 'root' })
export class DashboardApiClient {
  constructor(private readonly api: ApiClient) {}
  overview(selection: PeriodSelection): Observable<DashboardOverview> {
    return this.api.get<DashboardOverview>(`/api/v1/herd/dashboard/overview${periodQuery(selection)}`, true);
  }
  activity(selection: PeriodSelection): Observable<DashboardActivity> {
    return this.api.get<DashboardActivity>(`/api/v1/herd/dashboard/activity${periodQuery(selection)}`, true);
  }
  attention(): Observable<DashboardAttention> {
    return this.api.get<DashboardAttention>('/api/v1/herd/dashboard/attention?previewSize=5', true);
  }
  agenda(today: string): Observable<AgendaPage> {
    return this.api.get<AgendaPage>(`/api/v1/herd/agenda?from=${today}&page=0&size=5`, true);
  }
  paddocks(page = 0): Observable<PaddockPage> {
    return this.api.get<PaddockPage>(`/api/v1/herd/paddocks?page=${page}&size=100`, true);
  }
}

export function periodQuery(selection: PeriodSelection): string {
  const params = new URLSearchParams({ period: selection.period });
  if (selection.period === 'CUSTOM' && selection.from && selection.to) {
    params.set('from', selection.from);
    params.set('to', selection.to);
  }
  return `?${params.toString()}`;
}
