import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AppError } from '../../core/api/api.models';
import { ContextStore } from '../../core/context/context.store';
import { PermissionService } from '../../core/permissions/permission.service';
import { ErrorStateComponent, SkeletonComponent, ToastService } from '../../design-system/feedback/feedback';
import { DialogComponent } from '../../design-system/surfaces/surfaces';
import { Animal, AnimalStatus, Page, PaddockRef, newUuid, statusLabels } from '../herd/herd.models';
import { formatDate } from '../herd/herd.shared';
import { ContextRequestScope, managementError } from '../management/management.shared';
import { PaddockMovement, PaddockOccupancy, PaddocksApi } from './paddocks-api.service';

@Component({ selector: 'app-paddocks-page', imports: [FormsModule, RouterLink, ErrorStateComponent, SkeletonComponent, DialogComponent], templateUrl: './paddocks-page.component.html', styleUrl: '../management/management.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class PaddocksPageComponent {
  private readonly api = inject(PaddocksApi); private readonly scope = new ContextRequestScope(inject(DestroyRef)); private readonly toast = inject(ToastService);
  readonly context = inject(ContextStore); readonly permissions = inject(PermissionService);
  readonly loading = signal(true); readonly failed = signal(false); readonly error = signal<AppError | null>(null); readonly paddocks = signal<Page<PaddockRef> | null>(null);
  readonly editor = signal(false); readonly editing = signal<PaddockRef | null>(null); readonly editorLoading = signal(false); readonly editorFailed = signal(false); readonly saving = signal(false); readonly formError = signal('');
  readonly detailOpen = signal(false); readonly detailLoading = signal(false); readonly detailError = signal(''); readonly occupancy = signal<PaddockOccupancy | null>(null); readonly animals = signal<Page<Animal> | null>(null); readonly movements = signal<Page<PaddockMovement> | null>(null);
  readonly statusLabels = statusLabels; readonly date = formatDate;
  search = ''; status: 'ACTIVE' | 'INACTIVE' | '' = ''; page = 0; name = ''; code = ''; editStatus: 'ACTIVE' | 'INACTIVE' = 'ACTIVE'; animalPage = 0; movementPage = 0;
  private recordId = newUuid(); private selectedId = ''; private readRevision = 0; private editorRevision = 0; private detailRevision = 0;
  constructor() { effect(() => {
    this.context.contextVersion(); this.context.selectedOrganization(); this.context.selectedFarm(); const pending = this.context.transitionPending();
    this.scope.reset(); this.readRevision++; this.editorRevision++; this.detailRevision++;
    this.paddocks.set(null); this.editor.set(false); this.editing.set(null); this.saving.set(false); this.formError.set(''); this.detailOpen.set(false); this.occupancy.set(null); this.animals.set(null); this.movements.set(null); this.selectedId = '';
    this.search = ''; this.status = ''; this.page = 0; this.animalPage = 0; this.movementPage = 0; this.loading.set(true); this.failed.set(false); this.error.set(null);
    if (!pending && this.context.selectedFarm()) this.load();
  }); }
  get statusCounts(): { label: string; count: number }[] { return Object.entries(this.occupancy()?.countsByStatus ?? {}).map(([key, count]) => ({ label: statusLabels[key as AnimalStatus] ?? 'Situação não informada', count })); }
  load(): void {
    if (this.context.transitionPending() || !this.context.selectedFarm()) return;
    const revision = ++this.readRevision; this.loading.set(true); this.failed.set(false); this.error.set(null);
    this.scope.run(this.api.list({ search: this.search.trim(), status: this.status, page: this.page }), result => { if (revision !== this.readRevision) return; this.paddocks.set(result); this.loading.set(false); }, e => { if (revision !== this.readRevision) return; this.loading.set(false); this.failed.set(true); this.error.set(e instanceof AppError ? e : null); });
  }
  filter(): void { this.page = 0; this.load(); }
  openEditor(id?: string): void {
    if (!this.permissions.canManagePaddocks() || this.context.transitionPending()) return;
    const revision = ++this.editorRevision; this.editor.set(true); this.editorLoading.set(!!id); this.editorFailed.set(false); this.formError.set(''); this.editing.set(null); this.recordId = newUuid(); this.name = ''; this.code = ''; this.editStatus = 'ACTIVE';
    if (id) this.scope.run(this.api.get(id), p => { if (revision !== this.editorRevision) return; this.editing.set(p); this.name = p.name; this.code = p.code ?? ''; this.editStatus = p.status; this.editorLoading.set(false); }, e => { if (revision !== this.editorRevision) return; this.editorLoading.set(false); this.editorFailed.set(true); this.formError.set(managementError(e, 'Não foi possível carregar o piquete. Feche e tente novamente.')); });
  }
  closeEditor(): void { if (!this.saving()) { this.editorRevision++; this.editor.set(false); } }
  save(): void {
    if (!this.permissions.canManagePaddocks() || !this.editor() || this.saving() || this.editorLoading() || this.editorFailed() || this.context.transitionPending()) return;
    const name = this.name.trim(), code = this.code.trim() || null;
    if (!name || name.length > 120 || (code?.length ?? 0) > 60) { this.formError.set('Informe o nome do piquete com até 120 caracteres e o código com até 60.'); return; }
    const old = this.editing(); const request = old ? this.api.patch(old.id, { expectedVersion: old.version, name, code, status: this.editStatus }) : this.api.create({ id: this.recordId, name, code });
    this.saving.set(true); this.formError.set('');
    this.scope.run(request, () => { this.saving.set(false); this.editor.set(false); this.toast.show('success', 'Piquete salvo'); this.load(); }, e => { this.saving.set(false); this.formError.set(e instanceof AppError && e.code === 'HERD_PADDOCK_OCCUPIED' ? 'O piquete ainda possui animais. Movimente-os antes de desativá-lo.' : managementError(e, 'Não foi possível salvar o piquete. Revise os dados e tente novamente.')); });
  }
  openDetail(id: string): void { if (this.context.transitionPending()) return; this.selectedId = id; this.animalPage = 0; this.movementPage = 0; this.detailOpen.set(true); this.loadDetail(); }
  loadDetail(): void {
    if (!this.selectedId || this.context.transitionPending()) return;
    const revision = ++this.detailRevision; this.detailLoading.set(true); this.detailError.set('');
    this.scope.run(forkJoin({ occupancy: this.api.occupancy(this.selectedId), animals: this.api.animals(this.selectedId, this.animalPage), movements: this.api.movements(this.selectedId, this.movementPage) }), result => { if (revision !== this.detailRevision) return; this.occupancy.set(result.occupancy); this.animals.set(result.animals); this.movements.set(result.movements); this.detailLoading.set(false); }, e => { if (revision !== this.detailRevision) return; this.detailLoading.set(false); this.detailError.set(managementError(e, 'Não foi possível carregar a ocupação e o histórico do piquete. Tente novamente.')); });
  }
  closeDetail(): void { this.detailRevision++; this.detailOpen.set(false); }
}
