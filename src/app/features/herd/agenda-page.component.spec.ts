import { Component, input, output, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AppError, MembershipRole } from '../../core/api/api.models';
import { ContextStore } from '../../core/context/context.store';
import { ToastService } from '../../design-system/feedback/feedback';
import { AnimalPickerComponent } from './animal-picker.component';
import { GroupPickerComponent } from './group-picker.component';
import { HerdApi } from './herd-api.service';
import { Animal } from './herd.models';
import { AgendaPage, PendingWorkPage, PlannerItem, PlannerPage } from './herd-operations.models';
import { AgendaPageComponent } from './agenda-page.component';
@Component({ selector: 'app-animal-picker', template: '' })
class AnimalPickerStub {
  label = input('');
  disabled = input(false);
  chosen = output<Animal>();
}
@Component({ selector: 'app-group-picker', template: '' })
class GroupPickerStub {
  label = input('');
  disabled = input(false);
  selected = input('');
  chosen = output<string>();
}
HTMLDialogElement.prototype.showModal ??= function () {
  this.open = true;
};
HTMLDialogElement.prototype.close ??= function () {
  this.open = false;
};
const item: PlannerItem = {
  id: 't',
  operationId: null,
  type: 'GENERAL',
  title: 'Conferir rebanho',
  notes: null,
  scheduledFor: '2026-09-29',
  status: 'OPEN',
  animalId: null,
  groupId: null,
  version: 9,
  createdAt: '2026-09-29T13:00:00Z',
  updatedAt: '2026-09-29T13:00:00Z',
  completedAt: null,
  cancelledAt: null,
  replay: false,
};
async function setup(role: MembershipRole = 'OWNER', query: Record<string, string> = {}) {
  const api = {
    agenda: vi.fn((_filters: object): Observable<AgendaPage> =>
      of({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }),
    ),
    pendingWork: vi.fn((_filters: object): Observable<PendingWorkPage> =>
      of({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }),
    ),
    planner: vi.fn((_filters: object): Observable<PlannerPage> =>
      of({ items: [item], page: 0, size: 20, totalElements: 1, totalPages: 1 }),
    ),
    plannerItem: vi.fn((_id: string): Observable<PlannerItem> => of(item)),
    createPlanner: vi.fn((_body: object): Observable<PlannerItem> => of(item)),
    correctPlanner: vi.fn((_id: string, _body: object): Observable<PlannerItem> => of(item)),
    completePlanner: vi.fn((_id: string, _body: object): Observable<PlannerItem> =>
      of({ ...item, status: 'COMPLETED' }),
    ),
    cancelPlanner: vi.fn((_id: string, _body: object): Observable<PlannerItem> =>
      of({ ...item, status: 'CANCELLED' }),
    ),
  };
  const context = {
    contextVersion: signal(0),
    transitionPending: signal(false),
    selectedFarm: signal({ farmId: 's', farmName: 'Origem' }),
    role: signal<MembershipRole | null>(role),
  };
  const toast = { show: vi.fn() };
  await TestBed.configureTestingModule({
    imports: [AgendaPageComponent],
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { queryParamMap: convertToParamMap(query) } },
      },
      { provide: HerdApi, useValue: api },
      { provide: ContextStore, useValue: context },
      { provide: ToastService, useValue: toast },
    ],
  })
    .overrideComponent(AgendaPageComponent, {
      remove: { imports: [AnimalPickerComponent, GroupPickerComponent] },
      add: { imports: [AnimalPickerStub, GroupPickerStub] },
    })
    .compileComponents();
  const fixture = TestBed.createComponent(AgendaPageComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, component: fixture.componentInstance, api, context, toast };
}
describe('Agenda e planejamento completos', () => {
  it.each(['OWNER', 'ADMIN', 'MANAGER', 'OPERATOR'] as MembershipRole[])(
    '%s revisa a criação e registra o comando com UUID estável',
    async (role) => {
      const { component, api } = await setup(role);
      component.openCreate();
      component.title = ' Conferir rebanho ';
      component.save();
      expect(api.createPlanner).not.toHaveBeenCalled();
      component.prepare();
      component.save();
      expect(api.createPlanner).toHaveBeenCalledWith(
        expect.objectContaining({
          operationId: expect.any(String),
          title: 'Conferir rebanho',
          animalId: null,
          groupId: null,
        }),
      );
    },
  );
  it('VIEWER consulta detalhes e não abre alterações nem transições', async () => {
    const { component, api } = await setup('VIEWER');
    component.openItem('t', 'view');
    expect(component.editing()?.version).toBe(9);
    component.closeEditor();
    component.openCreate();
    component.openItem('t', 'edit');
    component.openItem('t', 'cancel');
    component.prepare();
    component.save();
    expect(component.editorOpen()).toBe(false);
    expect(api.createPlanner).not.toHaveBeenCalled();
    expect(api.cancelPlanner).not.toHaveBeenCalled();
  });
  it('agenda, pendências e tarefas preservam filtros nas páginas e reiniciam ao trocar consulta', async () => {
    const { component, api } = await setup();
    component.from = '2026-09-01';
    component.to = '2026-09-29';
    component.source = 'DERIVED';
    component.applyFilters();
    component.changePage(2);
    expect(api.agenda).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2, source: 'DERIVED', from: '2026-09-01', to: '2026-09-29' }),
    );
    component.selectTab('pending');
    component.pendingType = 'WEIGHING_DUE';
    component.applyFilters();
    component.changePage(1);
    expect(api.pendingWork).toHaveBeenLastCalledWith({
      type: 'WEIGHING_DUE',
      animalId: undefined,
      page: 1,
    });
    component.selectTab('planner');
    component.status = 'CANCELLED';
    component.applyFilters();
    component.changePage(2);
    expect(api.planner).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'CANCELLED', page: 2 }),
    );
  });
  it('links de pendência e grupo restauram consultas específicas', async () => {
    const { component, api } = await setup('VIEWER', {
      tab: 'pending',
      pendingType: 'BRUCELLOSIS_DUE',
    });
    expect(component.tab()).toBe('pending');
    expect(api.pendingWork).toHaveBeenCalledWith({
      type: 'BRUCELLOSIS_DUE',
      animalId: undefined,
      page: 0,
    });
  });
  it('consulta individual com falha não vira criação e uma nova leitura reconcilia a versão', async () => {
    const { component, api } = await setup();
    api.plannerItem.mockReturnValueOnce(throwError(() => new Error()));
    component.openItem('t', 'edit');
    component.prepare();
    component.save();
    expect(api.correctPlanner).not.toHaveBeenCalled();
    expect(api.createPlanner).not.toHaveBeenCalled();
    component.reloadEditor();
    component.title = 'Revisar lote';
    component.prepare();
    component.save();
    expect(api.correctPlanner).toHaveBeenCalledWith(
      't',
      expect.objectContaining({ expectedVersion: 9, title: 'Revisar lote' }),
    );
  });
  it('repetição após falha usa o comando original e protege envio e fechamento pendentes', async () => {
    const { component, api } = await setup();
    const pending = new Subject<PlannerItem>();
    api.createPlanner
      .mockReturnValueOnce(throwError(() => new AppError('unavailable', '', 503, 'UNAVAILABLE')))
      .mockReturnValue(pending);
    component.openCreate();
    component.title = 'Conferir';
    component.prepare();
    component.save();
    const command = api.createPlanner.mock.calls[0][0];
    component.title = 'Outro título';
    component.save();
    component.save();
    component.closeEditor();
    expect(api.createPlanner).toHaveBeenCalledTimes(2);
    expect(api.createPlanner.mock.calls[1][0]).toBe(command);
    expect(component.editorOpen()).toBe(true);
  });
  it('troca cancela escrita e apaga filtros, vínculos e detalhes sem feedback tardio', async () => {
    const { component, api, context, fixture, toast } = await setup();
    const pending = new Subject<PlannerItem>();
    api.completePlanner.mockReturnValue(pending);
    component.openItem('t', 'complete');
    component.save();
    context.transitionPending.set(true);
    fixture.detectChanges();
    expect(pending.observed).toBe(false);
    expect(component.editorOpen()).toBe(false);
    expect(component.editing()).toBeNull();
    expect(component.filterGroupId).toBe('');
    expect(component.title).toBe('');
    pending.next(item);
    expect(toast.show).not.toHaveBeenCalled();
  });
  it('atividades encerradas permanecem legíveis e não podem receber transição nova', async () => {
    const { component, api } = await setup();
    api.plannerItem.mockReturnValue(
      of({ ...item, status: 'COMPLETED', completedAt: '2026-09-29T14:00:00Z' }),
    );
    component.openItem('t', 'cancel');
    component.save();
    expect(component.editorError()).toContain('encerrada');
    expect(api.cancelPlanner).not.toHaveBeenCalled();
    component.openItem('t', 'view');
    expect(component.editing()?.completedAt).toBeTruthy();
  });
});
