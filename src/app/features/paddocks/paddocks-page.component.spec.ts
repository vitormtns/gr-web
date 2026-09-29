import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AppError, MembershipRole } from '../../core/api/api.models';
import { ContextStore } from '../../core/context/context.store';
import { ToastService } from '../../design-system/feedback/feedback';
import { Animal, Page, PaddockRef } from '../herd/herd.models';
import { PaddocksApi, PaddockMovement } from './paddocks-api.service';
import { PaddocksPageComponent } from './paddocks-page.component';

HTMLDialogElement.prototype.showModal ??= function () { this.open = true; };
HTMLDialogElement.prototype.close ??= function () { this.open = false; };
const paddock: PaddockRef = { id: 'p', name: 'Pasto norte', code: 'PN', status: 'ACTIVE', version: 8, occupancy: 2 };
const page = <T>(items: T[] = []): Page<T> => ({ items, page: 0, size: 20, totalElements: items.length, totalPages: items.length ? 1 : 0 });
function mocks() { return { list: vi.fn((): Observable<Page<PaddockRef>> => of(page([paddock]))), get: vi.fn((): Observable<PaddockRef> => of(paddock)), create: vi.fn((): Observable<PaddockRef> => of(paddock)), patch: vi.fn(() => of(paddock)), occupancy: vi.fn(() => of({ paddock, totalAnimals: 2, countsByStatus: { ACTIVE: 2 } })), animals: vi.fn(() => of(page<Animal>())), movements: vi.fn(() => of(page<PaddockMovement>())) }; }
async function setup(role: MembershipRole = 'OWNER', initialize?: (api: ReturnType<typeof mocks>) => void) {
  const api = mocks(); initialize?.(api); const context = { contextVersion: signal(0), transitionPending: signal(false), selectedFarm: signal({ farmId: 'f', farmName: 'Fazenda Norte' }), selectedOrganization: signal({ organizationId: 'o', organizationName: 'Grupo' }), role: signal<MembershipRole | null>(role) }; const toast = { show: vi.fn() };
  await TestBed.configureTestingModule({ imports: [PaddocksPageComponent], providers: [provideRouter([]), { provide: PaddocksApi, useValue: api }, { provide: ContextStore, useValue: context }, { provide: ToastService, useValue: toast }] }).compileComponents();
  const fixture = TestBed.createComponent(PaddocksPageComponent); fixture.detectChanges(); await fixture.whenStable(); return { fixture, component: fixture.componentInstance, api, context, toast };
}
describe('Piquetes, ocupação e histórico', () => {
  it.each(['OPERATOR', 'VIEWER'] as MembershipRole[])('%s consulta sem alterar piquetes', async role => {
    const { fixture, component, api } = await setup(role); expect(fixture.nativeElement.querySelector('.management-page').textContent).not.toContain('Cadastrar piquete'); component.openEditor(); component.name = 'Alteração'; component.save(); expect(component.editor()).toBe(false); expect(api.create).not.toHaveBeenCalled(); component.openDetail(paddock.id); expect(component.occupancy()?.totalAnimals).toBe(2); expect(component.statusCounts).toEqual([{ label: 'Ativo', count: 2 }]);
  });
  it.each(['OWNER', 'ADMIN', 'MANAGER'] as MembershipRole[])('%s revisa com versão e código nulo', async role => {
    const { component, api } = await setup(role); component.openEditor(paddock.id); component.code = ''; component.editStatus = 'INACTIVE'; component.save(); expect(api.patch).toHaveBeenCalledWith(paddock.id, { expectedVersion: 8, name: paddock.name, code: null, status: 'INACTIVE' });
  });
  it('falha na leitura não transforma correção em criação', async () => {
    const { component, api } = await setup('OWNER', api => api.get.mockReturnValue(throwError(() => new AppError('not-found', '', 404, 'PADDOCK_NOT_FOUND')))); component.openEditor(paddock.id); component.name = 'Pasto'; component.save(); expect(component.editorFailed()).toBe(true); expect(api.create).not.toHaveBeenCalled(); expect(api.patch).not.toHaveBeenCalled();
  });
  it('repetição após falha mantém UUID e duplo envio pendente é bloqueado', async () => {
    const pending = new Subject<PaddockRef>(); const { component, api } = await setup('OWNER', api => api.create.mockReturnValue(pending)); component.openEditor(); component.name = 'Pasto'; component.save(); component.save(); expect(api.create).toHaveBeenCalledTimes(1); pending.error(new AppError('unavailable', '', 503, 'UNAVAILABLE')); api.create.mockReturnValue(of(paddock)); component.save(); expect(api.create.mock.calls[0]).toEqual(api.create.mock.calls[1]);
  });
  it('troca de contexto cancela consulta e fecha cadastro e detalhes antigos', async () => {
    const stale = new Subject<Page<PaddockRef>>(); const { fixture, component, context } = await setup('OWNER', api => api.list.mockReturnValue(stale)); component.openEditor(); component.openDetail(paddock.id); context.transitionPending.set(true); fixture.detectChanges(); expect(stale.observed).toBe(false); expect(component.editor()).toBe(false); expect(component.detailOpen()).toBe(false); expect(component.paddocks()).toBeNull(); expect(component.occupancy()).toBeNull();
  });
  it('páginas de animais e histórico são enviadas separadamente, sem calcular ocupação pela página', async () => {
    const { component, api } = await setup(); component.openDetail(paddock.id); component.animalPage = 2; component.movementPage = 3; component.loadDetail(); expect(api.animals).toHaveBeenLastCalledWith(paddock.id, 2); expect(api.movements).toHaveBeenLastCalledWith(paddock.id, 3); expect(component.occupancy()?.totalAnimals).toBe(2);
  });
  it('busca usa backend e reinicia paginação', async () => { const { component, api } = await setup(); component.page = 3; component.search = ' Pasto '; component.status = 'INACTIVE'; component.filter(); expect(api.list).toHaveBeenLastCalledWith({ search: 'Pasto', status: 'INACTIVE', page: 0 }); });
});
