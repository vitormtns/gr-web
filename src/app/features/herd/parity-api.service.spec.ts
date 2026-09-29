import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { REQUIRES_TENANT_CONTEXT } from '../../core/api/api-client.service';
import { ParityApi } from './parity-api.service';
import { emptyGroupRules } from './parity.models';

describe('Contratos públicos de paridade', () => {
  let api: ParityApi, http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ParityApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  function request(url: string, method: string, body?: object) {
    const req = http.expectOne('/api/v1/herd/' + url);
    expect(req.request.method).toBe(method);
    expect(req.request.context.get(REQUIRES_TENANT_CONTEXT)).toBe(true);
    if (body) expect(req.request.body).toEqual(body);
    req.flush({});
  }
  it('preserva UUIDs e recibo de importação em uma chamada atômica', () => {
    const body = {
      operationId: 'op',
      animals: [
        {
          id: 'a',
          identification: 'A1',
          name: null,
          sex: 'FEMALE' as const,
          status: 'ACTIVE' as const,
          birthDate: null,
          motherIdentification: null,
        },
      ],
    };
    api.importAnimals(body).subscribe();
    request('animals/imports', 'POST', body);
  });
  it('envia versões das mães pelo campo id, sem animalId', () => {
    const body = {
      operationId: 'op',
      serviceType: 'INSEMINATION' as const,
      serviceOn: '2026-09-01',
      sireReference: null,
      expectedCalvingOn: null,
      notes: null,
      mothers: [{ id: 'a', expectedVersion: 7 }],
    };
    api.breedBatch(body).subscribe();
    request('breedings/batch', 'POST', body);
  });
  it('envia remoção materna explícita e observação auditada', () => {
    const mother = { operationId: 'op', expectedVersion: 2, motherId: null };
    api.correctMother('a/1', mother).subscribe();
    request('animals/a%2F1/mother', 'PUT', mother);
    const note = {
      operationId: 'op2',
      expectedVersion: 3,
      occurredOn: '2026-09-01',
      notes: 'Observação',
    };
    api.note('a', note).subscribe();
    request('animals/a/notes', 'POST', note);
  });
  it('não perde body de versão na remoção de membro', () => {
    api.membership('g', 'a', 7, false).subscribe();
    request('groups/g/animals/a', 'DELETE', { expectedVersion: 7 });
    api.membership('g', 'a', 8, true).subscribe();
    request('groups/g/animals/a', 'PUT', { expectedVersion: 8 });
  });
  it('diferencia criação, substituição e arquivamento de grupo', () => {
    const create = { id: 'g', name: 'Matrizes', kind: 'MANUAL' as const, rules: emptyGroupRules() };
    api.createGroup(create).subscribe();
    request('groups', 'POST', create);
    const update = { name: 'Novilhas', expectedVersion: 1, rules: emptyGroupRules() };
    api.updateGroup('g', update).subscribe();
    request('groups/g', 'PUT', update);
    api.archiveGroup('g', 2).subscribe();
    request('groups/g/archive', 'POST', { expectedVersion: 2 });
  });
  it('usa paginação real de grupos e leite e referência de membros', () => {
    api.groups(3).subscribe();
    request('groups?page=3&size=20', 'GET');
    api.groupAnimals('g', 2, '2026-09-01').subscribe();
    request('groups/g/animals?page=2&size=20&referenceDate=2026-09-01', 'GET');
    api.milkHistory('a', 4).subscribe();
    request('animals/a/milk-records?page=4&size=20', 'GET');
  });
  it('envia litros numéricos e consome indicadores sem recalcular', () => {
    const body = {
      operationId: 'op',
      expectedVersion: 4,
      recordedOn: '2026-09-01',
      liters: 12.125,
      session: 'MORNING' as const,
      notes: null,
    };
    api.recordMilk('a', body).subscribe();
    request('animals/a/milk-records', 'POST', body);
    api.milkSummary('a', '2026-09-01').subscribe();
    request('animals/a/milk-summary?referenceDate=2026-09-01', 'GET');
    api.milkOverview('2026-09-01').subscribe();
    request('milk/overview?referenceDate=2026-09-01', 'GET');
  });
  it('distingue saldo atual, histórico, fluxos e cobertura', () => {
    api.ageSexBalance('2026-09-01', false).subscribe();
    request('reports/current-age-sex-balance?referenceDate=2026-09-01', 'GET');
    api.ageSexBalance('2026-09-01', true).subscribe();
    request('reports/historical-age-sex-balance?asOf=2026-09-01', 'GET');
    api.reconciliation('2026-09-01', '2026-09-27').subscribe();
    request('reports/period-reconciliation?from=2026-09-01&to=2026-09-27', 'GET');
    api.coverage('FOOT_AND_MOUTH_DISEASE', '2026-09-01').subscribe();
    request(
      'reports/current-procedure-coverage?procedureCode=FOOT_AND_MOUTH_DISEASE&referenceDate=2026-09-01',
      'GET',
    );
  });
  it('preserva detalhes comerciais e motivo sem criar lançamento financeiro', () => {
    const sale = {
      operationId: 'op',
      expectedVersion: 1,
      occurredOn: '2026-09-01',
      notes: null,
      saleChannel: 'AUCTION' as const,
      saleBuyer: 'Comprador',
      saleAmount: 3200.5,
    };
    api.lifecycle('a', 'sale', sale).subscribe();
    request('animals/a/sale', 'POST', sale);
    const death = {
      operationId: 'op2',
      expectedVersion: 2,
      occurredOn: '2026-09-01',
      notes: null,
      deathReason: 'Motivo registrado',
    };
    api.lifecycle('a', 'death', death).subscribe();
    request('animals/a/death', 'POST', death);
  });
  it('envia o decimal de venda como número JSON exato e mantém o contexto', () => {
    const body =
      '{"operationId":"op","expectedVersion":2,"occurredOn":"2026-09-29","notes":null,"saleAmount":99999999999999999.99}';
    api.lifecycleExact('a', body).subscribe();
    const req = http.expectOne('/api/v1/herd/animals/a/sale');
    expect(req.request.body).toBe(body);
    expect(req.request.headers.get('Content-Type')).toBe('application/json');
    expect(req.request.context.get(REQUIRES_TENANT_CONTEXT)).toBe(true);
    req.flush('{}');
  });
});
