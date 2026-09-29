import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, Observable } from 'rxjs';
import { AppError } from '../../core/api/api.models';
import { ContextStore } from '../../core/context/context.store';
import { localDateOnly } from '../../core/date/date-only';
import { PermissionService } from '../../core/permissions/permission.service';
import { ErrorStateComponent, SkeletonComponent, ToastService } from '../../design-system/feedback/feedback';
import { DialogComponent } from '../../design-system/surfaces/surfaces';
import { validImportDate } from '../herd/herd-import';
import { newUuid } from '../herd/herd.models';
import { formatDate } from '../herd/herd.shared';
import { ExactDecimalPipe } from '../management/exact-decimal';
import { ContextRequestScope, managementError, managementTimestamp, positiveDecimal } from '../management/management.shared';
import { FinanceApi } from './finance-api.service';
import { CategoryKind, CategoryStatus, CategoryTotals, EntryStatus, FinanceCategory, FinanceCreate, FinanceEntry, FinanceEvent, FinancePage, FinancePatch, FinanceSummary, FinanceType, categoryKindLabels, financeEventLabels, financeStatusLabels, financeTypeLabels } from './finance.models';

type Command = { kind: 'create'; body: FinanceCreate } | { kind: 'patch'; id: string; body: FinancePatch } | { kind: 'settle'; id: string; body: { operationId: string; expectedVersion: number; settledOn: string } } | { kind: 'cancel'; id: string; body: { operationId: string; expectedVersion: number; reason: string | null } };

