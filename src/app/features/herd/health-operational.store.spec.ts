import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, of, Subject, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ContextStore } from '../../core/context/context.store';
import { DashboardApiClient } from '../home/dashboard-api.service';
import { HerdApi } from './herd-api.service';
import { ParityApi } from './parity-api.service';
import type { PendingWorkItem, PendingWorkPage } from './herd-operations.models';
import { HealthOperationalStore } from './health-operational.store';

const page = (
  type: PendingWorkItem['type'],
  items: PendingWorkItem[] = [],
  pageNumber = 0,
  totalPages = 1,
): PendingWorkPage => ({
  items,
  page: pageNumber,
  size: 20,
  totalElements: items.length || (totalPages > 1 ? 21 : 0),
  totalPages,
});
const item = (type: PendingWorkItem['type'], overdue = 0): PendingWorkItem => ({
  type,
  animalId: type,
  identification: type,
  name: null,
  farmId: 'farm-1',
  dueOn: '2026-09-30',
  expectedOn: null,
  daysOverdue: overdue,
  daysUntil: overdue ? -overdue : 0,
  pregnancyId: null,
  treatmentType: null,
  lastPerformedOn: null,
  lastWeightOn: null,
});
const attention = (
  summary: Partial<
    Record<'vaccinationDue' | 'dewormingDue' | 'brucellosisDue' | 'brucellosisWindowMissed', number>
  > = {},
) => ({
  referenceDate: '2026-09-30',
  preview: [],
  summary: {
    vaccinationDue: 0,
    dewormingDue: 0,
    brucellosisDue: 0,
    brucellosisWindowMissed: 0,
    weighingDue: 0,
    calvingUpcoming: 0,
    calvingOverdue: 0,
    plannerOpen: 0,
    plannerOverdue: 0,
    ...summary,
  },
});
const coverage = (code: 'BRUCELLOSIS' | 'FOOT_AND_MOUTH_DISEASE') => ({
  procedureCode: code,
  referenceDate: '2026-09-30',
  positionSemantics: 'CURRENT_STATE_AGED_AT_REFERENCE_EFFECTIVE_RECORDED_TREATMENTS',
  totalActiveAnimals: 5,
  withRecordedTreatment: 2,
  withoutRecordedTreatment: 3,
  unknownBirthDate: 0,
  cells: [],
});

describe('HealthOperationalStore', () => {
  const setup = () => {
    const context = {
      selectedFarm: signal({ farmId: 'farm-1' }),
      transitionPending: signal(false),
      contextVersion: signal(0),
    };
    const api = {
      pendingWork: vi.fn((filters: { type?: string; page?: number }): Observable<PendingWorkPage> =>
        of(page((filters.type || 'VACCINATION_DUE') as PendingWorkItem['type'])),
      ),
    };
    const dashboard = {
      attention: vi.fn(() => of(attention())),
      agendaPage: vi.fn((_from: string, _to: string) =>
        of({ items: [], page: 0, size: 100, totalElements: 0, totalPages: 1 }),
      ),
    };
    const parity = {
      coverage: vi.fn((code: 'BRUCELLOSIS' | 'FOOT_AND_MOUTH_DISEASE') => of(coverage(code))),
    };
    TestBed.configureTestingModule({
      providers: [
        HealthOperationalStore,
        { provide: ContextStore, useValue: context },
        { provide: HerdApi, useValue: api },
        { provide: DashboardApiClient, useValue: dashboard },
        { provide: ParityApi, useValue: parity },
      ],
    });
    const store = TestBed.inject(HealthOperationalStore);
    TestBed.tick();
    return { store, api, dashboard, parity, context };
  };

  it('usa contagens atuais separadas e classifica o item crítico antes dos demais', () => {
    const { store, dashboard, api } = setup();
    dashboard.attention.mockReturnValue(
      of(
        attention({
          vaccinationDue: 8,
          dewormingDue: 1,
          brucellosisDue: 2,
          brucellosisWindowMissed: 1,
        }),
      ),
    );
    api.pendingWork.mockImplementation((filters: { type?: string }) =>
      of(
        page(filters.type as PendingWorkItem['type'], [
          item(filters.type as PendingWorkItem['type'], filters.type === 'VACCINATION_DUE' ? 2 : 0),
        ]),
      ),
    );
    store.loadAttention();
    expect(store.attention().value?.summary.vaccinationDue).toBe(8);
    expect(store.samples().value?.[0].type).toBe('BRUCELLOSIS_WINDOW_MISSED');
    expect(api.pendingWork).toHaveBeenCalledWith({ type: 'BRUCELLOSIS_WINDOW_MISSED', page: 0 });
  });

  it('consulta agenda em uma única janela e isola falha de cobertura', () => {
    const { store, dashboard, parity } = setup();
    const [from, to] = dashboard.agendaPage.mock.calls[0];
    expect(
      Math.round(
        (new Date(to + 'T12:00:00').getTime() - new Date(from + 'T12:00:00').getTime()) / 86400000,
      ),
    ).toBe(6);
    parity.coverage.mockImplementation((code: string) =>
      code === 'BRUCELLOSIS'
        ? throwError(() => Error('Falha'))
        : of(coverage('FOOT_AND_MOUTH_DISEASE')),
    );
    store.loadBrucCoverage();
    expect(store.brucCoverage().status).toBe('error');
    expect(store.aftosaCoverage().status).toBe('ready');
    expect(store.pending().status).toBe('idle');
    store.loadPending();
    expect(store.pending().status).toBe('ready');
    expect(store.agenda().status).toBe('ready');
  });

  it('abre detalhe sob demanda e pagina no servidor', () => {
    const { store, api } = setup();
    api.pendingWork.mockImplementation((filters: { type?: string; page?: number }) =>
      of(
        page(
          filters.type as PendingWorkItem['type'],
          [item('VACCINATION_DUE')],
          filters.page || 0,
          2,
        ),
      ),
    );
    const before = api.pendingWork.mock.calls.length;
    store.openDetail('VACCINATION_DUE');
    expect(api.pendingWork).toHaveBeenCalledTimes(before + 1);
    store.loadDetail(1);
    expect(api.pendingWork).toHaveBeenLastCalledWith({ type: 'VACCINATION_DUE', page: 1 });
    expect(store.detail().value?.page).toBe(1);
  });

  it('cancela resposta antiga e fecha detalhe ao trocar fazenda', () => {
    const { store, api, context } = setup();
    const pending = new Subject<PendingWorkPage>();
    api.pendingWork.mockReturnValueOnce(pending);
    store.openDetail('DEWORMING_DUE');
    expect(pending.observed).toBe(true);
    context.transitionPending.set(true);
    context.contextVersion.update((version) => version + 1);
    TestBed.tick();
    expect(pending.observed).toBe(false);
    expect(store.detailType()).toBeNull();
    expect(store.detail().value).toBeNull();
  });
});
