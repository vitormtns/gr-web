import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AppError, MembershipRole } from '../../core/api/api.models';
import { ContextStore } from '../../core/context/context.store';
import { ToastService } from '../../design-system/feedback/feedback';
import {
  AnimalBatchOperationsComponent,
  validBatchWeight,
} from './animal-batch-operations.component';
import { HerdApi } from './herd-api.service';
import { Animal, PaddockRef } from './herd.models';

HTMLDialogElement.prototype.showModal ??= function () {
  this.open = true;
};
HTMLDialogElement.prototype.close ??= function () {
  this.open = false;
};
const animal: Animal = {
  id: 'a',
  identification: 'BR-01',
  name: null,
  sex: 'FEMALE',
  birthDate: '2025-01-01',
  status: 'ACTIVE',
  version: 9,
  paddock: null,
};
const paddock: PaddockRef = {
  id: 'p',
  name: 'Piquete Norte',
  code: null,
  status: 'ACTIVE',
  version: 1,
};
async function setup(role: MembershipRole = 'OWNER') {
  const api = {
    allPaddocks: vi.fn((): Observable<PaddockRef[]> => of([paddock])),
    recordWeightBatch: vi.fn((): Observable<unknown> => of({})),
    moveBatch: vi.fn((): Observable<unknown> => of({})),
    transferBatch: vi.fn((): Observable<unknown> => of({})),
  };
  const context = {
    contextVersion: signal(0),
    transitionPending: signal(false),
    selectedOrganization: signal({ organizationId: 'org' }),
    selectedFarm: signal({ farmId: 'source', farmName: 'Origem' }),
    farms: signal([
      { farmId: 'source', farmName: 'Origem' },
      { farmId: 'dest', farmName: 'Destino' },
    ]),
    role: signal<MembershipRole | null>(role),
  };
  const toast = { show: vi.fn() };
  await TestBed.configureTestingModule({
    imports: [AnimalBatchOperationsComponent],
    providers: [
      { provide: HerdApi, useValue: api },
      { provide: ContextStore, useValue: context },
      { provide: ToastService, useValue: toast },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(AnimalBatchOperationsComponent);
  fixture.componentRef.setInput('animals', [animal]);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, component: fixture.componentInstance, api, context, toast };
}
describe('Operações em lote', () => {
  it.each(['OWNER', 'ADMIN', 'MANAGER', 'OPERATOR'] as MembershipRole[])(
    '%s registra pesos individuais depois da revisão',
    async (role) => {
      const { component, api } = await setup(role);
      component.open('weight');
      component.weights[0].weight = '418,750';
      component.submit();
      expect(api.recordWeightBatch).not.toHaveBeenCalled();
      component.prepare();
      component.submit();
      expect(api.recordWeightBatch).toHaveBeenCalledWith(
        expect.objectContaining({
          animals: [expect.objectContaining({ id: 'a', expectedVersion: 9, weightKg: '418.750' })],
        }),
      );
    },
  );
  it('VIEWER não abre nem envia operações e OPERATOR não transfere custódia', async () => {
    const { component, api, context } = await setup('VIEWER');
    component.open('weight');
    component.prepare();
    component.submit();
    expect(component.action()).toBeNull();
    expect(api.recordWeightBatch).not.toHaveBeenCalled();
    context.role.set('OPERATOR');
    component.open('transfer');
    expect(component.action()).toBeNull();
    expect(api.transferBatch).not.toHaveBeenCalled();
  });
  it('preserva o comando após falha de rede e impede envio duplicado pendente', async () => {
    const { component, api } = await setup();
    const pending = new Subject<unknown>();
    api.recordWeightBatch
      .mockReturnValueOnce(throwError(() => new AppError('unavailable', '', 503, 'UNAVAILABLE')))
      .mockReturnValue(pending);
    component.open('weight');
    component.weights[0].weight = '100';
    component.prepare();
    component.submit();
    const first = api.recordWeightBatch.mock.calls[0];
    component.weights[0].weight = '200';
    component.submit();
    component.submit();
    expect(api.recordWeightBatch).toHaveBeenCalledTimes(2);
    expect(api.recordWeightBatch.mock.calls[1]).toEqual(first);
    expect(component.pending()).toBe(true);
    component.close();
    expect(component.action()).toBe('weight');
  });
  it('consulta destino explicitamente sem mudar fazenda atual e envia o piquete selecionado', async () => {
    const { component, api, context } = await setup();
    component.open('transfer');
    component.destinationFarm = 'dest';
    component.loadPaddocks();
    expect(api.allPaddocks).toHaveBeenCalledWith({ organizationId: 'org', farmId: 'dest' });
    expect(context.selectedFarm().farmId).toBe('source');
    component.paddock = 'p';
    component.prepare();
    component.submit();
    expect(api.transferBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        destinationFarmId: 'dest',
        destinationPaddockId: 'p',
        animals: [{ animalId: 'a', expectedVersion: 9 }],
      }),
    );
  });
  it('troca de contexto cancela catálogo e escrita sem dados ou feedback tardios', async () => {
    const { component, api, context, fixture, toast } = await setup();
    const pending = new Subject<unknown>();
    api.moveBatch.mockReturnValue(pending);
    component.open('move');
    component.paddock = 'p';
    component.prepare();
    component.submit();
    expect(pending.observed).toBe(true);
    context.transitionPending.set(true);
    fixture.detectChanges();
    expect(pending.observed).toBe(false);
    expect(component.action()).toBeNull();
    expect(component.paddocks()).toEqual([]);
    pending.next({});
    expect(toast.show).not.toHaveBeenCalled();
  });
  it('falha de catálogo bloqueia revisão e permite nova consulta', async () => {
    const { component, api } = await setup();
    api.allPaddocks.mockReturnValueOnce(throwError(() => new Error()));
    component.open('move');
    component.paddock = 'p';
    component.prepare();
    expect(component.review()).toBe(false);
    component.loadPaddocks();
    component.paddock = 'p';
    component.prepare();
    expect(component.review()).toBe(true);
  });
  it('recusa peso fora da precisão, datas impossíveis e anteriores ao nascimento', async () => {
    expect(validBatchWeight('99999,999')).toBe(true);
    for (const value of ['100000', '0', '1.2345', '1e3', '-1'])
      expect(validBatchWeight(value)).toBe(false);
    const { component, api } = await setup();
    component.open('weight');
    component.weights[0].weight = '100';
    component.weights[0].date = '2025-02-30';
    component.prepare();
    component.submit();
    expect(component.review()).toBe(false);
    component.weights[0].date = '2024-12-31';
    component.prepare();
    expect(api.recordWeightBatch).not.toHaveBeenCalled();
  });
});
