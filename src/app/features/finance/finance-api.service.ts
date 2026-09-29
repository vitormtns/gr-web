import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiClient } from '../../core/api/api-client.service';
import { decimalCommandJson, queryString } from '../management/management.shared';
import { parseManagementJson } from '../management/exact-decimal';
import { CategoryKind, CategoryPatch, CategoryTotals, EntryStatus, FinanceCategory, FinanceCreate, FinanceEntry, FinanceEvent, FinancePage, FinancePatch, FinanceSummary, FinanceType } from './finance.models';

@Injectable({ providedIn: 'root' })
export class FinanceApi {
  constructor(private readonly api: ApiClient) {}
  private exact<T>(method: 'GET' | 'POST' | 'PATCH', path: string, body?: unknown): Observable<T> { return this.api.requestText(method, path, body, true).pipe(map(json => parseManagementJson<T>(json))); }
  categories(): Observable<FinanceCategory[]> { return this.api.get('/api/v1/finance/categories', true); }
  category(id: string): Observable<FinanceCategory> { return this.api.get(`/api/v1/finance/categories/${encodeURIComponent(id)}`, true); }
  createCategory(body: { name: string; code: string | null; kind: CategoryKind }): Observable<FinanceCategory> { return this.api.post('/api/v1/finance/categories', body, true); }
  patchCategory(id: string, body: CategoryPatch): Observable<FinanceCategory> { return this.api.patch(`/api/v1/finance/categories/${encodeURIComponent(id)}`, body, true); }
  entries(filters: { dueFrom: string; dueTo: string; type?: FinanceType | ''; status?: EntryStatus | ''; categoryId?: string; search?: string; page?: number }): Observable<FinancePage> { return this.exact('GET', `/api/v1/finance/entries?${queryString({ ...filters, page: filters.page ?? 0, size: 20 })}`); }
  entry(id: string): Observable<FinanceEntry> { return this.exact('GET', `/api/v1/finance/entries/${encodeURIComponent(id)}`); }
  create(body: FinanceCreate): Observable<FinanceEntry> { return this.exact('POST', '/api/v1/finance/entries', decimalCommandJson(body, 'amount', 2)); }
  patch(id: string, body: FinancePatch): Observable<FinanceEntry> { return this.exact('PATCH', `/api/v1/finance/entries/${encodeURIComponent(id)}`, decimalCommandJson(body, 'amount', 2)); }
  settle(id: string, body: { operationId: string; expectedVersion: number; settledOn: string }): Observable<FinanceEntry> { return this.exact('POST', `/api/v1/finance/entries/${encodeURIComponent(id)}/settlement`, body); }
  cancel(id: string, body: { operationId: string; expectedVersion: number; reason: string | null }): Observable<FinanceEntry> { return this.exact('POST', `/api/v1/finance/entries/${encodeURIComponent(id)}/cancellation`, body); }
  history(id: string): Observable<FinanceEvent[]> { return this.exact('GET', `/api/v1/finance/entries/${encodeURIComponent(id)}/history`); }
  summary(from: string, to: string, categoryId = ''): Observable<FinanceSummary> { return this.exact('GET', `/api/v1/finance/summary?${queryString({ from, to, categoryId })}`); }
  categoryTotals(from: string, to: string): Observable<CategoryTotals[]> { return this.exact('GET', `/api/v1/finance/summary/by-category?${queryString({ from, to })}`); }
}
