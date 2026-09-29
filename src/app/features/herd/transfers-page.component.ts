import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ContextStore } from '../../core/context/context.store';
import { PaginationComponent, TableComponent } from '../../design-system/data-display/data-display';
import { EmptyStateComponent, ErrorStateComponent } from '../../design-system/feedback/feedback';
import { DialogComponent } from '../../design-system/surfaces/surfaces';
import {
  ContextRequestScope,
  managementError,
  managementTimestamp,
} from '../management/management.shared';
import { HerdApi } from './herd-api.service';
import { Page, TransferItem } from './herd.models';
import { formatDate } from './herd.shared';

@Component({
  selector: 'app-transfers-page',
  providers: [HerdApi],
  imports: [
    FormsModule,
    RouterLink,
    PaginationComponent,
    TableComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    DialogComponent,
  ],
  template: `<div class="herd-page page-enter">
    <header class="page-header">
      <div>
        <span class="eyebrow">CUSTÓDIA · {{ context.selectedFarm()?.farmName }}</span>
        <h1>Transferências entre fazendas</h1>
        <p>Entradas e saídas de animais, com o registro da responsabilidade entre fazendas.</p>
      </div>
      <a class="secondary-action" routerLink="/rebanho/animais">Selecionar animais</a>
    </header>
    <nav class="transfer-nav" aria-label="Históricos de movimentação">
      <a class="secondary-action" routerLink="/rebanho/movimentacoes">Entre piquetes</a
      ><span class="primary-action" aria-current="page">Entre fazendas</span>
    </nav>
    <form class="transfer-filters" (ngSubmit)="applyFilters()">
      <label
        >Direção<select [(ngModel)]="direction" name="direction">
          <option value="ALL">Todas</option>
          <option value="IN">Entradas</option>
          <option value="OUT">Saídas</option>
        </select></label
      ><label
        >Identificador do animal<input
          [(ngModel)]="animalId"
          name="animalId"
          placeholder="UUID do animal (opcional)" /></label
      ><button class="secondary-action" type="submit">Aplicar filtros</button>
      @if (filtered()) {
        <button class="quiet-button" type="button" (click)="clearFilters()">Limpar filtros</button>
      }
    </form>
    @if (error()) {
      <gr-error-state
        level="page"
        title="Não foi possível carregar as transferências"
        [description]="error()"
        (retry)="load()"
      />
    } @else if (!loading() && data()?.totalElements === 0) {
      <div class="empty-frame">
        <gr-empty-state
          [title]="
            filtered()
              ? 'Nenhuma transferência corresponde aos filtros'
              : 'Nenhuma transferência registrada'
          "
          description="O histórico conserva as fazendas de origem e destino, mesmo após a mudança de custódia."
        />
      </div>
    } @else {
      <section class="herd-surface">
        <gr-table [loading]="loading()"
          ><thead>
            <tr>
              <th>Data</th>
              <th>Animal</th>
              <th>Origem</th>
              <th>Destino</th>
              <th>Piquete de destino</th>
              <th>Registro</th>
            </tr>
          </thead>
          <tbody>
            @for (item of data()?.items || []; track item.id) {
              <tr>
                <td>{{ date(item.occurredOn) }}</td>
                <td>
                  <code>{{ item.animalId }}</code>
                </td>
                <td>{{ item.sourceFarm.name }}</td>
                <td>{{ item.destinationFarm.name }}</td>
                <td>{{ item.destinationPaddock?.name || 'Sem piquete definido' }}</td>
                <td>
                  <button class="quiet-button" type="button" (click)="openDetail(item.id)">
                    Ver detalhes
                  </button>
                </td>
              </tr>
            }
          </tbody></gr-table
        >
        @if (data(); as page) {
          <gr-pagination
            [page]="page.page"
            [totalPages]="page.totalPages"
            (pageChange)="changePage($event)"
          />
        }
      </section>
    }
    <gr-dialog [open]="detailOpen()" (closed)="closeDetail()"
      ><span dialog-title>Registro de transferência</span>
      @if (detailLoading()) {
        <p role="status">Carregando o registro…</p>
      } @else if (detailError()) {
        <p role="alert" class="form-error">{{ detailError() }}</p>
        <button class="secondary-action" type="button" (click)="retryDetail()">
          Tentar novamente
        </button>
      } @else if (detail(); as item) {
        <dl class="transfer-detail">
          <dt>Animal</dt>
          <dd>
            <code>{{ item.animalId }}</code>
          </dd>
          <dt>Origem</dt>
          <dd>{{ item.sourceFarm.name }}</dd>
          <dt>Destino</dt>
          <dd>{{ item.destinationFarm.name }}</dd>
          <dt>Piquete</dt>
          <dd>{{ item.destinationPaddock?.name || 'Sem piquete definido' }}</dd>
          <dt>Data da transferência</dt>
          <dd>{{ date(item.occurredOn) }}</dd>
          <dt>Registrada em</dt>
          <dd>{{ timestamp(item.recordedAt) }}</dd>
          <dt>Responsável</dt>
          <dd>
            {{
              item.actorUserId === context.user()?.userId
                ? 'Você'
                : item.actorUserId || 'Não informado'
            }}
          </dd>
          <dt>Versão resultante</dt>
          <dd>{{ item.resultingVersion }}</dd>
          <dt>Observações</dt>
          <dd>{{ item.notes || 'Sem observações' }}</dd>
        </dl>
        <p>O perfil atual pode ser consultado na fazenda de destino, conforme seu acesso.</p>
        @if (canViewAnimal(item)) {
          <button
            class="secondary-action"
            type="button"
            [disabled]="context.transitionPending()"
            (click)="viewAnimal(item)"
          >
            Ver animal na fazenda de destino
          </button>
        }
      }
    </gr-dialog>
  </div>`,
  styleUrl: './transfers-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransfersPageComponent {
  private readonly api = inject(HerdApi);
  private readonly router = inject(Router);
  private readonly scope = new ContextRequestScope(inject(DestroyRef));
  private readonly details = new ContextRequestScope(inject(DestroyRef));
  readonly context = inject(ContextStore);
  readonly data = signal<Page<TransferItem> | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly detail = signal<TransferItem | null>(null);
  readonly detailOpen = signal(false);
  readonly detailLoading = signal(false);
  readonly detailError = signal('');
  direction: 'ALL' | 'IN' | 'OUT' = 'ALL';
  animalId = '';
  private filters: { direction: 'ALL' | 'IN' | 'OUT'; animalId?: string; page: number } = {
    direction: 'ALL',
    page: 0,
  };
  private detailId = '';
  date = formatDate;
  timestamp = managementTimestamp;
  constructor() {
    effect(() => {
      this.context.contextVersion();
      const pending = this.context.transitionPending();
      const farm = this.context.selectedFarm();
      untracked(() => {
        this.scope.reset();
        this.closeDetail();
        this.direction = 'ALL';
        this.animalId = '';
        this.filters = { direction: 'ALL', page: 0 };
        this.data.set(null);
        this.error.set('');
        this.loading.set(true);
        if (!pending && farm) this.load();
      });
    });
  }
  filtered() {
    return this.filters.direction !== 'ALL' || !!this.filters.animalId;
  }
  applyFilters() {
    const id = this.animalId.trim();
    if (id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      this.error.set('Informe um identificador de animal válido.');
      return;
    }
    this.filters = { direction: this.direction, animalId: id || undefined, page: 0 };
    this.load();
  }
  clearFilters() {
    this.direction = 'ALL';
    this.animalId = '';
    this.applyFilters();
  }
  changePage(page: number) {
    this.filters = { ...this.filters, page };
    this.load();
  }
  load() {
    if (this.context.transitionPending() || !this.context.selectedFarm()) return;
    this.scope.reset();
    this.loading.set(true);
    this.data.set(null);
    this.error.set('');
    this.scope.run(
      this.api.transfers(this.filters),
      (value) => {
        this.data.set(value);
        this.loading.set(false);
      },
      (failure) => {
        this.loading.set(false);
        this.error.set(
          managementError(failure, 'Não foi possível carregar o histórico. Tente novamente.'),
        );
      },
    );
  }
  openDetail(id: string) {
    if (this.context.transitionPending()) return;
    this.details.reset();
    this.detailId = id;
    this.detailOpen.set(true);
    this.detailLoading.set(true);
    this.detail.set(null);
    this.detailError.set('');
    this.details.run(
      this.api.transferDetail(id),
      (value) => {
        this.detail.set(value);
        this.detailLoading.set(false);
      },
      (failure) => {
        this.detailLoading.set(false);
        this.detailError.set(
          managementError(failure, 'Não foi possível carregar o registro. Tente novamente.'),
        );
      },
    );
  }
  retryDetail() {
    if (this.detailId) this.openDetail(this.detailId);
  }
  closeDetail() {
    this.details.reset();
    this.detailOpen.set(false);
    this.detail.set(null);
    this.detailId = '';
    this.detailLoading.set(false);
    this.detailError.set('');
  }
  canViewAnimal(item: TransferItem) {
    return this.context.farms().some((farm) => farm.farmId === item.destinationFarm.id);
  }
  async viewAnimal(item: TransferItem) {
    if (!this.canViewAnimal(item) || this.context.transitionPending()) return;
    try {
      await this.context.selectFarm(item.destinationFarm.id);
      if (this.context.selectedFarm()?.farmId === item.destinationFarm.id)
        await this.router.navigate(['/rebanho/animais', item.animalId]);
    } catch {
      this.detailError.set(
        'Não foi possível acessar a fazenda de destino. Recarregue seu contexto de acesso.',
      );
    }
  }
}
