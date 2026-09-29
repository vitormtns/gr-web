import { ExactDecimalPipe } from '../management/exact-decimal';
import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable, forkJoin } from 'rxjs';
import { AppError } from '../../core/api/api.models';
import { ContextStore } from '../../core/context/context.store';
import { localDateOnly } from '../../core/date/date-only';
import { PermissionService } from '../../core/permissions/permission.service';
import { ErrorStateComponent, SkeletonComponent, ToastService } from '../../design-system/feedback/feedback';
import { DialogComponent } from '../../design-system/surfaces/surfaces';
import { newUuid } from '../herd/herd.models';
import { validImportDate } from '../herd/herd-import';
import { formatDate } from '../herd/herd.shared';
import { ContextRequestScope, managementError, managementTimestamp, positiveDecimal } from '../management/management.shared';
import { InventoryApi } from './inventory-api.service';
import { InventoryBalance, InventoryLocation, InventoryMovement, InventoryMovementCommand, InventoryMovementType, InventoryPage, InventoryProduct, InventoryStatus, InventoryUnit, movementLabels, unitLabels } from './inventory.models';

type Tab = 'stock' | 'products' | 'locations' | 'movements';
@Component({
  selector: 'app-inventory-page',
  imports: [FormsModule, ExactDecimalPipe, ErrorStateComponent, SkeletonComponent, DialogComponent],
  templateUrl: './inventory-page.component.html',
  styleUrl: '../management/management.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryPageComponent {
  private readonly api = inject(InventoryApi);
  private readonly toast = inject(ToastService);
  private readonly scope = new ContextRequestScope(inject(DestroyRef));
  readonly context = inject(ContextStore);
  readonly permissions = inject(PermissionService);
  readonly loading = signal(true);
  readonly error = signal<AppError | null>(null);
  readonly failed = signal(false);
  readonly products = signal<InventoryProduct[]>([]);
  readonly locations = signal<InventoryLocation[]>([]);
  readonly stock = signal<InventoryPage<InventoryBalance> | null>(null);
  readonly movements = signal<InventoryPage<InventoryMovement> | null>(null);
  readonly editor = signal<'product' | 'location' | 'movement' | null>(null);
  readonly editingProduct = signal<InventoryProduct | null>(null);
  readonly editingLocation = signal<InventoryLocation | null>(null);
  readonly movementDetail = signal<InventoryMovement | null>(null);
  readonly locationDetail = signal<InventoryLocation | null>(null);
  readonly locationBalances = signal<InventoryPage<InventoryBalance> | null>(null);
  readonly detailOpen = signal(false);
  readonly detailLoading = signal(false);
  readonly catalogLoadFailed = signal(false);
  readonly detailError = signal('');
  readonly saving = signal(false);
  readonly formError = signal('');
  readonly confirmation = signal<InventoryMovementCommand | null>(null);
  readonly labels = movementLabels;
  readonly units = unitLabels;
  readonly movementTypes = Object.keys(movementLabels) as InventoryMovementType[];
  readonly unitOptions = Object.keys(unitLabels) as InventoryUnit[];
  readonly today = localDateOnly(new Date());
  readonly date = formatDate;
  readonly timestamp = managementTimestamp;
  tab: Tab = 'stock';
  productId = ''; locationId = ''; search = ''; onlyPositive = false;
  type: InventoryMovementType | '' = ''; from = ''; to = '';
  catalogSearch = ''; catalogStatus: InventoryStatus | '' = ''; catalogPage = 0; page = 0;
  name = ''; code = ''; category = ''; baseUnit: InventoryUnit = 'UNIT'; status: InventoryStatus = 'ACTIVE';
  moveType: InventoryMovementType = 'RECEIPT'; moveProductId = ''; sourceId = ''; destinationId = ''; quantity = ''; occurredOn = this.today; notes = '';
  private operationId = newUuid();
  private recordId = newUuid();
  private readRevision = 0;
  private detailRevision = 0;
  private editorRevision = 0;

  constructor() {
    effect(() => {
      this.context.contextVersion(); this.context.selectedFarm(); this.context.selectedOrganization();
      const pending = this.context.transitionPending();
      this.scope.reset(); this.readRevision++; this.detailRevision++; this.editorRevision++;
      this.products.set([]); this.locations.set([]); this.stock.set(null); this.movements.set(null);
      this.editor.set(null); this.confirmation.set(null); this.detailOpen.set(false);
      this.editingProduct.set(null); this.editingLocation.set(null); this.movementDetail.set(null); this.locationDetail.set(null);
      this.saving.set(false); this.formError.set(''); this.error.set(null); this.failed.set(false);
      this.productId = ''; this.locationId = ''; this.search = ''; this.onlyPositive = false;
      this.catalogSearch = ''; this.catalogStatus = ''; this.catalogPage = 0; this.page = 0;
      this.type = ''; this.from = ''; this.to = ''; this.loading.set(true);
      if (!pending && this.context.selectedFarm()) this.load();
    });
  }

  get activeProducts(): InventoryProduct[] { return this.products().filter(x => x.status === 'ACTIVE'); }
  get activeLocations(): InventoryLocation[] { return this.locations().filter(x => x.status === 'ACTIVE'); }
  get filteredProducts(): InventoryProduct[] { return this.products().filter(x => this.catalogMatch(x.name, x.code, x.status, x.category)); }
  get filteredLocations(): InventoryLocation[] { return this.locations().filter(x => this.catalogMatch(x.name, x.code, x.status)); }
  get catalogTotal(): number { return this.tab === 'products' ? this.filteredProducts.length : this.filteredLocations.length; }
  get catalogPages(): number { return Math.max(1, Math.ceil(this.catalogTotal / 20)); }
  get productRows(): InventoryProduct[] { return this.filteredProducts.slice(this.catalogPage * 20, (this.catalogPage + 1) * 20); }
  get locationRows(): InventoryLocation[] { return this.filteredLocations.slice(this.catalogPage * 20, (this.catalogPage + 1) * 20); }
  get outgoing(): boolean { return ['ISSUE', 'ADJUSTMENT_OUT', 'TRANSFER'].includes(this.moveType); }
  get incoming(): boolean { return ['RECEIPT', 'ADJUSTMENT_IN', 'TRANSFER'].includes(this.moveType); }
  get movementUnit(): string { return this.units[this.products().find(x => x.id === this.moveProductId)?.baseUnit ?? 'UNIT']; }
  get readonlyCatalog(): boolean { return !this.permissions.canManageInventoryCatalog(); }
  private catalogMatch(name: string, code: string | null, status: InventoryStatus, category?: string | null): boolean {
    const search = this.catalogSearch.trim().toLocaleLowerCase('pt-BR');
    return (!this.catalogStatus || status === this.catalogStatus) && (!search || `${name} ${code ?? ''} ${category ?? ''}`.toLocaleLowerCase('pt-BR').includes(search));
  }
  switchTab(tab: Tab): void { this.tab = tab; this.page = 0; this.catalogPage = 0; this.catalogSearch = ''; this.catalogStatus = ''; }
  filter(): void { this.page = 0; this.load(); }
  clearFilters(): void { this.productId = ''; this.locationId = ''; this.search = ''; this.onlyPositive = false; this.type = ''; this.from = ''; this.to = ''; this.filter(); }
  load(): void {
    if (this.context.transitionPending() || !this.context.selectedFarm()) return;
    if ((this.from && !validImportDate(this.from)) || (this.to && !validImportDate(this.to)) || (this.from && this.to && this.from > this.to)) {
      this.formError.set('Informe um período válido, com a data inicial anterior ou igual à final.'); return;
    }
    this.formError.set(''); this.loading.set(true); this.error.set(null); this.failed.set(false);
    const revision = ++this.readRevision;
    this.scope.run(forkJoin({ products: this.api.products(), locations: this.api.locations(),
      stock: this.api.stock({ productId: this.productId, locationId: this.locationId, search: this.search.trim(), onlyPositive: this.onlyPositive, page: this.tab === 'stock' ? this.page : 0 }),
      movements: this.api.movements({ type: this.type, productId: this.productId, locationId: this.locationId, from: this.from, to: this.to, page: this.tab === 'movements' ? this.page : 0 }),
    }), result => {
      if (revision !== this.readRevision) return;
      this.products.set(result.products); this.locations.set(result.locations); this.stock.set(result.stock); this.movements.set(result.movements); this.loading.set(false);
    }, failure => { if (revision !== this.readRevision) return; this.loading.set(false); this.failed.set(true); this.error.set(failure instanceof AppError ? failure : null); });
  }
  openProduct(id?: string): void {
    if (this.context.transitionPending() || (!id && this.readonlyCatalog)) return;
    const revision = ++this.editorRevision;
    this.catalogLoadFailed.set(false);
    this.formError.set(''); this.editingProduct.set(null); this.recordId = newUuid(); this.name = ''; this.code = ''; this.category = ''; this.baseUnit = 'UNIT'; this.status = 'ACTIVE';
    this.editor.set('product'); this.detailLoading.set(!!id);
    if (id) this.scope.run(this.api.product(id), x => { if (revision !== this.editorRevision) return; this.editingProduct.set(x); this.name = x.name; this.code = x.code ?? ''; this.category = x.category ?? ''; this.baseUnit = x.baseUnit; this.status = x.status; this.detailLoading.set(false); }, e => { if (revision !== this.editorRevision) return; this.detailLoading.set(false); this.catalogLoadFailed.set(true); this.formError.set(managementError(e, 'Não foi possível carregar o produto. Feche e tente novamente.')); });
  }
  openLocation(id?: string): void {
    if (this.context.transitionPending() || (!id && this.readonlyCatalog)) return;
    const revision = ++this.editorRevision;
    this.catalogLoadFailed.set(false);
    this.formError.set(''); this.editingLocation.set(null); this.recordId = newUuid(); this.name = ''; this.code = ''; this.status = 'ACTIVE';
    this.editor.set('location'); this.detailLoading.set(!!id);
    if (id) this.scope.run(this.api.location(id), x => { if (revision !== this.editorRevision) return; this.editingLocation.set(x); this.name = x.name; this.code = x.code ?? ''; this.status = x.status; this.detailLoading.set(false); }, e => { if (revision !== this.editorRevision) return; this.detailLoading.set(false); this.catalogLoadFailed.set(true); this.formError.set(managementError(e, 'Não foi possível carregar o depósito. Feche e tente novamente.')); });
  }
  closeEditor(): void { if (!this.saving()) { this.editorRevision++; this.editor.set(null); this.confirmation.set(null); } }
  saveCatalog(): void {
    if (this.readonlyCatalog || this.saving() || this.detailLoading() || this.catalogLoadFailed() || this.context.transitionPending()) return;
    const name = this.name.trim(), code = this.code.trim() || null;
    if (!name || name.length > 160 || (code?.length ?? 0) > 80 || this.category.trim().length > 120) { this.formError.set('Informe um nome válido e respeite os limites dos campos.'); return; }
    let request: Observable<InventoryProduct | InventoryLocation>;
    if (this.editor() === 'product') {
      const product = this.editingProduct();
      request = product ? this.api.patchProduct(product.id, { name, code, category: this.category.trim() || null, status: this.status, expectedVersion: product.version }) : this.api.createProduct({ id: this.recordId, name, code, category: this.category.trim() || null, baseUnit: this.baseUnit });
    } else if (this.editor() === 'location') {
      const location = this.editingLocation();
      request = location ? this.api.patchLocation(location.id, { name, code, status: this.status, expectedVersion: location.version }) : this.api.createLocation({ id: this.recordId, name, code });
    } else return;
    this.saving.set(true); this.formError.set('');
    this.scope.run(request, () => { this.saving.set(false); this.editor.set(null); this.toast.show('success', 'Cadastro salvo'); this.load(); }, e => { this.saving.set(false); this.formError.set(this.inventoryError(e)); });
  }
  openMovement(): void {
    if (!this.permissions.canMutateInventory() || this.context.transitionPending()) return;
    this.editorRevision++; this.detailLoading.set(false);
    this.operationId = newUuid(); this.moveType = 'RECEIPT'; this.moveProductId = ''; this.sourceId = ''; this.destinationId = ''; this.quantity = ''; this.occurredOn = this.today; this.notes = '';
    this.formError.set(''); this.confirmation.set(null); this.editor.set('movement');
  }
  reviewMovement(): void {
    if (!this.permissions.canMutateInventory() || this.saving() || this.context.transitionPending()) return;
    const quantity = positiveDecimal(this.quantity, 6);
    const source = this.outgoing ? this.sourceId : null, destination = this.incoming ? this.destinationId : null;
    if (!quantity || !this.activeProducts.some(x => x.id === this.moveProductId) || !validImportDate(this.occurredOn) || this.occurredOn > this.today || (this.outgoing && !this.activeLocations.some(x => x.id === source)) || (this.incoming && !this.activeLocations.some(x => x.id === destination)) || (source && source === destination)) {
      this.formError.set('Selecione produto e depósitos ativos, informe quantidade positiva com até 6 casas decimais e uma data não futura. Na transferência, os depósitos devem ser diferentes.'); return;
    }
    if ((this.moveType === 'ADJUSTMENT_IN' || this.moveType === 'ADJUSTMENT_OUT') && !this.notes.trim()) { this.formError.set('Descreva o motivo do ajuste nas observações.'); return; }
    this.formError.set(''); this.confirmation.set({ operationId: this.operationId, type: this.moveType, productId: this.moveProductId, sourceLocationId: source, destinationLocationId: destination, quantity, occurredOn: this.occurredOn, notes: this.notes.trim() || null });
  }
  confirmMovement(): void {
    const body = this.confirmation();
    if (!body || this.saving() || !this.permissions.canMutateInventory() || this.context.transitionPending()) return;
    this.saving.set(true); this.formError.set('');
    this.scope.run(this.api.move(body), movement => { this.saving.set(false); this.editor.set(null); this.confirmation.set(null); this.toast.show('success', 'Movimentação registrada', 'O saldo foi atualizado pelo serviço.'); this.load(); this.movementDetail.set(movement); this.locationDetail.set(null); this.detailError.set(''); this.detailLoading.set(false); this.detailOpen.set(true); }, e => { this.saving.set(false); this.formError.set(this.inventoryError(e)); });
  }
  openMovementDetail(id: string): void {
    this.detailOpen.set(true); this.detailLoading.set(true); this.detailError.set(''); this.movementDetail.set(null); this.locationDetail.set(null);
    const revision = ++this.detailRevision;
    this.scope.run(this.api.movement(id), x => { if (revision !== this.detailRevision) return; this.movementDetail.set(x); this.detailLoading.set(false); }, e => { if (revision !== this.detailRevision) return; this.detailLoading.set(false); this.detailError.set(managementError(e, 'Não foi possível carregar a movimentação. Feche e tente novamente.')); });
  }
  openLocationStock(id: string, page = 0): void {
    this.detailOpen.set(true); this.detailLoading.set(true); this.detailError.set(''); this.movementDetail.set(null); this.locationDetail.set(null); this.locationBalances.set(null);
    const revision = ++this.detailRevision;
    this.scope.run(forkJoin({ location: this.api.location(id), balances: this.api.locationStock(id, page) }), x => { if (revision !== this.detailRevision) return; this.locationDetail.set(x.location); this.locationBalances.set(x.balances); this.detailLoading.set(false); }, e => { if (revision !== this.detailRevision) return; this.detailLoading.set(false); this.detailError.set(managementError(e, 'Não foi possível carregar o estoque do depósito. Feche e tente novamente.')); });
  }
  closeDetail(): void { this.detailRevision++; this.detailOpen.set(false); }
  productName(id: string): string { return this.products().find(x => x.id === id)?.name ?? 'Produto indisponível'; }
  locationName(id: string | null): string { return this.locations().find(x => x.id === id)?.name ?? 'Não se aplica'; }
  private inventoryError(error: unknown): string {
    if (error instanceof AppError) {
      if (error.code === 'INVENTORY_INSUFFICIENT_STOCK') return 'O depósito de origem não possui saldo suficiente. Consulte o estoque e revise a quantidade.';
      if (error.code === 'INVENTORY_PRODUCT_IN_USE') return 'O produto possui saldo em estoque. Zere o saldo por uma movimentação válida antes de desativá-lo.';
      if (error.code === 'INVENTORY_LOCATION_NOT_EMPTY') return 'O depósito ainda possui estoque. Transfira ou registre a saída antes de desativá-lo.';
    }
    return managementError(error, 'Não foi possível concluir a operação. Tente novamente mantendo os dados informados.');
  }
}
