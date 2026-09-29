import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, Subject, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ContextStore } from '../../core/context/context.store';
import { ToastService } from '../../design-system/feedback/feedback';
import { HerdApi } from './herd-api.service';
import { ParityApi } from './parity-api.service';
import { AgendaPageComponent } from './agenda-page.component';
import { HealthPageComponent } from './health-page.component';
import { PlannerItem } from './herd-operations.models';
import { Animal, Page } from './herd.models';

HTMLDialogElement.prototype.showModal ??= function () {
  this.open = true;
};
HTMLDialogElement.prototype.close ??= function () {
  this.open = false;
};
const item: PlannerItem = {
  id: 'task1',
  operationId: 'op',
  type: 'GENERAL',
  title: 'Avaliar matrizes',
  notes: null,
  scheduledFor: '2026-09-27',
  status: 'OPEN',
  animalId: null,
  groupId: '22222222-2222-4222-8222-222222222222',
  version: 4,
  createdAt: '2026-09-27T12:00:00Z',
  updatedAt: '2026-09-27T12:00:00Z',
  completedAt: null,
  cancelledAt: null,
  replay: false,
};
const page = { items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 };
async function setup(component: typeof AgendaPageComponent | typeof HealthPageComponent) {
  const context = {
    selectedFarm: signal({ farmId: 'farm1', farmName: 'F1' }),
    contextVersion: signal(0),
    transitionPending: signal(false),
    role: signal('OWNER'),
  };
  const api = {
    animals: vi.fn((): Observable<Page<Animal>> => of(page)),
    agenda: vi.fn(() => of(page)),
    planner: vi.fn(() => of(page)),
    pendingWork: vi.fn(() => of(page)),
    plannerItem: vi.fn((): Observable<PlannerItem> => of(item)),
    createPlanner: vi.fn(() => of(item)),
    correctPlanner: vi.fn(() => of(item)),
    completePlanner: vi.fn(() => of({ ...item, status: 'COMPLETED' })),
    cancelPlanner: vi.fn(() => of({ ...item, status: 'CANCELLED' })),
    animal: vi.fn((_id: string) =>
      of({
        id: 'a1',
        identification: 'A1',
        name: null,
        birthDate: null,
        sex: 'FEMALE',
        status: 'ACTIVE',
        version: 2,
        paddock: null,
      }),
    ),
    healthReport: vi.fn(() =>
      of({
        ...page,
        summary: { treatmentsCount: 0, animalsTreated: 0, countsByTreatmentType: {} },
      }),
    ),
    recordHealth: vi.fn(() => of({ operationId: 'op', replayed: false, animals: [] })),
  };
  const parity = {
    groups: vi.fn(() => of({ ...page, items: [], totalElements: 0 })),
    group: vi.fn(() => of({ id: 'group1', name: 'Matrizes' })),
  };
  await TestBed.configureTestingModule({
    imports: [component],
    providers: [
      provideRouter([]),
      { provide: ContextStore, useValue: context },
      { provide: HerdApi, useValue: api },
      { provide: ParityApi, useValue: parity },
      { provide: ToastService, useValue: { show: vi.fn() } },
    ],
  }).compileComponents();
  return { context, api };
}
describe('Grupo e isolamento da agenda', () => {
  it('não apresenta ausência de pendências quando a consulta falha', async () => {
    const { api } = await setup(AgendaPageComponent);
    api.pendingWork.mockImplementation(() => throwError(() => new Error('Indisponível')));
    const fixture = TestBed.createComponent(AgendaPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.selectTab('pending');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Não foi possível carregar as pendências');
    expect(fixture.nativeElement.textContent).not.toContain('Nenhuma pendência');
  });
  it('preserva groupId ao corrigir uma atividade e respeita expectedVersion', async () => {
    const { api } = await setup(AgendaPageComponent);
    const fixture = TestBed.createComponent(AgendaPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.openItem(item.id, 'edit');
    fixture.componentInstance.title = 'Avaliar matrizes revisadas';
    fixture.componentInstance.prepare();
    fixture.componentInstance.save();
    expect(api.correctPlanner).toHaveBeenCalledWith(
      'task1',
      expect.objectContaining({ groupId: item.groupId, expectedVersion: 4 }),
    );
  });
  it('envia filtro de grupo apenas para planner-items', async () => {
    const { api } = await setup(AgendaPageComponent);
    const fixture = TestBed.createComponent(AgendaPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.selectTab('planner');
    fixture.componentInstance.filterGroupId = item.groupId!;
    fixture.componentInstance.status = 'COMPLETED';
    fixture.componentInstance.applyFilters();
    fixture.componentInstance.changePage(2);
    expect(api.planner).toHaveBeenLastCalledWith(
      expect.objectContaining({
        groupId: item.groupId,
        status: 'COMPLETED',
        page: 2,
      }),
    );
    expect(api.agenda).not.toHaveBeenCalledWith(expect.objectContaining({ groupId: item.groupId }));
  });
  it('não reabre confirmação da fazenda anterior após troca', async () => {
    const { api, context } = await setup(AgendaPageComponent);
    const response = new Subject<PlannerItem>();
    api.plannerItem.mockReturnValue(response);
    const fixture = TestBed.createComponent(AgendaPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.openItem('task1', 'complete');
    context.contextVersion.update((v) => v + 1);
    fixture.detectChanges();
    response.next(item);
    expect(fixture.componentInstance.editing()).toBeNull();
    expect(fixture.componentInstance.editorOpen()).toBe(false);
    expect(api.completePlanner).not.toHaveBeenCalled();
  });
});
describe('Saúde e contexto de fazenda', () => {
  it('descarta seletor de animais que responde após troca', async () => {
    const { api, context } = await setup(HealthPageComponent);
    const response = new Subject<Page<Animal>>();
    api.animals.mockReturnValue(response);
    const fixture = TestBed.createComponent(HealthPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.openCreate();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(response.observed).toBe(true);
    context.contextVersion.update((v) => v + 1);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(response.observed).toBe(false);
    response.next({
      ...page,
      items: [
        {
          id: 'old',
          identification: 'Antigo',
          name: null,
          birthDate: null,
          sex: 'FEMALE',
          status: 'ACTIVE',
          version: 1,
          paddock: null,
        },
      ],
    });
    expect(fixture.componentInstance.animals()).toEqual([]);
    expect(fixture.componentInstance.creating()).toBe(false);
  });
  it('consulta e registra aftosa pelo código histórico, sem prazo automático', async () => {
    const { api } = await setup(HealthPageComponent);
    const fixture = TestBed.createComponent(HealthPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance;
    component.filterProcedure = 'FOOT_AND_MOUTH_DISEASE';
    component.reload();
    expect(api.healthReport).toHaveBeenLastCalledWith(
      expect.objectContaining({ procedureCode: 'FOOT_AND_MOUTH_DISEASE' }),
    );
    component.openCreate();
    component.animals.set([
      {
        id: 'a1',
        identification: 'A1',
        name: null,
        birthDate: null,
        sex: 'FEMALE',
        status: 'ACTIVE',
        version: 2,
        paddock: null,
      },
    ]);
    component.animalId = 'a1';
    component.procedureCode = 'FOOT_AND_MOUTH_DISEASE';
    component.nextDueOn = '';
    component.prepare();
    component.save();
    expect(api.recordHealth).toHaveBeenCalledWith(
      'a1',
      expect.objectContaining({ procedureCode: 'FOOT_AND_MOUTH_DISEASE', nextDueOn: null }),
    );
  });
});
