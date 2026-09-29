import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiClient } from '../../core/api/api-client.service';
import { decimalCommandJson, queryString } from '../management/management.shared';
import { parseManagementJson } from '../management/exact-decimal';
import { InventoryBalance, InventoryLocation, InventoryMovement, InventoryMovementCommand, InventoryMovementType, InventoryPage, InventoryProduct, InventoryStatus, InventoryUnit } from './inventory.models';

@Injectable({ providedIn: 'root' })
export class InventoryApi {
  constructor(private readonly api: ApiClient) {}
  private exact<T>(method: 'GET' | 'POST', path: string, body?: string): Observable<T> { return this.api.requestText(method, path, body, true).pipe(map(json => parseManagementJson<T>(json))); }
  products(): Observable<InventoryProduct[]> { return this.api.get('/api/v1/inventory/products', true); }
  product(id: string): Observable<InventoryProduct> { return this.api.get(`/api/v1/inventory/products/${encodeURIComponent(id)}`, true); }
  createProduct(body: { id: string; name: string; code: string | null; category: string | null; baseUnit: InventoryUnit }): Observable<InventoryProduct> { return this.api.post('/api/v1/inventory/products', body, true); }
  patchProduct(id: string, body: { expectedVersion: number; name?: string; code?: string | null; category?: string | null; status?: InventoryStatus }): Observable<InventoryProduct> { return this.api.patch(`/api/v1/inventory/products/${encodeURIComponent(id)}`, body, true); }
  locations(): Observable<InventoryLocation[]> { return this.api.get('/api/v1/inventory/locations', true); }
  location(id: string): Observable<InventoryLocation> { return this.api.get(`/api/v1/inventory/locations/${encodeURIComponent(id)}`, true); }
  createLocation(body: { id: string; name: string; code: string | null }): Observable<InventoryLocation> { return this.api.post('/api/v1/inventory/locations', body, true); }
  patchLocation(id: string, body: { expectedVersion: number; name?: string; code?: string | null; status?: InventoryStatus }): Observable<InventoryLocation> { return this.api.patch(`/api/v1/inventory/locations/${encodeURIComponent(id)}`, body, true); }
  stock(filters: { productId?: string; locationId?: string; search?: string; onlyPositive?: boolean; page?: number }): Observable<InventoryPage<InventoryBalance>> { return this.exact('GET', `/api/v1/inventory/stock?${queryString({ ...filters, page: filters.page ?? 0, size: 20 })}`); }
  locationStock(id: string, page = 0): Observable<InventoryPage<InventoryBalance>> { return this.exact('GET', `/api/v1/inventory/locations/${encodeURIComponent(id)}/stock?page=${page}&size=20`); }
  movements(filters: { type?: InventoryMovementType | ''; productId?: string; locationId?: string; from?: string; to?: string; page?: number }): Observable<InventoryPage<InventoryMovement>> { return this.exact('GET', `/api/v1/inventory/movements?${queryString({ ...filters, page: filters.page ?? 0, size: 20 })}`); }
  movement(id: string): Observable<InventoryMovement> { return this.exact('GET', `/api/v1/inventory/movements/${encodeURIComponent(id)}`); }
  move(body: InventoryMovementCommand): Observable<InventoryMovement> { return this.exact('POST', '/api/v1/inventory/movements', decimalCommandJson(body, 'quantity', 6)); }
}
