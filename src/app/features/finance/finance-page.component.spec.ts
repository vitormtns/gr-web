import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AppError, MembershipRole } from '../../core/api/api.models';
import { ContextStore } from '../../core/context/context.store';
import { ToastService } from '../../design-system/feedback/feedback';
import { FinanceApi } from './finance-api.service';
import { FinancePageComponent } from './finance-page.component';
import { FinanceCategory, FinanceEntry, FinancePage, FinanceSummary } from './finance.models';

HTMLDialogElement.prototype.showModal ??= function () { this.open = true; };
HTMLDialogElement.prototype.close ??= function () { this.open = false; };
const category: FinanceCategory = { id: 'c', name: 'Nutrição', code: 'NUT', kind: 'BOTH', status: 'ACTIVE', version: 5, createdAt: '', updatedAt: '' };
const entry: FinanceEntry = { id: 'e', operationId: 'creation-op', type: 'EXPENSE', status: 'PENDING', category, description: 'Compra de sal', amount: '125.50', dueOn: '2026-09-30', settledOn: null, notes: 'Observação', version: 7, createdAt: '', updatedAt: '' };
const summary: FinanceSummary = { pendingIncome: '0', pendingExpense: '125.50', settledIncome: '0', settledExpense: '0', netSettled: '0', overdueIncome: '0', overdueExpense: '0' };
function mocks() { return {
  categories: vi.fn(() => of([category])), category: vi.fn((): Observable<FinanceCategory> => of(category)),
  entries: vi.fn((): Observable<FinancePage> => of({ items: [entry], page: 0, size: 20, totalElements: 1, totalPages: 1 })),
  summary: vi.fn(() => of(summary)), categoryTotals: vi.fn(() => of([])),
  entry: vi.fn((): Observable<FinanceEntry> => of(entry)), history: vi.fn(() => of([])),
  createCategory: vi.fn(() => of(category)), patchCategory: vi.fn(() => of(category)),
  create: vi.fn((): Observable<FinanceEntry> => of(entry)), patch: vi.fn(() => of(entry)), settle: vi.fn(() => of(entry)), cancel: vi.fn(() => of(entry)),
}; }
async function setup(role: MembershipRole = 'OWNER', initialize?: (api: ReturnType<typeof mocks>) => void) {
  const api = mocks(); initialize?.(api);
  const context = { contextVersion: signal(0), transitionPending: signal(false), selectedOrganization: signal({ organizationId: 'o', organizationName: 'Grupo' }), selectedFarm: signal({ farmId: 'f', farmName: 'Fazenda Norte' }), role: signal<MembershipRole | null>(role) };
  const toast = { show: vi.fn() };
  await TestBed.configureTestingModule({ imports: [FinancePageComponent], providers: [{ provide: FinanceApi, useValue: api }, { provide: ContextStore, useValue: context }, { provide: ToastService, useValue: toast }] }).compileComponents();
  const fixture = TestBed.createComponent(FinancePageComponent); fixture.detectChanges(); await fixture.whenStable();
  return { fixture, component: fixture.componentInstance, api, context, toast };
}
function prepare(component: FinancePageComponent) { component.openEntry(); component.entryCategoryId = category.id; component.description = 'Compra'; component.amount = '125,50'; component.dueOn = '2026-09-30'; }

