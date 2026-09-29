import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AppError, MembershipRole } from '../../core/api/api.models';
import { ContextStore } from '../../core/context/context.store';
import { ToastService } from '../../design-system/feedback/feedback';
import { InventoryApi } from './inventory-api.service';
import { InventoryPageComponent } from './inventory-page.component';
import { InventoryBalance, InventoryLocation, InventoryMovement, InventoryPage, InventoryProduct } from './inventory.models';

HTMLDialogElement.prototype.showModal ??= function () { this.open = true; };
HTMLDialogElement.prototype.close ??= function () { this.open = false; };
const product: InventoryProduct = { id: 'p1', name: 'Sal mineral', code: 'SAL', category: 'Nutrição', baseUnit: 'KG', status: 'ACTIVE', version: 7, createdAt: '', updatedAt: '' };
const location: InventoryLocation = { id: 'l1', name: 'Galpão', code: null, status: 'ACTIVE', version: 4, createdAt: '', updatedAt: '' };
const emptyPage = <T>(): InventoryPage<T> => ({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
const movement: InventoryMovement = { id: 'm1', operationId: 'op', type: 'RECEIPT', productId: product.id, productName: product.name, baseUnit: 'KG', sourceLocationId: null, sourceLocationName: null, destinationLocationId: location.id, destinationLocationName: location.name, quantity: 10, sourceBalanceAfter: null, destinationBalanceAfter: 10, occurredOn: '2026-09-01', actorUserId: 'u1', notes: null, recordedAt: '' };
function mocks() {
  return {
    products: vi.fn(() => of([product])), locations: vi.fn(() => of([location])),
    product: vi.fn((): Observable<InventoryProduct> => of(product)), location: vi.fn(() => of(location)),
    stock: vi.fn((): Observable<InventoryPage<InventoryBalance>> => of(emptyPage<InventoryBalance>())),
    movements: vi.fn(() => of(emptyPage<InventoryMovement>())),
    createProduct: vi.fn(() => of(product)), createLocation: vi.fn(() => of(location)),
    patchProduct: vi.fn(() => of(product)), patchLocation: vi.fn(() => of(location)),
    move: vi.fn((): Observable<InventoryMovement> => of(movement)),
    movement: vi.fn(() => of(movement)), locationStock: vi.fn(() => of(emptyPage<InventoryBalance>())),
  };
}
async function setup(role: MembershipRole = 'OWNER', initialize?: (api: ReturnType<typeof mocks>) => void) {
  const api = mocks(); initialize?.(api);
  const context = {
    contextVersion: signal(0), transitionPending: signal(false),
    selectedFarm: signal({ farmId: 'f1', farmName: 'Fazenda Norte' }),
    selectedOrganization: signal({ organizationId: 'o1', organizationName: 'Grupo' }),
    role: signal<MembershipRole | null>(role),
  };
  const toast = { show: vi.fn() };
  await TestBed.configureTestingModule({ imports: [InventoryPageComponent], providers: [
    { provide: InventoryApi, useValue: api }, { provide: ContextStore, useValue: context }, { provide: ToastService, useValue: toast },
  ] }).compileComponents();
  const fixture = TestBed.createComponent(InventoryPageComponent);
  fixture.detectChanges(); await fixture.whenStable();
  return { fixture, component: fixture.componentInstance, context, api, toast };
}
function prepare(component: InventoryPageComponent): void {
  component.openMovement(); component.moveProductId = product.id; component.destinationId = location.id;
  component.quantity = '12,500'; component.occurredOn = '2026-09-01';
}
describe('Fluxos de insumos no portal', () => {
  it('visualizador consulta sem botões de escrita e sem mutação por chamada direta', async () => {
    const { fixture, component, api } = await setup('VIEWER');
    expect(fixture.nativeElement.textContent).not.toContain('Registrar movimentação');
    component.openMovement(); component.openProduct(); component.openLocation(); component.saveCatalog();
    expect(component.editor()).toBeNull(); expect(api.createProduct).not.toHaveBeenCalled(); expect(api.move).not.toHaveBeenCalled();
  });
  it('operador registra movimentação mas não altera catálogo nem unidade base', async () => {
    const { component, api } = await setup('OPERATOR');
    component.openProduct(product.id); component.name = 'Alterado'; component.saveCatalog();
    expect(api.patchProduct).not.toHaveBeenCalled();
    prepare(component); component.reviewMovement(); component.confirmMovement();
    expect(api.move).toHaveBeenCalledWith(expect.objectContaining({ productId: product.id, destinationLocationId: location.id, sourceLocationId: null, quantity: '12.500', type: 'RECEIPT' }));
  });
  it('revisão de produto usa versão carregada, permite limpar campos e não altera unidade', async () => {
    const { component, api } = await setup();
    component.openProduct(product.id); component.code = ''; component.category = ''; component.name = 'Sal'; component.saveCatalog();
    expect(api.patchProduct).toHaveBeenCalledWith(product.id, { name: 'Sal', code: null, category: null, status: 'ACTIVE', expectedVersion: 7 });
  });
  it('erro na leitura individual não vira criação acidental ao salvar', async () => {
    const { component, api } = await setup('OWNER', api => api.product.mockReturnValue(throwError(() => new AppError('unavailable', '', 503, 'UNAVAILABLE'))));
    component.openProduct(product.id); component.name = 'Produto'; component.saveCatalog();
    expect(component.catalogLoadFailed()).toBe(true); expect(api.createProduct).not.toHaveBeenCalled(); expect(api.patchProduct).not.toHaveBeenCalled();
  });
  it('resposta de editor fechado não sobrescreve o cadastro seguinte', async () => {
    const stale = new Subject<InventoryProduct>();
    const { component } = await setup('OWNER', api => api.product.mockReturnValue(stale));
    component.openProduct(product.id); component.closeEditor(); component.openLocation(); component.name = 'Depósito novo';
    stale.next(product); expect(component.name).toBe('Depósito novo'); expect(component.editingProduct()).toBeNull();
  });
  it('revisão precede escrita e protege duplo envio com o mesmo identificador de operação', async () => {
    const pending = new Subject<InventoryMovement>();
    const { component, api } = await setup('OWNER', api => api.move.mockReturnValue(pending));
    prepare(component); component.reviewMovement(); expect(api.move).not.toHaveBeenCalled();
    component.confirmMovement(); component.confirmMovement(); expect(api.move).toHaveBeenCalledTimes(1);
    expect(component.saving()).toBe(true); pending.next(movement); pending.complete(); expect(component.saving()).toBe(false);
  });
  it('transferência exige depósitos distintos e ajuste exige justificativa', async () => {
    const { component, api } = await setup();
    prepare(component); component.moveType = 'TRANSFER'; component.sourceId = location.id; component.reviewMovement();
    expect(component.confirmation()).toBeNull(); expect(component.formError()).toContain('diferentes');
    component.moveType = 'ADJUSTMENT_IN'; component.reviewMovement(); expect(component.formError()).toContain('motivo');
    expect(api.move).not.toHaveBeenCalled();
  });
  it('valida data futura, quantidade inválida e precisão antes do comando', async () => {
    const { component, api } = await setup();
    prepare(component); component.occurredOn = '2999-01-01'; component.reviewMovement(); expect(component.confirmation()).toBeNull();
    component.occurredOn = '2026-09-01'; component.quantity = '1.0000001'; component.reviewMovement(); expect(component.confirmation()).toBeNull();
    component.quantity = '-1'; component.reviewMovement(); expect(api.move).not.toHaveBeenCalled();
  });
  it('mostra erro contextual de saldo insuficiente e preserva o comando para nova tentativa', async () => {
    const { component, api } = await setup('OWNER', api => api.move.mockReturnValue(throwError(() => new AppError('conflict', '', 409, 'INVENTORY_INSUFFICIENT_STOCK'))));
    prepare(component); component.reviewMovement(); const operationId = component.confirmation()!.operationId;
    component.confirmMovement(); expect(component.formError()).toContain('saldo suficiente'); expect(component.confirmation()?.operationId).toBe(operationId);
    component.confirmMovement(); expect(api.move.mock.calls).toHaveLength(2);
  });
  it('cancela consulta da fazenda anterior, fecha editor e não exibe resultado atrasado', async () => {
    const stale = new Subject<InventoryPage<InventoryBalance>>();
    const { component, context, fixture, api } = await setup();
    api.stock.mockReturnValueOnce(stale); component.load(); component.openMovement();
    context.transitionPending.set(true); fixture.detectChanges(); await fixture.whenStable();
    expect(component.editor()).toBeNull(); expect(component.stock()).toBeNull(); expect(stale.observed).toBe(false);
    stale.next({ ...emptyPage<InventoryBalance>(), totalElements: 999 }); expect(component.stock()).toBeNull();
    context.selectedFarm.set({ farmId: 'f2', farmName: 'Fazenda Sul' }); context.contextVersion.update(v => v + 1); context.transitionPending.set(false);
    fixture.detectChanges(); await fixture.whenStable(); expect(component.stock()?.totalElements).toBe(0); expect(component.productId).toBe('');
  });
  it('resposta de escrita anterior não abre detalhe nem emite sucesso em novo contexto', async () => {
    const pending = new Subject<InventoryMovement>();
    const { component, context, fixture, toast } = await setup('OWNER', api => api.move.mockReturnValue(pending));
    prepare(component); component.reviewMovement(); component.confirmMovement();
    context.transitionPending.set(true); fixture.detectChanges(); await fixture.whenStable();
    pending.next(movement); expect(component.saving()).toBe(false); expect(component.detailOpen()).toBe(false); expect(toast.show).not.toHaveBeenCalled();
  });
  it('filtros reiniciam página e mantêm consulta por produto, depósito e período', async () => {
    const { component, api } = await setup();
    component.tab = 'movements'; component.page = 3; component.type = 'ISSUE'; component.productId = 'p1'; component.locationId = 'l1'; component.from = '2026-09-01'; component.to = '2026-09-28'; component.filter();
    expect(component.page).toBe(0); expect(api.movements).toHaveBeenLastCalledWith({ type: 'ISSUE', productId: 'p1', locationId: 'l1', from: '2026-09-01', to: '2026-09-28', page: 0 });
  });
  it('falha de consulta tem retry e não apresenta métricas zeradas como resultado válido', async () => {
    const { component, fixture, api } = await setup('OWNER', api => api.stock.mockReturnValue(throwError(() => new AppError('unavailable', '', 503, 'UNAVAILABLE'))));
    fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Não foi possível carregar os insumos');
    expect(fixture.nativeElement.querySelector('.metric-strip')).toBeNull();
    api.stock.mockReturnValue(of(emptyPage<InventoryBalance>())); component.load(); fixture.detectChanges(); expect(component.failed()).toBe(false); expect(fixture.nativeElement.textContent).toContain('Nenhuma posição de estoque encontrada');
  });
});
