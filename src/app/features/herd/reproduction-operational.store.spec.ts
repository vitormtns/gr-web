import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ContextStore } from '../../core/context/context.store';
import { HerdApi } from './herd-api.service';
import { ReproductionOperationalStore } from './reproduction-operational.store';
import type { AgendaPage, ReproductionReport } from './herd-operations.models';

const empty = { items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 };
const report: ReproductionReport = {
  ...empty,
  summary: { servicesRecorded: 8, pregnanciesConfirmed: 4, pregnanciesTerminated: 2,
    calvings: 3, calvesBorn: 3, openPossiblePregnancies: 5, openConfirmedPregnancies: 6 },
};
function setup() {
  const context = {
    contextVersion: signal(0), transitionPending: signal(false),
    selectedFarm: signal<{ farmId: string } | null>({ farmId: 'farm-a' }),
  };
  const api = {
    reproductionReport: vi.fn(() => of(report)),
    pendingWork: vi.fn(() => of(empty)),
    planner: vi.fn(() => of(empty)),
    agenda: vi.fn((_filter: object) => of(empty as AgendaPage)),
  };
  TestBed.configureTestingModule({ providers: [ReproductionOperationalStore,
    { provide: ContextStore, useValue: context }, { provide: HerdApi, useValue: api }] });
  const store = TestBed.inject(ReproductionOperationalStore);
  TestBed.flushEffects();
  return { store, context, api };
}

describe('leitura operacional reprodutiva', () => {
  it('consulta o resumo real sem filtros do histórico e mantém os totais recebidos', () => {
    const { store, api } = setup();
    expect(api.reproductionReport).toHaveBeenCalledWith({ page: 0 });
    expect(store.overview().value?.summary).toEqual(report.summary);
  });

  it('prioriza partos atrasados, consulta próximos e rotula tarefas de diagnóstico como planejadas', () => {
    const { store, api } = setup();
    expect(api.pendingWork).toHaveBeenCalledWith({ type: 'CALVING_OVERDUE', page: 0 });
    expect(api.pendingWork).toHaveBeenCalledWith({ type: 'CALVING_UPCOMING', page: 0 });
    expect(api.planner).toHaveBeenCalledWith(expect.objectContaining({ type: 'PREGNANCY_CHECK', status: 'OPEN' }));
    expect(store.attention().value?.plannedChecks).toBe(0);
    expect(store.overview().value?.summary.openPossiblePregnancies).toBe(5);
  });

  it('percorre todas as páginas da agenda e conserva apenas marcos reprodutivos', () => {
    const { store, api } = setup();
    const day = store.today;
    api.agenda.mockImplementation(({ page }: { page?: number }) => of({
      items: [{ source: 'MANUAL', kind: page ? 'CALVING' : 'VACCINATION', operationalDate: day,
        stableId: String(page || 0), animalId: null, summary: 'Marco real', identification: null,
        name: null, plannerItemId: null, pendingWorkType: null, pregnancyId: null, status: 'OPEN' }],
      page: page || 0, size: 1, totalElements: 2, totalPages: 2,
    } as AgendaPage));
    store.loadMilestones();
    expect(api.agenda).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }));
    expect(store.milestones().value?.map((item) => item.kind)).toEqual(['CALVING']);
  });

  it('cancela respostas antigas e limpa todos os estados na troca de fazenda', () => {
    const { store, context, api } = setup();
    const pending = new Subject<ReproductionReport>();
    api.reproductionReport.mockReturnValue(pending);
    store.loadOverview();
    expect(pending.observed).toBe(true);
    context.transitionPending.set(true);
    context.selectedFarm.set(null);
    context.contextVersion.update((version) => version + 1);
    TestBed.flushEffects();
    expect(pending.observed).toBe(false);
    expect(store.overview().status).toBe('idle');
    expect(store.attention().status).toBe('idle');
    expect(store.milestones().status).toBe('idle');
    expect(store.detailType()).toBe(null);
  });
});
