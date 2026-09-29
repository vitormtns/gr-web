import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { REQUIRES_TENANT_CONTEXT } from '../../core/api/api-client.service';
import { InventoryApi } from './inventory-api.service';

describe('Contratos HTTP de insumos', () => {
  let api: InventoryApi, http: HttpTestingController;
  beforeEach(() => { TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] }); api = TestBed.inject(InventoryApi); http = TestBed.inject(HttpTestingController); });
  afterEach(() => http.verify());
  function verify(path: string, method: string, body?: object) {
    const request = http.expectOne('/api/v1/inventory/' + path);
    expect(request.request.method).toBe(method); expect(request.request.context.get(REQUIRES_TENANT_CONTEXT)).toBe(true);
    if (body) expect(request.request.body).toEqual(body);
    request.flush({});
  }
  it('consulta catálogo e cadastro individual com identificador escapado', () => {
    api.products().subscribe(); verify('products', 'GET');
    api.product('p/1').subscribe(); verify('products/p%2F1', 'GET');
    api.locations().subscribe(); verify('locations', 'GET');
    api.location('l/1').subscribe(); verify('locations/l%2F1', 'GET');
  });
  it('envia presença explícita de campos nulos e versão na revisão dos cadastros', () => {
    const product = { expectedVersion: 4, name: 'Sal mineral', code: null, category: null, status: 'INACTIVE' as const };
    api.patchProduct('p', product).subscribe(); verify('products/p', 'PATCH', product);
    const location = { expectedVersion: 2, name: 'Depósito', code: null, status: 'ACTIVE' as const };
    api.patchLocation('l', location).subscribe(); verify('locations/l', 'PATCH', location);
  });
  it('cadastra unidade apenas na criação e preserva UUID de produto e depósito', () => {
    const product = { id: 'p', name: 'Ração', code: null, category: 'Alimentação', baseUnit: 'KG' as const };
    api.createProduct(product).subscribe(); verify('products', 'POST', product);
    const location = { id: 'l', name: 'Galpão', code: null };
    api.createLocation(location).subscribe(); verify('locations', 'POST', location);
  });
  it('consulta saldo por filtros e paginação, inclusive estoque contextual do depósito', () => {
    api.stock({ productId: 'p', locationId: 'l', search: 'sal & ração', onlyPositive: false, page: 3 }).subscribe();
    const request = http.expectOne(r => r.url.startsWith('/api/v1/inventory/stock?'));
    const url = new URL(request.request.url, 'http://localhost');
    expect(Object.fromEntries(url.searchParams)).toEqual({ productId: 'p', locationId: 'l', search: 'sal & ração', onlyPositive: 'false', page: '3', size: '20' });
    expect(request.request.context.get(REQUIRES_TENANT_CONTEXT)).toBe(true); request.flush({});
    api.locationStock('l', 2).subscribe(); verify('locations/l/stock?page=2&size=20', 'GET');
  });
  it('filtra histórico com período inclusivo e abre detalhe da movimentação', () => {
    api.movements({ type: 'ISSUE', from: '2026-09-01', to: '2026-09-28', page: 1 }).subscribe();
    verify('movements?type=ISSUE&from=2026-09-01&to=2026-09-28&page=1&size=20', 'GET');
    api.movement('m').subscribe(); verify('movements/m', 'GET');
  });
  it('preserva identidade de operação e decimal sem converter em float no comando', () => {
    const body = { operationId: 'op', type: 'TRANSFER' as const, productId: 'p', sourceLocationId: 'a', destinationLocationId: 'b', quantity: '9007199254740.123456', occurredOn: '2026-09-28', notes: 'Transferência' };
    api.move(body).subscribe();
    const request = http.expectOne('/api/v1/inventory/movements');
    expect(request.request.method).toBe('POST');
    expect(request.request.context.get(REQUIRES_TENANT_CONTEXT)).toBe(true);
    expect(request.request.headers.get('Content-Type')).toBe('application/json');
    expect(request.request.body).toContain('"quantity":9007199254740.123456');
    expect(request.request.body).not.toContain('"quantity":"');
    expect(request.request.body).toContain('"operationId":"op"');
    request.flush({});
  });
});
