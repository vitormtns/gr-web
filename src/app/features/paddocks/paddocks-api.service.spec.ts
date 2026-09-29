import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { REQUIRES_TENANT_CONTEXT } from '../../core/api/api-client.service';
import { PaddocksApi } from './paddocks-api.service';

describe('Contratos de piquetes no portal', () => {
  let api: PaddocksApi, http: HttpTestingController;
  beforeEach(() => { TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] }); api = TestBed.inject(PaddocksApi); http = TestBed.inject(HttpTestingController); });
  afterEach(() => http.verify());
  function request(path: string, method = 'GET') { const r = http.expectOne('/api/v1/herd/paddocks' + path); expect(r.request.method).toBe(method); expect(r.request.context.get(REQUIRES_TENANT_CONTEXT)).toBe(true); return r; }
  it('consulta situações, busca e página sem identificador alternativo de fazenda', () => {
    api.list({ status: 'INACTIVE', search: 'pasto & água', page: 2 }).subscribe(); request('?status=INACTIVE&search=pasto+%26+%C3%A1gua&page=2&size=20').flush({});
    api.get('p/1').subscribe(); request('/p%2F1').flush({});
  });
  it('cria UUID antecipado e revisa com versão e limpeza explícita do código', () => {
    const creation = { id: 'p', name: 'Pasto norte', code: null }; api.create(creation).subscribe(); const a = request('', 'POST'); expect(a.request.body).toEqual(creation); a.flush({});
    const patch = { expectedVersion: 8, name: 'Pasto norte', code: null, status: 'INACTIVE' as const }; api.patch('p', patch).subscribe(); const b = request('/p', 'PATCH'); expect(b.request.body).toEqual(patch); b.flush({});
  });
  it('consulta ocupação, animais e histórico em páginas independentes', () => {
    api.occupancy('p').subscribe(); request('/p/occupancy').flush({}); api.animals('p', 3).subscribe(); request('/p/animals?page=3&size=20').flush({}); api.movements('p', 4).subscribe(); request('/p/movements?page=4&size=20').flush({});
  });
});
