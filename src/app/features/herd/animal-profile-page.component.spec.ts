import { Component, input, output, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, Observable, Subject, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AppError, MembershipRole } from '../../core/api/api.models';
import { ContextStore } from '../../core/context/context.store';
import { ToastService } from '../../design-system/feedback/feedback';
import { AnimalManagementComponent } from './animal-management.component';
import { AnimalOperationalHistoryComponent } from './animal-operational-history.component';
import { AnimalProfilePageComponent } from './animal-profile-page.component';
import { HerdApi } from './herd-api.service';
import { Animal, AnimalHistory } from './herd.models';
@Component({ selector: 'app-animal-management', template: '' })
class ManagementStub {
  animal = input.required<Animal>();
  mother = input<Animal | null>();
  changed = output<void>();
}
@Component({ selector: 'app-animal-operational-history', template: '' })
class HistoryStub {
  animal = input.required<Animal>();
}
HTMLDialogElement.prototype.showModal ??= function () {
  this.open = true;
};
HTMLDialogElement.prototype.close ??= function () {
  this.open = false;
};
const animal: Animal = {
  id: 'f6d4c17b-4bdf-4e0d-b019-2aa72579f4c1',
  identification: 'BR-01',
  name: null,
  sex: 'FEMALE',
  birthDate: '2025-01-01',
  status: 'ACTIVE',
  version: 2,
  paddock: null,
};
const history: AnimalHistory = { items: [], page: 0, size: 50, totalElements: 0, totalPages: 0 };
async function setup(role: MembershipRole = 'OWNER') {
  const api = {
    animal: vi.fn((_id: string): Observable<Animal> => of(animal)),
    history: vi.fn((_id: string, _page?: number, _type?: string): Observable<AnimalHistory> =>
      of(history),
    ),
    weights: vi.fn(() => of({ items: [], page: 0, size: 20, totalElements: 0 })),
    pendingWork: vi.fn(() => of({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 })),
    pregnancies: vi.fn(() => of({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 })),
    mother: vi.fn(() => throwError(() => new AppError('not-found', '', 404, 'NOT_FOUND'))),
    calves: vi.fn(() => of([])),
    correct: vi.fn((_id: string, _body: object): Observable<Animal> => of(animal)),
    recordWeight: vi.fn((_id: string, _body: object): Observable<unknown> => of({})),
    allPaddocks: vi.fn((_destination?: object) =>
      of([{ id: 'p', name: 'Reserva', status: 'ACTIVE', version: 0, code: null }]),
    ),
  };
  const context = {
    contextVersion: signal(0),
    transitionPending: signal(false),
    selectedFarm: signal({ farmId: 's', farmName: 'Origem' }),
    selectedOrganization: signal({ organizationId: 'o' }),
    farms: signal([
      { farmId: 's', farmName: 'Origem' },
      { farmId: 'd', farmName: 'Destino' },
    ]),
    role: signal<MembershipRole | null>(role),
  };
  const params = new BehaviorSubject(convertToParamMap({ animalId: animal.id }));
  const toast = { show: vi.fn() };
  await TestBed.configureTestingModule({
    imports: [AnimalProfilePageComponent],
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: params.value }, paramMap: params },
      },
      { provide: ContextStore, useValue: context },
      { provide: ToastService, useValue: toast },
    ],
  })
    .overrideComponent(AnimalProfilePageComponent, {
      remove: {
        imports: [AnimalManagementComponent, AnimalOperationalHistoryComponent],
        providers: [HerdApi],
      },
      add: {
        imports: [ManagementStub, HistoryStub],
        providers: [{ provide: HerdApi, useValue: api }],
      },
    })
    .compileComponents();
  const fixture = TestBed.createComponent(AnimalProfilePageComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, component: fixture.componentInstance, api, context, toast };
}
describe('Perfil operacional do animal', () => {
  it.each(['OWNER', 'ADMIN', 'MANAGER', 'OPERATOR'] as MembershipRole[])(
    '%s revisa a correção antes de enviá-la com a versão consultada',
    async (role) => {
      const { component, api } = await setup(role);
      component.openCorrection(animal);
      component.editIdentification = ' BR-02 ';
      component.saveCorrection();
      expect(api.correct).not.toHaveBeenCalled();
      component.prepareCorrection();
      component.saveCorrection();
      expect(api.correct).toHaveBeenCalledWith(
        animal.id,
        expect.objectContaining({ expectedVersion: 2, identification: 'BR-02' }),
      );
    },
  );
  it('VIEWER não abre nem executa escrita e OPERATOR não transfere', async () => {
    const { component, api, context } = await setup('VIEWER');
    component.openCorrection(animal);
    component.openMovement();
    component.openWeight();
    component.openTransfer();
    component.prepareCorrection();
    component.saveCorrection();
    expect(component.action()).toBeNull();
    expect(api.correct).not.toHaveBeenCalled();
    context.role.set('OPERATOR');
    component.openTransfer();
    expect(component.action()).toBeNull();
  });
  it('troca cancela escrita, limpa o editor e impede feedback de resposta tardia', async () => {
    const { component, api, context, fixture, toast } = await setup();
    const pending = new Subject<unknown>();
    api.recordWeight.mockReturnValue(pending);
    component.openWeight();
    component.weightKg = '100';
    component.recordWeight();
    component.recordWeight();
    expect(api.recordWeight).toHaveBeenCalledTimes(1);
    context.transitionPending.set(true);
    fixture.detectChanges();
    expect(pending.observed).toBe(false);
    expect(component.action()).toBeNull();
    expect(component.weightKg).toBe('');
    expect(component.animal()).toBeNull();
    pending.next({});
    expect(toast.show).not.toHaveBeenCalled();
  });
  it('filtros rápidos cancelam consultas anteriores do histórico', async () => {
    const { component, api } = await setup();
    const pending = new Subject<AnimalHistory>();
    api.history.mockReturnValueOnce(pending);
    component.historyType = 'WEIGHED';
    component.loadHistory(0);
    component.historyType = 'MOVED';
    component.loadHistory(0);
    expect(pending.observed).toBe(false);
    expect(api.history).toHaveBeenLastCalledWith(animal.id, 0, 'MOVED');
  });
  it('consultas do destino preservam a fazenda atual e invalidam catálogos ao fechar', async () => {
    const { component, api, context } = await setup();
    component.openTransfer();
    component.destinationFarm = 'd';
    component.loadDestinationPaddocks();
    expect(api.allPaddocks).toHaveBeenCalledWith({ organizationId: 'o', farmId: 'd' });
    expect(context.selectedFarm().farmId).toBe('s');
    component.closeAction();
    expect(component.transferPaddocks()).toEqual([]);
    expect(component.destinationFarm).toBe('');
  });
  it('recusa datas impossíveis ou anteriores ao nascimento antes da escrita', async () => {
    const { component, api } = await setup();
    component.openWeight();
    component.weightKg = '100';
    component.occurredOn = '2025-02-30';
    component.recordWeight();
    expect(api.recordWeight).not.toHaveBeenCalled();
    component.occurredOn = '2024-12-31';
    component.recordWeight();
    expect(component.actionError()).toContain('nascimento');
  });
});