@Component({
  selector: 'app-finance-page', imports: [FormsModule, ExactDecimalPipe, ErrorStateComponent, SkeletonComponent, DialogComponent],
  templateUrl: './finance-page.component.html', styleUrl: '../management/management.scss', changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancePageComponent {
  private readonly api = inject(FinanceApi);
  private readonly scope = new ContextRequestScope(inject(DestroyRef));
  private readonly toast = inject(ToastService);
  readonly context = inject(ContextStore);
  readonly permissions = inject(PermissionService);
  readonly loading = signal(true); readonly failed = signal(false); readonly error = signal<AppError | null>(null);
  readonly categories = signal<FinanceCategory[]>([]); readonly entries = signal<FinancePage | null>(null);
  readonly summary = signal<FinanceSummary | null>(null); readonly totals = signal<CategoryTotals[]>([]);
  readonly editor = signal<'category' | 'entry' | 'settle' | 'cancel' | null>(null);
  readonly editingCategory = signal<FinanceCategory | null>(null); readonly editingEntry = signal<FinanceEntry | null>(null);
  readonly editorLoading = signal(false); readonly editorFailed = signal(false); readonly saving = signal(false); readonly formError = signal('');
  readonly command = signal<Command | null>(null);
  readonly detailOpen = signal(false); readonly detailLoading = signal(false); readonly detailError = signal('');
  readonly detail = signal<FinanceEntry | null>(null); readonly history = signal<FinanceEvent[]>([]);
  readonly today = localDateOnly(new Date()); readonly date = formatDate; readonly timestamp = managementTimestamp;
  readonly typeLabels = financeTypeLabels; readonly statusLabels = financeStatusLabels; readonly kindLabels = categoryKindLabels; readonly eventLabels = financeEventLabels;
  tab: 'entries' | 'summary' | 'categories' = 'entries';
  from = this.today.slice(0, 8) + '01'; to = this.today.slice(0, 5) + '12-31';
  type: FinanceType | '' = ''; status: EntryStatus | '' = ''; categoryId = ''; search = ''; page = 0;
  categorySearch = ''; categoryStatus: CategoryStatus | '' = ''; categoryPage = 0; historyPage = 0; totalsPage = 0;
  name = ''; code = ''; kind: CategoryKind = 'BOTH'; catalogStatus: CategoryStatus = 'ACTIVE';
  entryType: FinanceType = 'EXPENSE'; entryCategoryId = ''; description = ''; amount = ''; dueOn = this.today; notes = ''; settledOn = this.today; reason = '';
  private operationId = newUuid(); private readRevision = 0; private editorRevision = 0; private detailRevision = 0;

  constructor() {
    effect(() => {
      this.context.contextVersion(); this.context.selectedOrganization(); this.context.selectedFarm();
      const pending = this.context.transitionPending();
      this.scope.reset(); this.readRevision++; this.editorRevision++; this.detailRevision++;
      this.categories.set([]); this.entries.set(null); this.summary.set(null); this.totals.set([]);
      this.editor.set(null); this.command.set(null); this.editingCategory.set(null); this.editingEntry.set(null);
      this.detailOpen.set(false); this.detail.set(null); this.history.set([]); this.saving.set(false); this.formError.set('');
      this.failed.set(false); this.error.set(null); this.loading.set(true);
      this.type = ''; this.status = ''; this.categoryId = ''; this.search = ''; this.page = 0;
      this.categorySearch = ''; this.categoryStatus = ''; this.categoryPage = 0; this.totalsPage = 0;
      this.from = this.today.slice(0, 8) + '01'; this.to = this.today.slice(0, 5) + '12-31';
      if (!pending && this.context.selectedFarm()) this.load();
    });
  }
  get compatibleCategories(): FinanceCategory[] { return this.categories().filter(c => c.status === 'ACTIVE' && (c.kind === 'BOTH' || c.kind === this.entryType)); }
  get filteredCategories(): FinanceCategory[] { const q = this.categorySearch.trim().toLocaleLowerCase('pt-BR'); return this.categories().filter(c => (!this.categoryStatus || c.status === this.categoryStatus) && (!q || `${c.name} ${c.code ?? ''}`.toLocaleLowerCase('pt-BR').includes(q))); }
  get categoryRows(): FinanceCategory[] { return this.filteredCategories.slice(this.categoryPage * 20, (this.categoryPage + 1) * 20); }
  get categoryPages(): number { return Math.max(1, Math.ceil(this.filteredCategories.length / 20)); }
  get historyRows(): FinanceEvent[] { return this.history().slice(this.historyPage * 10, (this.historyPage + 1) * 10); }
  get historyPages(): number { return Math.max(1, Math.ceil(this.history().length / 10)); }
  get totalRows(): CategoryTotals[] { return this.totals().slice(this.totalsPage * 20, (this.totalsPage + 1) * 20); }
  get totalsPages(): number { return Math.max(1, Math.ceil(this.totals().length / 20)); }
  load(): void {
    if (this.context.transitionPending() || !this.context.selectedFarm()) return;
    if (!validImportDate(this.from) || !validImportDate(this.to) || this.from > this.to) { this.formError.set('Informe um período válido, com a data inicial anterior ou igual à final.'); return; }
    const revision = ++this.readRevision;
    this.formError.set(''); this.loading.set(true); this.failed.set(false); this.error.set(null);
    this.scope.run(forkJoin({ categories: this.api.categories(), entries: this.api.entries({ dueFrom: this.from, dueTo: this.to, type: this.type, status: this.status, categoryId: this.categoryId, search: this.search.trim(), page: this.page }), summary: this.api.summary(this.from, this.to, this.categoryId), totals: this.api.categoryTotals(this.from, this.to) }), result => {
      if (revision !== this.readRevision) return;
      this.categories.set(result.categories); this.entries.set(result.entries); this.summary.set(result.summary); this.totals.set(result.totals); this.loading.set(false);
    }, e => { if (revision !== this.readRevision) return; this.loading.set(false); this.failed.set(true); this.error.set(e instanceof AppError ? e : null); });
  }
  filter(): void { this.page = 0; this.totalsPage = 0; this.load(); }
  clearFilters(): void { this.type = ''; this.status = ''; this.categoryId = ''; this.search = ''; this.from = this.today.slice(0, 8) + '01'; this.to = this.today.slice(0, 5) + '12-31'; this.filter(); }
  switchTab(tab: 'entries' | 'summary' | 'categories'): void { this.tab = tab; }
  private prepareEditor(editor: 'category' | 'entry' | 'settle' | 'cancel', loading: boolean): number {
    this.formError.set(''); this.command.set(null); this.editorFailed.set(false); this.editorLoading.set(loading); this.editor.set(editor); this.operationId = newUuid();
    return ++this.editorRevision;
  }
  openCategory(id?: string): void {
    if (this.context.transitionPending() || (!id && !this.permissions.canManageFinanceCategories())) return;
    const revision = this.prepareEditor('category', !!id);
    this.editingCategory.set(null); this.name = ''; this.code = ''; this.kind = 'BOTH'; this.catalogStatus = 'ACTIVE';
    if (id) this.scope.run(this.api.category(id), c => { if (revision !== this.editorRevision) return; this.editingCategory.set(c); this.name = c.name; this.code = c.code ?? ''; this.kind = c.kind; this.catalogStatus = c.status; this.editorLoading.set(false); }, e => this.editorFailure(revision, e));
  }
  saveCategory(): void {
    if (!this.permissions.canManageFinanceCategories() || this.saving() || this.editorLoading() || this.editorFailed() || this.editor() !== 'category' || this.context.transitionPending()) return;
    const name = this.name.trim(), code = this.code.trim() || null;
    if (!name || name.length > 120 || (code?.length ?? 0) > 60) { this.formError.set('Informe o nome da categoria e respeite os limites dos campos.'); return; }
    const old = this.editingCategory();
    const request = old ? this.api.patchCategory(old.id, { expectedVersion: old.version, name, nameSet: true, code, codeSet: true, kind: this.kind, kindSet: true, status: this.catalogStatus, statusSet: true }) : this.api.createCategory({ name, code, kind: this.kind });
    this.saving.set(true); this.formError.set('');
    this.scope.run(request, () => { this.saving.set(false); this.editor.set(null); this.toast.show('success', 'Categoria salva'); this.load(); }, e => { this.saving.set(false); this.formError.set(managementError(e, 'Não foi possível salvar a categoria. Revise os dados e tente novamente.')); });
  }
  openEntry(id?: string, action: 'entry' | 'settle' | 'cancel' = 'entry'): void {
    if (!this.permissions.canMutateFinance() || this.context.transitionPending()) return;
    const revision = this.prepareEditor(action, !!id);
    this.editingEntry.set(null); this.entryType = 'EXPENSE'; this.entryCategoryId = ''; this.description = ''; this.amount = ''; this.dueOn = this.today; this.notes = ''; this.settledOn = this.today; this.reason = '';
    if (id) this.scope.run(this.api.entry(id), e => {
      if (revision !== this.editorRevision) return;
      this.editingEntry.set(e); this.entryType = e.type; this.entryCategoryId = e.category.id; this.description = e.description; this.amount = String(e.amount); this.dueOn = e.dueOn; this.notes = e.notes ?? ''; this.editorLoading.set(false);
      if (e.status !== 'PENDING') { this.editorFailed.set(true); this.formError.set('Este lançamento já foi concluído. Consulte os detalhes e o histórico.'); }
    }, e => this.editorFailure(revision, e));
  }
  private editorFailure(revision: number, error: unknown): void { if (revision !== this.editorRevision) return; this.editorLoading.set(false); this.editorFailed.set(true); this.formError.set(managementError(error, 'Não foi possível carregar o cadastro. Feche e tente novamente.')); }
  closeEditor(): void { if (!this.saving()) { this.editorRevision++; this.editor.set(null); this.command.set(null); } }
  review(): void {
    if (!this.permissions.canMutateFinance() || this.saving() || this.editorLoading() || this.editorFailed() || this.context.transitionPending()) return;
    const entry = this.editingEntry(); const editor = this.editor();
    this.formError.set('');
    if (editor === 'settle' && entry) {
      if (!validImportDate(this.settledOn)) { this.formError.set('Informe uma data válida para a liquidação.'); return; }
      this.command.set({ kind: 'settle', id: entry.id, body: { operationId: this.operationId, expectedVersion: entry.version, settledOn: this.settledOn } });
    } else if (editor === 'cancel' && entry) {
      if (!this.reason.trim() || this.reason.trim().length > 2000) { this.formError.set('Descreva o motivo do cancelamento, com até 2.000 caracteres.'); return; }
      this.command.set({ kind: 'cancel', id: entry.id, body: { operationId: this.operationId, expectedVersion: entry.version, reason: this.reason.trim() } });
    } else if (editor === 'entry') {
      const amount = positiveDecimal(this.amount, 2), description = this.description.trim();
      if (!amount || !description || description.length > 240 || !validImportDate(this.dueOn) || this.notes.trim().length > 2000 || !this.compatibleCategories.some(c => c.id === this.entryCategoryId)) { this.formError.set('Selecione uma categoria ativa compatível, informe descrição, valor positivo com até 2 casas decimais e vencimento válido.'); return; }
      const data = { categoryId: this.entryCategoryId, description, amount, dueOn: this.dueOn, notes: this.notes.trim() || null };
      this.command.set(entry ? { kind: 'patch', id: entry.id, body: { ...data, expectedVersion: entry.version, categoryIdSet: true, descriptionSet: true, amountSet: true, dueOnSet: true, notesSet: true } } : { kind: 'create', body: { ...data, operationId: this.operationId, type: this.entryType } });
    }
  }
  confirm(): void {
    const command = this.command();
    if (!command || this.saving() || !this.permissions.canMutateFinance() || this.context.transitionPending()) return;
    let request: Observable<FinanceEntry>;
    switch (command.kind) { case 'create': request = this.api.create(command.body); break; case 'patch': request = this.api.patch(command.id, command.body); break; case 'settle': request = this.api.settle(command.id, command.body); break; case 'cancel': request = this.api.cancel(command.id, command.body); break; }
    this.saving.set(true); this.formError.set('');
    this.scope.run(request, entry => { this.saving.set(false); this.editor.set(null); this.command.set(null); this.toast.show('success', 'Operação financeira concluída'); this.load(); this.openDetail(entry.id); }, e => { this.saving.set(false); this.formError.set(managementError(e, 'Não foi possível concluir a operação. Tente novamente mantendo os dados confirmados.')); });
  }
  openDetail(id: string): void {
    if (this.context.transitionPending()) return;
    const revision = ++this.detailRevision;
    this.detailOpen.set(true); this.detailLoading.set(true); this.detailError.set(''); this.detail.set(null); this.history.set([]); this.historyPage = 0;
    this.scope.run(forkJoin({ entry: this.api.entry(id), history: this.api.history(id) }), result => { if (revision !== this.detailRevision) return; this.detail.set(result.entry); this.history.set(result.history); this.detailLoading.set(false); }, e => { if (revision !== this.detailRevision) return; this.detailLoading.set(false); this.detailError.set(managementError(e, 'Não foi possível carregar o lançamento e seu histórico. Feche e tente novamente.')); });
  }
  closeDetail(): void { this.detailRevision++; this.detailOpen.set(false); }
  categoryName(id: string): string { return this.categories().find(c => c.id === id)?.name ?? 'Categoria indisponível'; }
  eventDescription(event: FinanceEvent): string {
    if (event.type === 'CANCELLED') return typeof event.details['reason'] === 'string' ? event.details['reason'] : 'Motivo não informado';
    if (event.type === 'SETTLED') return `Liquidação em ${this.date(String(event.details['settledOn'] ?? event.occurredOn ?? ''))}`;
    if (event.type === 'CORRECTED') return `Dados corrigidos · versão ${event.details['version'] ?? 'não informada'}`;
    return 'Receita ou despesa registrada para acompanhamento financeiro.';
  }
  eventAmount(event: FinanceEvent): string | number | null { const amount = event.details['amount']; return typeof amount === 'string' || typeof amount === 'number' ? amount : null; }
}
