import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, map, Subject } from 'rxjs';
import { ContextStore } from '../../core/context/context.store';
import { PermissionService } from '../../core/permissions/permission.service';
import { AppError } from '../../core/api/api.models';
import { localDateOnly } from '../../core/date/date-only';
import {
  FilterBarComponent,
  PaginationComponent,
  TableComponent,
} from '../../design-system/data-display/data-display';
import {
  EmptyStateComponent,
  ErrorStateComponent,
  ToastService,
} from '../../design-system/feedback/feedback';
import { AnimalBatchOperationsComponent } from './animal-batch-operations.component';
import { ContextRequestScope } from '../management/management.shared';
import { HerdApi } from './herd-api.service';
import { Animal, AnimalFilters, AnimalSex, AnimalStatus, Page } from './herd.models';
import {
  AnimalIdentityComponent,
  AnimalStateComponent,
  errorReference,
  sexLabel,
} from './herd.shared';

@Component({
  selector: 'app-animal-list-page',
  providers: [HerdApi],
  imports: [
    FormsModule,
    RouterLink,
    FilterBarComponent,
    PaginationComponent,
    TableComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    AnimalBatchOperationsComponent,
    AnimalIdentityComponent,
    AnimalStateComponent,
  ],
  template: `<div class="herd-page page-enter">
    <header class="page-header">
      <div>
        <span class="eyebrow">REBANHO · {{ context.selectedFarm()?.farmName }}</span>
        <h1>Animais</h1>
        <p>Identidade, estado e localização do rebanho atual.</p>
      </div>
      @if (permissions.canMutateHerd()) {
        <div class="parity-actions">
          <a class="secondary-action" routerLink="/rebanho/animais/importar">Importar animais</a
          ><a class="primary-action" routerLink="/rebanho/animais/novo">Cadastrar animal</a>
        </div>
      }
    </header>
    <gr-filter-bar
      ><label class="search-field"
        ><span>Buscar animal</span
        ><input
          type="search"
          [ngModel]="filters().search"
          (ngModelChange)="searchInput.next($event)"
          placeholder="Identificação ou nome" /></label
      ><label
        ><span>Sexo</span
        ><select [ngModel]="filters().sex" (ngModelChange)="setFilter('sex', $event)">
          <option value="">Todos</option>
          <option value="FEMALE">Fêmea</option>
          <option value="MALE">Macho</option>
        </select></label
      ><label
        ><span>Estado</span
        ><select [ngModel]="filters().status" (ngModelChange)="setFilter('status', $event)">
          <option value="">Todos</option>
          <option value="ACTIVE">Ativo</option>
          <option value="SOLD">Vendido</option>
          <option value="DECEASED">Baixado</option>
          <option value="TRANSFERRED">Transferido</option>
          <option value="ARCHIVED">Arquivado</option>
        </select></label
      ><label
        ><span>Localização</span
        ><select
          [ngModel]="
            filters().unlocated === undefined ? '' : filters().unlocated ? 'UNLOCATED' : 'LOCATED'
          "
          (ngModelChange)="setLocation($event)"
        >
          <option value="">Todas</option>
          <option value="UNLOCATED">Sem piquete</option>
          <option value="LOCATED">Com piquete</option>
        </select></label
      >
      @if (hasFilters()) {
        <button class="quiet-button" type="button" (click)="clearFilters()">Limpar filtros</button>
      }
    </gr-filter-bar>
    @if (state() === 'error') {
      <gr-error-state
        level="page"
        title="Não foi possível carregar os animais"
        [description]="error()?.message || 'Tente novamente em instantes.'"
        [reference]="reference"
        (retry)="load()"
      />
    } @else if (state() === 'ready' && page()?.totalElements === 0) {
      <div class="empty-frame">
        <gr-empty-state
          [title]="hasFilters() ? 'Nenhum animal corresponde aos filtros' : 'O rebanho começa aqui'"
          [description]="
            hasFilters()
              ? 'Ajuste a busca ou remova um dos filtros ativos.'
              : 'Cadastre o primeiro animal para iniciar o histórico desta fazenda.'
          "
        >
          @if (!hasFilters() && permissions.canMutateHerd()) {
            <a class="primary-action" routerLink="/rebanho/animais/novo"
              >Cadastrar primeiro animal</a
            >
          }
          @if (hasFilters()) {
            <button class="secondary-action" type="button" (click)="clearFilters()">
              Limpar filtros
            </button>
          }
        </gr-empty-state>
      </div>
    } @else {
      <section class="herd-surface" aria-labelledby="herd-count">
        <div class="surface-heading">
          <div>
            <span id="herd-count" class="count">
              @if (state() === 'loading') {
                Consultando animais…
              } @else {
                {{ page()?.totalElements }} {{ page()?.totalElements === 1 ? 'animal' : 'animais' }}
              }</span
            ><small>Ordenação operacional estável</small>
          </div>
          @if (selected().size) {
            <div class="batch-selection">
              <span
                >{{ selected().size }}
                {{ selected().size === 1 ? 'animal selecionado' : 'animais selecionados' }}</span
              ><app-animal-batch-operations
                [animals]="selectedAnimals()"
                (completed)="selectionCompleted()"
              /><button class="quiet-button" type="button" (click)="clearSelection()">
                Limpar seleção
              </button>
            </div>
          }
        </div>
        <gr-table [loading]="state() === 'loading'" [empty]="false"
          ><thead>
            <tr>
              @if (permissions.canMutateHerd()) {
                <th class="select-cell"><span class="sr-only">Selecionar</span></th>
              }
              <th>Animal</th>
              <th>Estado</th>
              <th>Sexo</th>
              <th>Território atual</th>
              <th><span class="sr-only">Abrir perfil</span></th>
            </tr>
          </thead>
          <tbody>
            @for (animal of page()?.items || []; track animal.id) {
              <tr [class.terminal]="animal.status !== 'ACTIVE'">
                @if (permissions.canMutateHerd()) {
                  <td class="select-cell">
                    @if (animal.status === 'ACTIVE') {
                      <input
                        type="checkbox"
                        [checked]="selected().has(animal.id)"
                        [attr.aria-label]="'Selecionar ' + animal.identification"
                        (change)="toggle(animal)"
                      />
                    }
                  </td>
                }
                <td><app-animal-identity [animal]="animal" /></td>
                <td><app-animal-state [status]="animal.status" /></td>
                <td>{{ sex(animal.sex) }}</td>
                <td>
                  <span class="territory"
                    ><i aria-hidden="true"></i
                    >{{ animal.paddock?.name || 'Sem piquete definido' }}</span
                  >
                </td>
                <td>
                  <a
                    class="row-link"
                    [routerLink]="['/rebanho/animais', animal.id]"
                    [attr.aria-label]="'Abrir perfil de ' + animal.identification"
                    >→</a
                  >
                </td>
              </tr>
            }
          </tbody></gr-table
        >
        @if (page(); as result) {
          <gr-pagination
            [page]="result.page"
            [totalPages]="result.totalPages"
            (pageChange)="changePage($event)"
          />
        }
      </section>
    }
  </div>`,
  styles: [
    `
      .parity-actions,
      .batch-selection {
        display: flex;
        gap: var(--space-2);
        flex-wrap: wrap;
        align-items: center;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnimalListPageComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(HerdApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly context = inject(ContextStore);
  readonly permissions = inject(PermissionService);
  readonly searchInput = new Subject<string>();
  readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  readonly page = signal<Page<Animal> | null>(null);
  readonly error = signal<AppError | null>(null);
  readonly selected = signal(new Map<string, Animal>());
  readonly selectedAnimals = computed(() => [...this.selected().values()]);
  private readonly scope = new ContextRequestScope(this.destroyRef);
  readonly filters = signal<AnimalFilters>(parseFilters(this.route.snapshot.queryParamMap));
  private generation = 0;
  private routeReady = false;
  private initialContext = true;
  private contextEpoch = 0;
  constructor() {
    this.searchInput
      .pipe(
        map((value) => ({ value, epoch: this.contextEpoch })),
        debounceTime(320),
        distinctUntilChanged((a, b) => a.value === b.value && a.epoch === b.epoch),
        takeUntilDestroyed(),
      )
      .subscribe(({ value, epoch }) => {
        if (epoch === this.contextEpoch && !this.context.transitionPending())
          this.setFilter('search', value.trim());
      });
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.filters.set(parseFilters(params));
      if (this.routeReady) this.load();
      this.routeReady = true;
    });
    effect(() => {
      this.context.contextVersion();
      const pending = this.context.transitionPending();
      const farm = this.context.selectedFarm();
      untracked(() => {
        this.scope.reset();
        this.generation++;
        this.contextEpoch++;
        if (!this.initialContext) {
          this.filters.set({ search: '', sex: '', status: '', page: 0, size: 20 });
          this.syncUrl();
        }
        this.selected.set(new Map());
        this.page.set(null);
        this.error.set(null);
        this.state.set('loading');
        if (!pending && farm) {
          this.initialContext = false;
          this.load();
        }
      });
    });
  }
  get reference() {
    return errorReference(this.error()?.requestId);
  }
  sex = sexLabel;
  hasFilters() {
    const f = this.filters();
    return !!(f.search || f.sex || f.status || f.unlocated !== undefined);
  }
  setFilter<K extends 'search' | 'sex' | 'status'>(key: K, value: AnimalFilters[K]) {
    this.filters.update((f) => ({ ...f, [key]: value, page: 0 }));
    this.syncUrl();
  }
  setLocation(value: string) {
    this.filters.update((f) => ({
      ...f,
      unlocated: value === 'UNLOCATED' ? true : value === 'LOCATED' ? false : undefined,
      page: 0,
    }));
    this.syncUrl();
  }
  clearFilters() {
    this.filters.set({ search: '', sex: '', status: '', page: 0, size: 20 });
    this.syncUrl();
  }
  changePage(page: number) {
    this.filters.update((f) => ({ ...f, page }));
    this.syncUrl();
  }
  load() {
    if (this.context.transitionPending() || !this.context.selectedFarm()) return;
    const current = ++this.generation;
    this.scope.reset();
    this.page.set(null);
    this.state.set('loading');
    this.error.set(null);
    this.scope.run(
      this.api.animals(this.filters()),
      (value) => {
        if (current !== this.generation) return;
        this.page.set(value);
        this.state.set('ready');
      },
      (error) => {
        if (current !== this.generation) return;
        this.error.set(error instanceof AppError ? error : null);
        this.state.set('error');
      },
    );
  }
  toggle(animal: Animal) {
    if (
      !this.permissions.canMutateHerd() ||
      this.context.transitionPending() ||
      animal.status !== 'ACTIVE'
    )
      return;
    if (!this.selected().has(animal.id) && this.selected().size >= 100) {
      this.toast.show('warning', 'Limite da seleção', 'Selecione até 100 animais por operação.');
      return;
    }
    this.selected.update((current) => {
      const next = new Map(current);
      next.has(animal.id) ? next.delete(animal.id) : next.set(animal.id, animal);
      return next;
    });
  }
  clearSelection() {
    this.selected.set(new Map());
  }
  selectionCompleted() {
    this.clearSelection();
    this.load();
  }
  private syncUrl() {
    const f = this.filters();
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        search: f.search || null,
        sex: f.sex || null,
        status: f.status || null,
        unlocated: f.unlocated === undefined ? null : String(f.unlocated),
        page: f.page || null,
        size: f.size === 20 ? null : f.size,
      },
      replaceUrl: true,
    });
  }
}
function parseFilters(params: import('@angular/router').ParamMap): AnimalFilters {
  const page = Number(params.get('page'));
  const size = Number(params.get('size'));
  const sex = params.get('sex');
  const status = params.get('status');
  return {
    search: (params.get('search') || '').slice(0, 100),
    sex: sex === 'FEMALE' || sex === 'MALE' ? sex : '',
    status: ['ACTIVE', 'SOLD', 'DECEASED', 'TRANSFERRED', 'ARCHIVED'].includes(status || '')
      ? (status as AnimalStatus)
      : '',
    page: Number.isInteger(page) && page >= 0 ? page : 0,
    size: [20, 50, 100].includes(size) ? size : 20,
    ...(params.get('unlocated') === 'true' || params.get('unlocated') === 'false'
      ? { unlocated: params.get('unlocated') === 'true' }
      : {}),
  };
}
