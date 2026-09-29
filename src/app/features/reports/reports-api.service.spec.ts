import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { REQUIRES_TENANT_CONTEXT } from '../../core/api/api-client.service';
import { ReportsApi } from './reports-api.service';
import { describe, expect, it } from 'vitest';
import { convertToParamMap } from '@angular/router';
import { defaultFilters, parseFilters, periodIssue } from './reports-page.component';
import { reportQuery } from './reports-api.service';

describe('mapeamento dos relatórios', () => {
  it('envia somente filtros aceitos pelo relatório ativo', () => {
    const query = reportQuery({
      ...defaultFilters('movements'),
      animalId: '31fd93ce-60ef-4e30-bcea-94315f685b27',
      sourcePaddockId: '03803f1a-0f0e-4bb2-acd1-dfb292ab5ac4',
      direction: 'IN',
      treatmentType: 'VACCINATION',
    });
    expect(query).toContain('animalId=31fd93ce-60ef-4e30-bcea-94315f685b27');
    expect(query).toContain('sourcePaddockId=03803f1a-0f0e-4bb2-acd1-dfb292ab5ac4');
    expect(query).not.toContain('direction');
    expect(query).not.toContain('treatmentType');
  });
  it('não força período no snapshot da posição atual', () => {
    const query = reportQuery({ ...defaultFilters('herd-position'), sex: 'FEMALE' });
    expect(query).toBe('sex=FEMALE&page=0&size=20');
  });
  it('mapeia motherId no relatório reprodutivo', () => {
    const query = reportQuery({
      ...defaultFilters('reproduction'),
      animalId: '31fd93ce-60ef-4e30-bcea-94315f685b27',
      pregnancyStatus: 'CONFIRMED',
    });
    expect(query).toContain('motherId=31fd93ce-60ef-4e30-bcea-94315f685b27');
    expect(query).toContain('pregnancyStatus=CONFIRMED');
    expect(query).not.toContain('animalId=');
  });
});

describe('período dos relatórios', () => {
  it('rejeita datas inexistentes e aceita o dia bissexto válido', () => {
    expect(periodIssue('2026-02-30', '2026-03-01')).toBe('Datas inválidas.');
    expect(periodIssue('2025-02-29', '2025-03-01')).toBe('Datas inválidas.');
    expect(periodIssue('2024-02-29', '2024-03-01')).toBe('');
  });
  it('aceita datas inclusivas e rejeita ordem invertida', () => {
    expect(periodIssue('2026-09-01', '2026-09-17')).toBe('');
    expect(periodIssue('2026-09-18', '2026-09-17')).toContain('inicial');
  });
  it('respeita o limite real de 3.650 dias do backend', () => {
    expect(periodIssue('2016-09-21', '2026-09-17')).toBe('');
    expect(periodIssue('2016-09-19', '2026-09-17')).toContain('3.650');
  });
  it('restaura estado válido da URL e sanitiza valores inválidos', () => {
    const filters = parseFilters(
      convertToParamMap({
        report: 'health',
        from: '2026-09-01',
        to: '2026-09-17',
        treatmentType: 'VACCINATION',
        animalId: '31fd93ce-60ef-4e30-bcea-94315f685b27',
        page: '2',
        size: '50',
      }),
    );
    expect(filters).toMatchObject({
      report: 'health',
      from: '2026-09-01',
      to: '2026-09-17',
      treatmentType: 'VACCINATION',
      page: 2,
      size: 50,
    });
    expect(
      parseFilters(convertToParamMap({ report: 'finance', animalId: 'inválido', page: '-1' })),
    ).toMatchObject({ report: 'herd-position', animalId: '', page: 0 });
  });
  it('preserva os dígitos dos valores de venda recebidos no relatório', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ReportsApi],
    });
    const api = TestBed.inject(ReportsApi);
    const http = TestBed.inject(HttpTestingController);
    let result: ReturnType<typeof api.load> extends import('rxjs').Observable<infer T> ? T : never =
      undefined as never;
    api.load(defaultFilters('lifecycle')).subscribe((value) => (result = value));
    const req = http.expectOne((r) => r.url.startsWith('/api/v1/herd/reports/lifecycle?'));
    expect(req.request.method).toBe('GET');
    expect(req.request.context.get(REQUIRES_TENANT_CONTEXT)).toBe(true);
    req.flush(
      '{"summary":{"countsByEventType":{"SOLD":1},"totalAffectedAnimals":1,"totalSaleAmount":99999999999999999.99,"averageSaleAmount":99999999999999999.99,"salesWithAmount":1,"deathsByReason":{},"salesByChannel":{}},"items":[{"id":"e1","animal":{"id":"a1","identification":"A1","name":null},"event":"SOLD","occurredOn":"2026-09-29","recordedAt":"2026-09-29T10:00:00Z","notes":null,"deathReason":null,"saleChannel":"DIRECT","saleBuyer":null,"saleAmount":99999999999999999.99}],"page":0,"size":20,"totalElements":1,"totalPages":1}',
    );
    expect((result as import('./reports.models').LifecyclePage).summary.totalSaleAmount).toBe(
      '99999999999999999.99',
    );
    expect((result as import('./reports.models').LifecyclePage).items[0].saleAmount).toBe(
      '99999999999999999.99',
    );
    http.verify();
  });
});
