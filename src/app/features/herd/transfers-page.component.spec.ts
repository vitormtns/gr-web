import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ContextStore } from '../../core/context/context.store';
import { HerdApi } from './herd-api.service';
import { Page, TransferItem } from './herd.models';
import { TransfersPageComponent } from './transfers-page.component';
HTMLDialogElement.prototype.showModal ??= function () {
  this.open = true;
};
HTMLDialogElement.prototype.close ??= function () {
  this.open = false;
};
const item: TransferItem = {
  id: 't',
  operationId: 'op',
  animalId: 'a',
  sourceFarm: { id: 's', name: 'Origem' },
  destinationFarm: { id: 'd', name: 'Destino' },
  destinationPaddock: null,
  occurredOn: '2026-09-29',
  recordedAt: '2026-09-29T13:00:00Z',
  actorUserId: 'u',
  resultingVersion: 3,
  notes: 'Observação preservada',
};
async function setup() {
  const api = {
    transfers: vi.fn((_filters: object): Observable<Page<TransferItem>> =>
      of({ items: [item], page: 0, size: 20, totalElements: 1, totalPages: 1 }),
    ),
    transferDetail: vi.fn((_id: string): Observable<TransferItem> => of(item)),
  };
  const context = {
    contextVersion: signal(0),
    transitionPending: signal(false),
    selectedFarm: signal({ farmId: 's', farmName: 'Origem' }),
    user: signal({ userId: 'u' }),
    farms: signal([
      { farmId: 's', farmName: 'Origem' },
      { farmId: 'd', farmName: 'Destino' },
    ]),
    selectFarm: vi.fn(async (id: string) => {
      context.selectedFarm.set({ farmId: id, farmName: 'Destino' });
    }),
  };
  await TestBed.configureTestingModule({
    imports: [TransfersPageComponent],
    providers: [provideRouter([]), { provide: ContextStore, useValue: context }],
  })
    .overrideComponent(TransfersPageComponent, {
      set: { providers: [{ provide: HerdApi, useValue: api }] },
    })
    .compileComponents();
  const fixture = TestBed.createComponent(TransfersPageComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, component: fixture.componentInstance, api, context };
}
describe('Histórico de custódia', () => {
  it('aplica filtros no servidor, reinicia página e preserva consulta nas páginas seguintes', async () => {
    const { component, api } = await setup();
    component.direction = 'OUT';
    component.animalId = 'f6d4c17b-4bdf-4e0d-b019-2aa72579f4c1';
    component.applyFilters();
    component.changePage(2);
    expect(api.transfers).toHaveBeenLastCalledWith({
      direction: 'OUT',
      animalId: component.animalId,
      page: 2,
    });
    component.clearFilters();
    expect(api.transfers).toHaveBeenLastCalledWith({
      direction: 'ALL',
      animalId: undefined,
      page: 0,
    });
  });
  it('carrega o registro individual e cancela detalhe ao fechar ou trocar contexto', async () => {
    const { component, api, context, fixture } = await setup();
    const pending = new Subject<TransferItem>();
    api.transferDetail.mockReturnValue(pending);
    component.openDetail('t');
    component.closeDetail();
    expect(pending.observed).toBe(false);
    component.openDetail('t');
    context.transitionPending.set(true);
    fixture.detectChanges();
    expect(pending.observed).toBe(false);
    expect(component.detailOpen()).toBe(false);
    pending.next(item);
    expect(component.detail()).toBeNull();
    expect(component.data()).toBeNull();
  });
  it('consulta antiga não retorna dados depois da troca de fazenda', async () => {
    const { component, api, context, fixture } = await setup();
    const pending = new Subject<Page<TransferItem>>();
    api.transfers.mockReturnValue(pending);
    component.load();
    context.transitionPending.set(true);
    fixture.detectChanges();
    expect(pending.observed).toBe(false);
    pending.next({ items: [item], page: 0, size: 20, totalElements: 1, totalPages: 1 });
    expect(component.data()).toBeNull();
    expect(component.direction).toBe('ALL');
  });
  it('erro de detalhe permite retry e não mostra item anterior', async () => {
    const { component, api } = await setup();
    api.transferDetail.mockReturnValueOnce(throwError(() => new Error()));
    component.openDetail('t');
    expect(component.detail()).toBeNull();
    expect(component.detailError()).toContain('Tente novamente');
    component.retryDetail();
    expect(component.detail()?.notes).toBe(item.notes);
  });
  it('só navega ao perfil depois de confirmar o contexto de destino acessível', async () => {
    const { component, context } = await setup();
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    context.farms.set([{ farmId: 's', farmName: 'Origem' }]);
    await component.viewAnimal(item);
    expect(context.selectFarm).not.toHaveBeenCalled();
    context.farms.set([{ farmId: 'd', farmName: 'Destino' }]);
    await component.viewAnimal(item);
    expect(context.selectFarm).toHaveBeenCalledWith('d');
    expect(navigate).toHaveBeenCalledWith(['/rebanho/animais', 'a']);
  });
});