describe('Operações financeiras do portal', () => {
  it('visualizador consulta histórico e totais sem escrita mesmo por chamada direta', async () => {
    const { fixture, component, api } = await setup('VIEWER');
    const page = fixture.nativeElement.querySelector('.management-page');
    expect(page.textContent).not.toContain('Novo lançamento'); expect(page.textContent).not.toContain('Cancelar lançamento');
    component.openEntry(); component.review(); component.confirm(); component.openCategory(); component.saveCategory();
    expect(component.editor()).toBeNull(); expect(api.create).not.toHaveBeenCalled(); expect(api.createCategory).not.toHaveBeenCalled();
    component.openDetail(entry.id); expect(api.history).toHaveBeenCalledWith(entry.id);
  });
  it('operador opera lançamentos mas não altera categorias', async () => {
    const { component, api } = await setup('OPERATOR'); component.openCategory(category.id); component.name = 'Mudança'; component.saveCategory(); expect(api.patchCategory).not.toHaveBeenCalled();
    component.closeEditor(); prepare(component); component.review(); component.confirm(); expect(api.create).toHaveBeenCalled();
  });
  it.each(['OWNER', 'ADMIN', 'MANAGER'] as MembershipRole[])('%s pode administrar categorias com versão e limpeza explícita', async role => {
    const { component, api } = await setup(role); component.openCategory(category.id); component.code = ''; component.saveCategory();
    expect(api.patchCategory).toHaveBeenCalledWith(category.id, expect.objectContaining({ expectedVersion: 5, code: null, codeSet: true, kindSet: true, statusSet: true }));
  });
  it('erro de consulta individual impede criação acidental ou correção', async () => {
    const { component, api } = await setup('OWNER', api => api.entry.mockReturnValue(throwError(() => new AppError('not-found', '', 404, 'ENTRY_NOT_FOUND'))));
    component.openEntry(entry.id); component.description = 'Mudança'; component.review(); component.confirm(); expect(component.editorFailed()).toBe(true); expect(api.create).not.toHaveBeenCalled(); expect(api.patch).not.toHaveBeenCalled();
  });
  it('comando é revisado antes da escrita e mantém identidade após erro de rede', async () => {
    const { component, api } = await setup('OWNER', api => api.create.mockReturnValue(throwError(() => new AppError('unavailable', '', 0, 'NETWORK'))));
    prepare(component); component.review(); expect(api.create).not.toHaveBeenCalled(); const command = component.command(); component.confirm(); component.confirm();
    expect(component.command()).toEqual(command); expect(api.create.mock.calls[0]).toEqual(api.create.mock.calls[1]); expect(component.formError()).toContain('mantendo');
  });
  it('não permite duplo envio enquanto a confirmação está pendente', async () => {
    const pending = new Subject<FinanceEntry>(); const { component, api } = await setup('OWNER', api => api.create.mockReturnValue(pending));
    prepare(component); component.review(); component.confirm(); component.confirm(); expect(api.create).toHaveBeenCalledTimes(1); expect(component.saving()).toBe(true); pending.next(entry); pending.complete(); expect(component.saving()).toBe(false);
  });
  it('rejeita centavos excedentes, datas inválidas e categoria incompatível ou inativa', async () => {
    const { component, api } = await setup(); prepare(component); component.amount = '1,001'; component.review(); expect(component.command()).toBeNull();
    component.amount = '1,00'; component.dueOn = '2026-02-30'; component.review(); expect(component.command()).toBeNull();
    component.dueOn = '2026-09-30'; component.categories.set([{ ...category, kind: 'INCOME' }]); component.review(); expect(component.command()).toBeNull();
    component.categories.set([{ ...category, status: 'INACTIVE' }]); component.review(); expect(component.command()).toBeNull(); expect(api.create).not.toHaveBeenCalled();
  });
  it('edição mantém valor exato, tipo original e campos presentes para limpar observações', async () => {
    const { component, api } = await setup('OWNER', api => api.entry.mockReturnValue(of({ ...entry, amount: '9007199254740993.12' })));
    component.openEntry(entry.id); expect(component.amount).toBe('9007199254740993.12'); component.notes = ''; component.review(); component.confirm();
    expect(api.patch).toHaveBeenCalledWith(entry.id, expect.objectContaining({ expectedVersion: 7, amount: '9007199254740993.12', amountSet: true, notes: null, notesSet: true }));
    expect(api.patch).toHaveBeenCalledWith(entry.id, expect.not.objectContaining({ type: expect.anything() }));
  });
  it('liquidação e cancelamento carregam a versão e exigem revisão com operação diferente da criação', async () => {
    const { component, api } = await setup(); component.openEntry(entry.id, 'settle'); component.settledOn = '2026-09-28'; component.review(); expect(api.settle).not.toHaveBeenCalled(); component.confirm();
    expect(api.settle).toHaveBeenCalledWith(entry.id, expect.objectContaining({ expectedVersion: 7, settledOn: '2026-09-28' }));
    expect(api.settle).toHaveBeenCalledWith(entry.id, expect.objectContaining({ operationId: expect.not.stringMatching(entry.operationId) }));
    component.openEntry(entry.id, 'cancel'); component.review(); expect(component.command()).toBeNull(); component.reason = 'Duplicidade'; component.review(); component.confirm(); expect(api.cancel).toHaveBeenCalledWith(entry.id, expect.objectContaining({ expectedVersion: 7, reason: 'Duplicidade' }));
  });
  it('lançamento concluído não oferece correção nem transição por chamada direta', async () => {
    const { component, api } = await setup('OWNER', api => api.entry.mockReturnValue(of({ ...entry, status: 'SETTLED' })));
    component.openEntry(entry.id); component.review(); component.confirm(); expect(component.editorFailed()).toBe(true); expect(api.patch).not.toHaveBeenCalled();
  });
  it('troca de fazenda cancela consulta e limpa formulário, seleção e confirmação antigos', async () => {
    const stale = new Subject<FinancePage>(); const { fixture, component, context } = await setup('OWNER', api => api.entries.mockReturnValue(stale));
    component.categories.set([category]); prepare(component); component.review(); component.categoryId = category.id; context.transitionPending.set(true); fixture.detectChanges();
    expect(stale.observed).toBe(false); expect(component.command()).toBeNull(); expect(component.editor()).toBeNull(); expect(component.categories()).toEqual([]); expect(component.categoryId).toBe(''); stale.next({ items: [entry], page: 0, size: 20, totalElements: 1, totalPages: 1 }); expect(component.entries()).toBeNull();
  });
  it('resposta de escrita antiga não gera toast nem abre detalhes na nova fazenda', async () => {
    const pending = new Subject<FinanceEntry>(); const { fixture, component, context, toast } = await setup('OWNER', api => api.create.mockReturnValue(pending));
    prepare(component); component.review(); component.confirm(); context.selectedFarm.set({ farmId: 'f2', farmName: 'Outra fazenda' }); context.contextVersion.update(v => v + 1); fixture.detectChanges(); pending.next(entry);
    expect(toast.show).not.toHaveBeenCalled(); expect(component.detailOpen()).toBe(false); expect(component.editor()).toBeNull();
  });
  it('erro de carga não apresenta falsos totais zerados e filtros inválidos não disparam API', async () => {
    const { fixture, component, api } = await setup('OWNER', api => api.entries.mockReturnValue(throwError(() => new AppError('unavailable', '', 503, 'UNAVAILABLE'))));
    fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Não foi possível carregar o financeiro'); expect(fixture.nativeElement.textContent).not.toContain('Saldo liquidado no período');
    const reads = api.entries.mock.calls.length; component.from = '2026-10-01'; component.to = '2026-09-01'; component.filter(); expect(api.entries).toHaveBeenCalledTimes(reads);
  });
  it('nova consulta usa filtros do backend e reinicia a página', async () => {
    const { component, api } = await setup(); component.page = 4; component.status = 'PENDING'; component.type = 'EXPENSE'; component.categoryId = category.id; component.search = ' Sal '; component.filter();
    expect(component.page).toBe(0); expect(api.entries).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'PENDING', type: 'EXPENSE', categoryId: category.id, search: 'Sal', page: 0 }));
  });
});
