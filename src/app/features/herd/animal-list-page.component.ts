import { AgeTransitionsComponent } from './age-transitions.component';
import { ageLabel } from './age-intelligence.models';
import { ageBandLabels } from './parity.models';
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
import { HerdSelectionActionsComponent } from './herd-selection-actions.component';
import { DashboardApiClient } from '../home/dashboard-api.service';
import { DashboardOverview } from '../home/dashboard.models';
import { DomainIconComponent } from '../../design-system/primitives/domain-icon';
import { DialogComponent } from '../../design-system/surfaces/surfaces';
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
    AgeTransitionsComponent,
    FormsModule,
    RouterLink,
    FilterBarComponent,
    PaginationComponent,
    TableComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    AnimalBatchOperationsComponent,
    HerdSelectionActionsComponent,
    AnimalIdentityComponent,
    AnimalStateComponent,
    DomainIconComponent,
    DialogComponent,
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
    <section class="herd-overview" aria-labelledby="herd-overview-title">
      <header class="section-heading">
        <span class="section-icon"><gr-domain-icon domain="herd" size="md" /></span>
        <div>
          <h2 id="herd-overview-title">Leitura do rebanho</h2>
          <p>Números atuais para orientar a exploração dos animais.</p>
        </div>
      </header>
      <div class="overview-cards">
        <button type="button" class="overview-card" (click)="clearFilters()">
          <span class="card-label">Animais encontrados</span
          ><strong>{{ state() === 'ready' ? number(page()?.totalElements ?? 0) : '—' }}</strong
          ><small>{{ hasFilters() ? 'na busca atual' : 'no rebanho' }}</small
          ><span class="card-action">Ver todos →</span>
        </button>
        <button type="button" class="overview-card" (click)="setFilter('status', 'ACTIVE')">
          <span class="card-label">Ativos</span
          ><strong>{{ summary() ? number(summary()!.herdSnapshot.activeAnimals) : '—' }}</strong
          ><small>animais em atividade</small><span class="card-action">Filtrar ativos →</span>
        </button>
        <button type="button" class="overview-card" (click)="filterActiveSex()">
          <span class="card-label">Ativos por sexo</span
          ><strong>{{ summary() ? number(sexCount('FEMALE')) : '—' }}</strong
          ><small>fêmeas · {{ summary() ? number(sexCount('MALE')) : '—' }} machos</small
          ><span class="sex-track" aria-hidden="true"
            ><span [style.width.%]="femaleShare()"></span></span
          ><span class="card-action">Filtrar fêmeas →</span>
        </button>
        <button
          type="button"
          class="overview-card attention-card"
          (click)="filterActiveUnlocated()"
        >
          <span class="card-label">Sem piquete</span
          ><strong>{{ summary() ? number(summary()!.herdSnapshot.unlocatedAnimals) : '—' }}</strong
          ><small>ativos sem localização</small><span class="card-action">Ver animais →</span>
        </button>
      </div>
    </section>
    <section class="explorer" aria-labelledby="explorer-title">
      <header class="section-heading">
        <span class="section-icon"><gr-domain-icon domain="traceability" size="md" /></span>
        <div>
          <h2 id="explorer-title">Explorar animais</h2>
          <p>Busque e refine sem perder o contexto da fazenda.</p>
        </div>
      </header>
      <app-age-transitions />
      <gr-filter-bar
        ><label class="search-field"
          ><span>Buscar animal</span
          ><input
            type="search"
            [ngModel]="searchDraft()"
            (ngModelChange)="onSearchInput($event)"
            placeholder="Buscar por nome ou identificação"
        /></label>
        @if (searchDraft()) {
          <button
            type="button"
            class="search-clear"
            (click)="clearSearch()"
            aria-label="Limpar busca"
          >
            ×
          </button>
        }
        <label
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
        <button
          class="secondary-action advanced-trigger"
          type="button"
          (click)="advancedOpen.set(true)"
        >
          Mais filtros
        </button>
      </gr-filter-bar>
      <div class="filter-meta">
        <span role="status">
          @if (searchPending()) {
            Aplicando busca…
          } @else if (state() === 'loading') {
            Consultando animais…
          } @else {
            Ordenado por identificação
          }
        </span>
        @if (activeFilters().length) {
          <div class="filter-chips" aria-label="Filtros ativos">
            @for (filter of activeFilters(); track filter.key) {
              <button
                type="button"
                class="filter-chip"
                (click)="removeFilter(filter.key)"
                [attr.aria-label]="'Remover filtro ' + filter.label"
              >
                {{ filter.label }} <span aria-hidden="true">×</span>
              </button>
            }
            <button type="button" class="clear-all" (click)="clearFilters()">Limpar tudo</button>
          </div>
        }
      </div>
    </section>
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
            ><small
              >{{ hasFilters() ? 'Resultado dos filtros ativos' : 'Rebanho da fazenda atual' }} ·
              identificação em ordem crescente</small
            >
          </div>
          <div class="list-controls">
            @if (permissions.canMutateHerd()) {
              <button
                class="secondary-action"
                type="button"
                [disabled]="state() !== 'ready' || selectingFiltered()"
                (click)="selectFiltered()"
              >
                {{ selectingFiltered() ? 'Consultando seleção…' : 'Selecionar resultado filtrado' }}
              </button>
            }
            <label
              >Por página<select [ngModel]="filters().size" (ngModelChange)="setPageSize($event)">
                <option [ngValue]="20">20</option>
                <option [ngValue]="50">50</option>
                <option [ngValue]="100">100</option>
              </select></label
            >
            <div class="view-switch" role="group" aria-label="Visualização dos animais">
              <button
                type="button"
                [class.active]="viewMode() === 'table'"
                [attr.aria-pressed]="viewMode() === 'table'"
                (click)="setViewMode('table')"
              >
                Tabela</button
              ><button
                type="button"
                [class.active]="viewMode() === 'cards'"
                [attr.aria-pressed]="viewMode() === 'cards'"
                (click)="setViewMode('cards')"
              >
                Cards
              </button>
            </div>
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
              <app-herd-selection-actions
                [animals]="selectedAnimals()"
                (changed)="selectionCompleted()"
              />
            </div>
          }
        </div>
        @if (viewMode() === 'table') {
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
                <tr
                  [class.terminal]="animal.status !== 'ACTIVE'"
                  (click)="openAnimal(animal, $event)"
                  (keydown.enter)="openAnimal(animal, $event)"
                  tabindex="0"
                  [attr.aria-label]="'Abrir perfil de ' + animal.identification"
                >
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
                  <td>
                    <app-animal-identity
                      [animal]="animal"
                      [queryParams]="listQueryParams()"
                    /><small class="animal-age"
                      >{{ ageText(animal.age)
                      }}{{ animal.age ? ' · ' + ageLabels[animal.age.currentBand] : '' }}</small
                    >
                  </td>
                  <td><app-animal-state [status]="animal.status" /></td>
                  <td>
                    <span class="sex-pill">{{ sex(animal.sex) }}</span>
                  </td>
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
                      [queryParams]="listQueryParams()"
                      [attr.aria-label]="'Abrir perfil de ' + animal.identification"
                      >→</a
                    >
                  </td>
                </tr>
              }
            </tbody></gr-table
          >
        } @else {
          <div class="animal-cards" [class.loading]="state() === 'loading'">
            @for (animal of page()?.items || []; track animal.id) {
              <article class="animal-card" [class.terminal]="animal.status !== 'ACTIVE'">
                <div class="animal-card-top">
                  <span class="animal-avatar" aria-hidden="true"
                    ><gr-domain-icon domain="herd" size="md" /></span
                  ><app-animal-state [status]="animal.status" />
                </div>
                <a
                  [routerLink]="['/rebanho/animais', animal.id]"
                  [queryParams]="listQueryParams()"
                  class="animal-card-name"
                  >{{ animal.identification }}</a
                ><span class="animal-card-subtitle">{{ animal.name || 'Sem nome informado' }}</span>
                <div class="animal-card-facts">
                  <span>{{ ageText(animal.age) }}</span
                  ><span>{{
                    animal.age ? ageLabels[animal.age.currentBand] : 'Faixa não informada'
                  }}</span
                  ><span>{{ sex(animal.sex) }}</span
                  ><span>{{ animal.paddock?.name || 'Sem piquete definido' }}</span>
                </div>
                @if (permissions.canMutateHerd() && animal.status === 'ACTIVE') {
                  <label class="card-select"
                    ><input
                      type="checkbox"
                      [checked]="selected().has(animal.id)"
                      (change)="toggle(animal)"
                    />
                    Selecionar</label
                  >
                }
              </article>
            }
          </div>
        }
        @if (page(); as result) {
          <gr-pagination
            [page]="result.page"
            [totalPages]="result.totalPages"
            (pageChange)="changePage($event)"
          />
        }
      </section>
    }
    <gr-dialog [open]="advancedOpen()" size="lg" (closed)="advancedOpen.set(false)"
      ><strong dialog-title>Filtros do rebanho</strong>
      <p class="advanced-intro">
        Combine os filtros disponíveis para encontrar animais em todo o rebanho.
      </p>
      <div class="advanced-grid">
        <label
          >Sexo<select [ngModel]="filters().sex" (ngModelChange)="setFilter('sex', $event)">
            <option value="">Todos</option>
            <option value="FEMALE">Fêmea</option>
            <option value="MALE">Macho</option>
          </select></label
        ><label
          >Estado<select [ngModel]="filters().status" (ngModelChange)="setFilter('status', $event)">
            <option value="">Todos</option>
            <option value="ACTIVE">Ativo</option>
            <option value="SOLD">Vendido</option>
            <option value="DECEASED">Baixado</option>
            <option value="TRANSFERRED">Transferido</option>
            <option value="ARCHIVED">Arquivado</option>
          </select></label
        ><label
          >Localização<select
            [ngModel]="
              filters().unlocated === undefined ? '' : filters().unlocated ? 'UNLOCATED' : 'LOCATED'
            "
            (ngModelChange)="setLocation($event)"
          >
            <option value="">Todas</option>
            <option value="UNLOCATED">Sem piquete</option>
            <option value="LOCATED">Com piquete</option>
          </select></label
        ><label
          >Animais por página<select
            [ngModel]="filters().size"
            (ngModelChange)="setPageSize($event)"
          >
            <option [ngValue]="20">20</option>
            <option [ngValue]="50">50</option>
            <option [ngValue]="100">100</option>
          </select></label
        >
      </div>
      <div dialog-actions>
        <button class="quiet-button" type="button" (click)="clearFilters()">Limpar filtros</button
        ><button class="primary-action" type="button" (click)="advancedOpen.set(false)">
          Ver resultados
        </button>
      </div></gr-dialog
    >
  </div>`,
  styleUrls: ['./herd-page.scss', './animal-list-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnimalListPageComponent {
  readonly ageText = ageLabel;
  readonly ageLabels = ageBandLabels;
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(HerdApi);
  private readonly dashboard = inject(DashboardApiClient);
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
  private readonly summaryScope = new ContextRequestScope(this.destroyRef);
  readonly filters = signal<AnimalFilters>(parseFilters(this.route.snapshot.queryParamMap));
  readonly viewMode = signal<'table' | 'cards'>(
    this.route.snapshot.queryParamMap.get('view') === 'cards' ? 'cards' : 'table',
  );
  readonly advancedOpen = signal(false);
  readonly searchDraft = signal(this.filters().search);
  readonly searchPending = signal(false);
  readonly summary = signal<DashboardOverview | null>(null);
  readonly activeFilters = computed(() => {
    const filters = this.filters();
    const chips: { key: 'search' | 'sex' | 'status' | 'location'; label: string }[] = [];
    if (filters.search) chips.push({ key: 'search', label: `Busca: ${filters.search}` });
    if (filters.sex) chips.push({ key: 'sex', label: `Sexo: ${sexLabel(filters.sex)}` });
    if (filters.status)
      chips.push({ key: 'status', label: `Estado: ${this.statusText(filters.status)}` });
    if (filters.unlocated !== undefined)
      chips.push({ key: 'location', label: filters.unlocated ? 'Sem piquete' : 'Com piquete' });
    return chips;
  });
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
        if (epoch === this.contextEpoch && !this.context.transitionPending()) {
          this.searchPending.set(false);
          this.setFilter('search', value.trim());
        }
      });
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const nextFilters = parseFilters(params);
      const filtersChanged = JSON.stringify(nextFilters) !== JSON.stringify(this.filters());
      this.filters.set(nextFilters);
      this.viewMode.set(params.get('view') === 'cards' ? 'cards' : 'table');
      this.searchDraft.set(this.filters().search);
      this.searchPending.set(false);
      if (this.routeReady && filtersChanged) {
        this.selectionScope.reset();
        this.selectingFiltered.set(false);
        this.selected.set(new Map());
        this.load();
      }
      this.routeReady = true;
    });
    effect(() => {
      this.context.contextVersion();
      const pending = this.context.transitionPending();
      const farm = this.context.selectedFarm();
      untracked(() => {
        this.scope.reset();
        this.summaryScope.reset();
        this.selectionScope.reset();
        this.selectingFiltered.set(false);
        this.generation++;
        this.contextEpoch++;
        if (!this.initialContext) {
          this.filters.set({ search: '', sex: '', status: '', page: 0, size: 20 });
          this.syncUrl();
        }
        this.selected.set(new Map());
        this.summary.set(null);
        this.advancedOpen.set(false);
        this.page.set(null);
        this.error.set(null);
        this.state.set('loading');
        if (!pending && farm) {
          this.initialContext = false;
          this.load();
          this.loadSummary();
        }
      });
    });
  }
  get reference() {
    return errorReference(this.error()?.requestId);
  }
  sex = sexLabel;
  number(value: number) {
    return new Intl.NumberFormat('pt-BR').format(value);
  }
  statusText(status: AnimalStatus) {
    return {
      ACTIVE: 'Ativo',
      SOLD: 'Vendido',
      DECEASED: 'Baixado',
      TRANSFERRED: 'Transferido',
      ARCHIVED: 'Arquivado',
    }[status];
  }
  sexCount(sex: AnimalSex) {
    return this.summary()?.herdSnapshot.bySex[sex] ?? 0;
  }
  femaleShare() {
    const total = this.summary()?.herdSnapshot.activeAnimals ?? 0;
    return total ? (this.sexCount('FEMALE') / total) * 100 : 0;
  }
  onSearchInput(value: string) {
    this.searchDraft.set(value);
    this.searchPending.set(true);
    this.searchInput.next(value);
  }
  clearSearch() {
    this.searchDraft.set('');
    this.searchPending.set(false);
    this.setFilter('search', '');
  }
  setPageSize(value: number) {
    if (![20, 50, 100].includes(Number(value))) return;
    this.filters.update((f) => ({ ...f, size: Number(value), page: 0 }));
    this.syncUrl();
  }
  setViewMode(value: 'table' | 'cards') {
    this.viewMode.set(value);
    this.syncUrl();
  }
  removeFilter(key: 'search' | 'sex' | 'status' | 'location') {
    if (key === 'location') this.setLocation('');
    else if (key === 'search') this.clearSearch();
    else this.setFilter(key, '');
  }
  listQueryParams(): Record<string, string | number | null> {
    const f = this.filters();
    return {
      search: f.search || null,
      sex: f.sex || null,
      status: f.status || null,
      unlocated: f.unlocated === undefined ? null : String(f.unlocated),
      page: f.page || null,
      size: f.size === 20 ? null : f.size,
      view: this.viewMode() === 'cards' ? 'cards' : null,
    };
  }
  openAnimal(animal: Animal, event: Event) {
    if ((event.target as HTMLElement).closest('a, button, input, label, select')) return;
    if (event instanceof KeyboardEvent && event.key !== 'Enter') return;
    void this.router.navigate(['/rebanho/animais', animal.id], {
      queryParams: this.listQueryParams(),
    });
  }
  private loadSummary() {
    this.summaryScope.run(
      this.dashboard.overview({ period: 'TODAY' }),
      (value) => this.summary.set(value),
      () => this.summary.set(null),
    );
  }
  hasFilters() {
    const f = this.filters();
    return !!(f.search || f.sex || f.status || f.unlocated !== undefined);
  }
  setFilter<K extends 'search' | 'sex' | 'status'>(key: K, value: AnimalFilters[K]) {
    this.filters.update((f) => ({ ...f, [key]: value, page: 0 }));
    this.syncUrl();
  }
  filterActiveSex() {
    this.filters.update((f) => ({ ...f, sex: 'FEMALE', status: 'ACTIVE', page: 0 }));
    this.syncUrl();
  }
  filterActiveUnlocated() {
    this.filters.update((f) => ({ ...f, status: 'ACTIVE', unlocated: true, page: 0 }));
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
    this.searchDraft.set('');
    this.searchPending.set(false);
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
  readonly selectingFiltered = signal(false);
  private readonly selectionScope = new ContextRequestScope(inject(DestroyRef));
  selectFiltered() {
    if (
      !this.permissions.canMutateHerd() ||
      this.context.transitionPending() ||
      this.state() !== 'ready' ||
      this.selectingFiltered()
    )
      return;
    if ((this.page()?.totalElements ?? 0) > 100) {
      this.toast.show(
        'warning',
        'Refine os filtros',
        'O resultado tem mais de 100 animais. Refine os filtros ou selecione animais individualmente.',
      );
      return;
    }
    const epoch = this.contextEpoch;
    this.selectionScope.reset();
    this.selectingFiltered.set(true);
    this.selectionScope.run(
      this.api.animals({ ...this.filters(), page: 0, size: 100 }),
      (result) => {
        this.selectingFiltered.set(false);
        if (epoch !== this.contextEpoch || this.context.transitionPending()) return;
        if (result.totalElements > 100 || result.totalElements !== result.items.length) {
          this.toast.show(
            'warning',
            'Resultado alterado',
            'O resultado mudou ou excede 100 animais. Atualize e refine os filtros antes de selecionar.',
          );
          return;
        }
        const active = result.items.filter((animal) => animal.status === 'ACTIVE');
        this.selected.set(new Map(active.map((animal) => [animal.id, animal])));
        this.toast.show(
          'success',
          'Seleção consultada',
          `${active.length} animais ativos selecionados. ${result.items.length - active.length} animais inativos ficaram fora da seleção.`,
        );
      },
      () => {
        this.selectingFiltered.set(false);
        this.toast.show(
          'error',
          'Não foi possível consultar a seleção',
          'Tente selecionar novamente.',
        );
      },
    );
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
        view: this.viewMode() === 'cards' ? 'cards' : null,
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
