import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { REQUIRES_TENANT_CONTEXT } from '../../core/api/api-client.service';
import { FinanceApi } from './finance-api.service';

describe('Contratos financeiros no navegador', () => {
  let api: FinanceApi, http: HttpTestingController;
  beforeEach(() => { TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] }); api = TestBed.inject(FinanceApi); http = TestBed.inject(HttpTestingController); });
  afterEach(() => http.verify());
  const category = { expectedVersion: 5, name: 'Nutrição', nameSet: true as const, code: null, codeSet: true as const, kind: 'EXPENSE' as const, kindSet: true as const, status: 'INACTIVE' as const, statusSet: true as const };
  function request(path: string, method: string) { const r = http.expectOne('/api/v1/finance/' + path); expect(r.request.method).toBe(method); expect(r.request.context.get(REQUIRES_TENANT_CONTEXT)).toBe(true); return r; }
  it('consulta e revisa categorias com versão e presença explícita para limpar código', () => {
    api.categories().subscribe(); request('categories', 'GET').flush([]);
    api.category('c/1').subscribe(); request('categories/c%2F1', 'GET').flush({});
    api.createCategory({ name: 'Nutrição', code: null, kind: 'EXPENSE' }).subscribe(); const r = request('categories', 'POST'); expect(r.request.body).toEqual({ name: 'Nutrição', code: null, kind: 'EXPENSE' }); r.flush({});
  });
  it('corrige categoria sem descartar flags de presença e versão', () => { api.patchCategory('c', category).subscribe(); const r = request('categories/c', 'PATCH'); expect(r.request.body).toEqual(category); r.flush({}); });
  it('envia filtros e paginação por vencimento, sem tenant no query string', () => {
    api.entries({ dueFrom: '2026-09-01', dueTo: '2026-09-30', type: 'EXPENSE', status: 'PENDING', categoryId: 'c', search: 'sal & ração', page: 2 }).subscribe();
    const r = http.expectOne(x => x.url.startsWith('/api/v1/finance/entries?')); const params = Object.fromEntries(new URL(r.request.url, 'http://localhost').searchParams);
    expect(params).toEqual({ dueFrom: '2026-09-01', dueTo: '2026-09-30', type: 'EXPENSE', status: 'PENDING', categoryId: 'c', search: 'sal & ração', page: '2', size: '20' }); expect(r.request.context.get(REQUIRES_TENANT_CONTEXT)).toBe(true); r.flush('{}');
  });
  it('preserva centavos no comando e na resposta, inclusive acima do inteiro seguro', () => {
    let amount: unknown;
    api.create({ operationId: 'op', type: 'INCOME', categoryId: 'c', description: 'Receita', amount: '9007199254740993.12', dueOn: '2026-09-30', notes: null }).subscribe(e => amount = e.amount);
    const r = request('entries', 'POST'); expect(r.request.body).toContain('"amount":9007199254740993.12'); expect(r.request.headers.get('Content-Type')).toBe('application/json');
    r.flush('{"amount":9007199254740993.12}'); expect(amount).toBe('9007199254740993.12');
  });
  it('corrige somente campos permitidos com flags e valor numérico exato', () => {
    api.patch('e', { expectedVersion: 7, categoryId: 'c', categoryIdSet: true, description: 'Compra', descriptionSet: true, amount: '125.50', amountSet: true, dueOn: '2026-09-30', dueOnSet: true, notes: null, notesSet: true }).subscribe();
    const r = request('entries/e', 'PATCH'); expect(r.request.body).toContain('"amount":125.50'); expect(JSON.parse(r.request.body)).toMatchObject({ expectedVersion: 7, notes: null, notesSet: true }); expect(JSON.parse(r.request.body)).not.toHaveProperty('type'); r.flush('{}');
  });
  it('liquida e cancela com operação própria e versão, e consulta histórico individual', () => {
    const settlement = { operationId: 'settle-op', expectedVersion: 2, settledOn: '2026-09-28' };
    api.settle('e', settlement).subscribe(); const a = request('entries/e/settlement', 'POST'); expect(a.request.body).toEqual(settlement); a.flush('{}');
    const cancellation = { operationId: 'cancel-op', expectedVersion: 3, reason: 'Duplicidade' };
    api.cancel('e', cancellation).subscribe(); const b = request('entries/e/cancellation', 'POST'); expect(b.request.body).toEqual(cancellation); b.flush('{}');
    api.entry('e/1').subscribe(); request('entries/e%2F1', 'GET').flush('{}'); api.history('e').subscribe(); request('entries/e/history', 'GET').flush('[]');
  });
  it('consulta os dois resumos calculados pelo backend usando o período requerido', () => {
    api.summary('2026-09-01', '2026-09-30', 'c').subscribe(); request('summary?from=2026-09-01&to=2026-09-30&categoryId=c', 'GET').flush('{}');
    api.categoryTotals('2026-09-01', '2026-09-30').subscribe(); request('summary/by-category?from=2026-09-01&to=2026-09-30', 'GET').flush('[]');
  });
});
