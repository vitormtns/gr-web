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
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ContextStore } from '../../core/context/context.store';
import { localDateOnly } from '../../core/date/date-only';
import { PermissionService } from '../../core/permissions/permission.service';
import { PaginationComponent, TableComponent } from '../../design-system/data-display/data-display';
import {
  EmptyStateComponent,
  ErrorStateComponent,
  ToastService,
} from '../../design-system/feedback/feedback';
import { DialogComponent } from '../../design-system/surfaces/surfaces';
import {
  ContextRequestScope,
  managementError,
  managementTimestamp,
} from '../management/management.shared';
import { AnimalPickerComponent } from './animal-picker.component';
import { GroupPickerComponent } from './group-picker.component';
import { HerdApi } from './herd-api.service';
import { Animal, newUuid } from './herd.models';
import {
  AgendaPage,
  PendingWorkPage,
  PlannerItem,
  PlannerPage,
  PlannerType,
  pendingLabels,
  plannerTypeLabels,
} from './herd-operations.models';
import { formatDate } from './herd.shared';
import { validImportDate } from './herd-import';
import { pendingNavigation } from './pending-navigation';

type AgendaTab = 'agenda' | 'pending' | 'planner';
type EditorMode = 'create' | 'edit' | 'view' | 'complete' | 'cancel';
@Component({
  selector: 'app-agenda-page',
  imports: [
    FormsModule,
    RouterLink,
    AnimalPickerComponent,
    GroupPickerComponent,
    PaginationComponent,
    TableComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    DialogComponent,
  ],
  template: `<div class="herd-page operations-page page-enter">
    <header class="page-header">
      <div>
        <span class="eyebrow">TEMPO OPERACIONAL · {{ context.selectedFarm()?.farmName }}</span>
        <h1>Agenda do rebanho</h1>
        <p>Consulte a agenda, acompanhe as pendências e revise as atividades planejadas.</p>
      </div>
      @if (permissions.canMutateHerd()) {
        <button class="primary-action" type="button" (click)="openCreate()">
          Planejar atividade
        </button>
      }
    </header>
    <nav class="agenda-tabs" aria-label="Consultas da agenda">
      <button
        class="secondary-action"
        [class.active]="tab() === 'agenda'"
        [attr.aria-pressed]="tab() === 'agenda'"
        (click)="selectTab('agenda')"
      >
        Agenda unificada</button
      ><button
        class="secondary-action"
        [class.active]="tab() === 'pending'"
        [attr.aria-pressed]="tab() === 'pending'"
        (click)="selectTab('pending')"
      >
        Pendências</button
      ><button
        class="secondary-action"
        [class.active]="tab() === 'planner'"
        [attr.aria-pressed]="tab() === 'planner'"
        (click)="selectTab('planner')"
      >
        Atividades planejadas
      </button>
    </nav>
    <form class="agenda-filters section-frame" (ngSubmit)="applyFilters()">
      @if (tab() === 'agenda') {
        <label
          >Origem<select name="source" [(ngModel)]="source">
            <option value="">Todas</option>
            <option value="MANUAL">Planejada</option>
            <option value="DERIVED">Necessidade do rebanho</option>
          </select></label
        >
      }
      @if (tab() === 'pending') {
        <label
          >Tipo de pendência<select name="pendingType" [(ngModel)]="pendingType">
            <option value="">Todas</option>
            @for (type of pendingTypes; track type) {
              <option [value]="type">{{ pendingLabels[type] }}</option>
            }
          </select></label
        >
      } @else {
        <label
          >Tipo de atividade<select name="type" [(ngModel)]="filterType">
            <option value="">Todos</option>
            @for (type of plannerTypes; track type) {
              <option [value]="type">{{ typeLabels[type] }}</option>
            }
          </select></label
        ><label>De<input type="date" name="from" [(ngModel)]="from" /></label
        ><label>Até<input type="date" name="to" [(ngModel)]="to" /></label>
      }
      @if (tab() === 'planner') {
        <label
          >Situação<select name="status" [(ngModel)]="status">
            <option value="">Todas</option>
            <option value="OPEN">Em aberto</option>
            <option value="COMPLETED">Concluída</option>
            <option value="CANCELLED">Cancelada</option>
          </select></label
        >
      }
      <label
        >Identificador do animal<input
          name="filterAnimal"
          [(ngModel)]="filterAnimalId"
          placeholder="UUID do animal (opcional)" /></label
      ><button class="secondary-action" type="submit">Aplicar filtros</button
      ><button class="quiet-button" type="button" (click)="clearFilters()">Limpar filtros</button>
      @if (tab() === 'agenda') {
        <button class="quiet-button" type="button" (click)="showToday()">Hoje e atrasadas</button>
        @if (includeOverdue && from === today) {
          <p>Inclui atividades em aberto e necessidades vencidas, mantendo a data original.</p>
        }
      }
      @if (tab() === 'planner') {
        <details class="group-filter picker-disclosure" [open]="!!filterGroupId">
          <summary>
            Filtrar atividades por grupo{{ filterGroupId ? ' · filtro ativo' : '' }}
          </summary>
          <app-group-picker
            label="Filtrar atividades por grupo"
            [selected]="filterGroupId"
            (chosen)="chooseGroupFilter($event)"
          />
        </details>
      }
    </form>
    @if (error()) {
      <gr-error-state
        level="page"
        [title]="
          tab() === 'pending'
            ? 'Não foi possível carregar as pendências'
            : tab() === 'planner'
              ? 'Não foi possível carregar as atividades planejadas'
              : 'Não foi possível carregar a agenda'
        "
        [description]="error()"
        (retry)="load()"
      />
    } @else if (!loading() && !itemCount()) {
      <div class="empty-frame">
        <gr-empty-state
          [title]="
            hasFilters()
              ? 'Nenhum registro corresponde aos filtros'
              : tab() === 'pending'
                ? 'Nenhuma pendência identificada'
                : tab() === 'planner'
                  ? 'Nenhuma atividade planejada'
                  : 'Nenhum item na agenda'
          "
          description="Revise os filtros ou consulte outra área da agenda."
        />
      </div>
    } @else {
      <section class="section-frame agenda-results">
        @if (total() !== null) {
          <p class="record-count">
            {{ total() }} {{ total() === 1 ? 'registro' : 'registros' }} nesta consulta
          </p>
        }
        @if (tab() === 'agenda') {
          <gr-table [loading]="loading()"
            ><thead>
              <tr>
                <th>Data</th>
                <th>Origem</th>
                <th>Atividade</th>
                <th>Animal</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              @for (item of agenda()?.items || []; track item.stableId) {
                <tr>
                  <td>{{ date(item.operationalDate) }}</td>
                  <td>{{ item.source === 'MANUAL' ? 'Planejada' : 'Necessidade do rebanho' }}</td>
                  <td>{{ item.summary }}</td>
                  <td>
                    @if (item.animalId) {
                      <a [routerLink]="['/rebanho/animais', item.animalId]">{{
                        item.identification || 'Ver animal'
                      }}</a>
                    } @else {
                      Atividade da fazenda
                    }
                  </td>
                  <td>
                    @if (item.plannerItemId) {
                      <button
                        class="quiet-button"
                        type="button"
                        (click)="openItem(item.plannerItemId, 'view')"
                      >
                        Ver detalhes
                      </button>
                      @if (permissions.canMutateHerd() && item.status === 'OPEN') {
                        <button
                          class="quiet-button"
                          type="button"
                          (click)="openItem(item.plannerItemId, 'edit')"
                        >
                          Reagendar</button
                        ><button
                          class="quiet-button"
                          type="button"
                          (click)="openItem(item.plannerItemId, 'complete')"
                        >
                          Concluir</button
                        ><button
                          class="quiet-button"
                          type="button"
                          (click)="openItem(item.plannerItemId, 'cancel')"
                        >
                          Cancelar
                        </button>
                      }
                    } @else if (item.animalId) {
                      <a class="quiet-button" [routerLink]="pendingNavigation(item.animalId, item.pendingWorkType, item.pregnancyId).path"
                        [queryParams]="pendingNavigation(item.animalId, item.pendingWorkType, item.pregnancyId).query"
                        >Abrir contexto</a
                      >
                    }
                  </td>
                </tr>
              }
            </tbody></gr-table
          >
        } @else if (tab() === 'pending') {
          <gr-table [loading]="loading()"
            ><thead>
              <tr>
                <th>Pendência</th>
                <th>Animal</th>
                <th>Data de referência</th>
                <th>Atraso</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              @for (item of pending()?.items || []; track item.type + '-' + item.animalId) {
                <tr>
                  <td>{{ pendingLabels[item.type] }}</td>
                  <td>
                    <strong>{{ item.identification }}</strong
                    ><small>{{ item.name || 'Sem nome informado' }}</small>
                  </td>
                  <td>{{ date(item.dueOn || item.expectedOn) }}</td>
                  <td>
                    {{
                      item.daysOverdue !== null
                        ? item.daysOverdue + ' dias'
                        : 'Sem atraso informado'
                    }}
                  </td>
                  <td>
                    <a [routerLink]="pendingNavigation(item.animalId, item.type, item.pregnancyId).path"
                      [queryParams]="pendingNavigation(item.animalId, item.type, item.pregnancyId).query"
                      >Abrir contexto</a
                    >
                  </td>
                </tr>
              }
            </tbody></gr-table
          >
        } @else {
          <gr-table [loading]="loading()"
            ><thead>
              <tr>
                <th>Atividade</th>
                <th>Tipo</th>
                <th>Data prevista</th>
                <th>Situação</th>
                <th>Escopo</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              @for (item of planner()?.items || []; track item.id) {
                <tr>
                  <td>{{ item.title }}</td>
                  <td>{{ typeLabels[item.type] }}</td>
                  <td>{{ date(item.scheduledFor) }}</td>
                  <td>{{ statusLabels[item.status] }}</td>
                  <td>
                    @if (item.animalId) {
                      <a [routerLink]="['/rebanho/animais', item.animalId]">Ver animal</a>
                    } @else {
                      Fazenda
                    }
                    @if (item.groupId) {
                      <a [routerLink]="['/rebanho/grupos', item.groupId]">Ver grupo</a>
                    }
                  </td>
                  <td>
                    <button class="quiet-button" type="button" (click)="openItem(item.id, 'view')">
                      Ver detalhes
                    </button>
                    @if (item.status === 'OPEN' && permissions.canMutateHerd()) {
                      <button
                        class="quiet-button"
                        type="button"
                        (click)="openItem(item.id, 'edit')"
                      >
                        Editar</button
                      ><button
                        class="quiet-button"
                        type="button"
                        (click)="openItem(item.id, 'complete')"
                      >
                        Concluir</button
                      ><button
                        class="quiet-button"
                        type="button"
                        (click)="openItem(item.id, 'cancel')"
                      >
                        Cancelar
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody></gr-table
          >
        }
        @if (total() !== null) {
          <gr-pagination
            [page]="page()"
            [totalPages]="totalPages()"
            (pageChange)="changePage($event)"
          />
        }
      </section>
    }
    <gr-dialog [open]="editorOpen()" (closed)="closeEditor()"
      ><span dialog-title>{{ editorTitle() }}</span>
      @if (editorLoading()) {
        <p role="status">Carregando a atividade…</p>
      } @else if (editorError()) {
        <p class="form-error" role="alert">{{ editorError() }}</p>
        <button class="secondary-action" (click)="reloadEditor()">Tentar novamente</button>
      } @else if (mode() === 'view' || mode() === 'complete' || mode() === 'cancel') {
        @if (editing(); as item) {
          <dl class="planner-detail">
            <dt>Atividade</dt>
            <dd>{{ item.title }}</dd>
            <dt>Tipo</dt>
            <dd>{{ typeLabels[item.type] }}</dd>
            <dt>Data prevista</dt>
            <dd>{{ date(item.scheduledFor) }}</dd>
            <dt>Situação</dt>
            <dd>{{ statusLabels[item.status] }}</dd>
            <dt>Observações</dt>
            <dd>{{ item.notes || 'Sem observações' }}</dd>
            <dt>Criada em</dt>
            <dd>{{ timestamp(item.createdAt) }}</dd>
            <dt>Atualizada em</dt>
            <dd>{{ timestamp(item.updatedAt) }}</dd>
            @if (item.completedAt) {
              <dt>Concluída em</dt>
              <dd>{{ timestamp(item.completedAt) }}</dd>
            }
            @if (item.cancelledAt) {
              <dt>Cancelada em</dt>
              <dd>{{ timestamp(item.cancelledAt) }}</dd>
            }
            <dt>Versão</dt>
            <dd>{{ item.version }}</dd>
          </dl>
        }
      } @else {
        <fieldset class="form-grid compact" [disabled]="saving() || review()">
          <label
            >Tipo *<select [(ngModel)]="plannerType">
              @for (type of plannerTypes; track type) {
                <option [value]="type">{{ typeLabels[type] }}</option>
              }
            </select></label
          ><label>Data prevista *<input type="date" [(ngModel)]="scheduledFor" required /></label
          ><label class="wide">Título *<input [(ngModel)]="title" maxlength="160" required /></label
          ><label class="wide"
            >Observações<textarea [(ngModel)]="notes" maxlength="1000"></textarea>
          </label>
        </fieldset>
        @if (!review()) {
          <details class="picker-disclosure">
            <summary>
              {{
                animalId ? 'Consultar ou alterar o animal vinculado' : 'Vincular animal (opcional)'
              }}
            </summary>
            <app-animal-picker
              label="Vincular animal (opcional)"
              [disabled]="saving()"
              (chosen)="chooseAnimal($event)"
            />
            <p>
              {{
                selectedAnimal()
                  ? selectedAnimal()!.identification
                  : animalId
                    ? 'Animal vinculado: ' + animalId
                    : 'Atividade da fazenda'
              }}
            </p>
            @if (animalId) {
              <button class="quiet-button" (click)="clearAnimal()">
                Remover vínculo com animal
              </button>
            }
          </details>
          <details class="picker-disclosure" [open]="!!groupId">
            <summary>
              {{ groupId ? 'Consultar ou alterar o grupo vinculado' : 'Vincular grupo (opcional)' }}
            </summary>
            <app-group-picker
              label="Grupo de manejo (opcional)"
              [selected]="groupId"
              [disabled]="saving()"
              (chosen)="groupId = $event"
            />
          </details>
        } @else {
          <p>Animal: {{ selectedAnimal()?.identification || animalId || 'Sem vínculo' }}</p>
          <p>Grupo: {{ groupId || 'Sem vínculo' }}</p>
          <p>Confira os campos e os vínculos antes de confirmar.</p>
        }
      }
      @if (mode() !== 'view') {
        <p class="semantic-note">
          {{
            mode() === 'cancel'
              ? 'O cancelamento encerra a atividade e preserva seu histórico.'
              : 'Planejar ou concluir uma atividade não registra pesagens, tratamentos ou partos. Registre o manejo realizado no fluxo correspondente.'
          }}
        </p>
      }
      @if (formError()) {
        <p class="form-error" role="alert">{{ formError() }}</p>
      }
      <div dialog-actions>
        <button class="quiet-button" [disabled]="saving()" (click)="closeEditor()">Fechar</button>
        @if (!editorLoading() && !editorError() && mode() !== 'view') {
          @if (mode() === 'complete' || mode() === 'cancel' || review()) {
            <button class="primary-action" [disabled]="saving()" (click)="save()">
              {{ saving() ? 'Registrando…' : 'Confirmar' }}
            </button>
          } @else {
            <button class="primary-action" [disabled]="saving()" (click)="prepare()">
              Revisar atividade
            </button>
          }
        }
      </div>
    </gr-dialog>
  </div>`,
  styleUrl: './agenda-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgendaPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(HerdApi);
  private readonly scope = new ContextRequestScope(inject(DestroyRef));
  private readonly editorScope = new ContextRequestScope(inject(DestroyRef));
  private readonly toast = inject(ToastService);
  readonly context = inject(ContextStore);
  readonly permissions = inject(PermissionService);
  readonly tab = signal<AgendaTab>('agenda');
  readonly page = signal(0);
  readonly agenda = signal<AgendaPage | null>(null);
  readonly pending = signal<PendingWorkPage | null>(null);
  readonly planner = signal<PlannerPage | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly editorOpen = signal(false);
  readonly editorLoading = signal(false);
  readonly editorError = signal('');
  readonly mode = signal<EditorMode>('create');
  readonly editing = signal<PlannerItem | null>(null);
  readonly selectedAnimal = signal<Animal | null>(null);
  readonly saving = signal(false);
  readonly review = signal(false);
  readonly formError = signal('');
  readonly typeLabels = plannerTypeLabels;
  readonly pendingLabels = pendingLabels;
  readonly statusLabels = { OPEN: 'Em aberto', COMPLETED: 'Concluída', CANCELLED: 'Cancelada' };
  readonly plannerTypes = Object.keys(plannerTypeLabels) as PlannerType[];
  readonly pendingTypes = Object.keys(pendingLabels) as (keyof typeof pendingLabels)[];
  source = '';
  filterType = '';
  pendingType = '';
  status = '';
  from = '';
  to = '';
  readonly today = localDateOnly();
  includeOverdue = false;
  filterAnimalId = '';
  filterGroupId = '';
  plannerType: PlannerType = 'GENERAL';
  title = '';
  scheduledFor = localDateOnly();
  animalId = '';
  groupId = '';
  notes = '';
  private operationId = '';
  private editorId = '';
  private command: object | null = null;
  private applied: Record<string, string> = {};
  date = formatDate;
  pendingNavigation = pendingNavigation;
  timestamp = managementTimestamp;
  constructor() {
    let initial = true;
    effect(() => {
      this.context.contextVersion();
      const pending = this.context.transitionPending();
      const farm = this.context.selectedFarm();
      untracked(() => {
        this.scope.reset();
        this.resetEditor();
        this.clearData();
        this.resetFilters();
        this.tab.set('agenda');
        if (initial && !pending && farm) {
          this.applyRoute();
          initial = false;
        }
        if (!pending && farm) this.applyFilters();
      });
    });
  }
  private applyRoute() {
    const q = this.route.snapshot.queryParamMap;
    const tab = q.get('tab');
    if (tab === 'pending' || tab === 'planner') this.tab.set(tab);
    if (q.get('groupId') && validUuid(q.get('groupId')!)) {
      this.filterGroupId = q.get('groupId')!;
      this.tab.set('planner');
    }
    this.filterAnimalId = validUuid(q.get('animalId') || '') ? q.get('animalId')! : '';
    this.pendingType = this.pendingTypes.includes(
      q.get('pendingType') as keyof typeof pendingLabels,
    )
      ? q.get('pendingType')!
      : '';
    this.filterType = this.plannerTypes.includes(q.get('type') as PlannerType)
      ? q.get('type')!
      : '';
    this.status = ['OPEN', 'COMPLETED', 'CANCELLED'].includes(q.get('status') || '')
      ? q.get('status')!
      : '';
    this.source = ['MANUAL', 'DERIVED'].includes(q.get('source') || '') ? q.get('source')! : '';
    this.from = validImportDate(q.get('from') || '') ? q.get('from')! : '';
    this.to = validImportDate(q.get('to') || '') ? q.get('to')! : '';
    this.includeOverdue = q.get('includeOverdue') === 'true' && this.from === this.today;
  }
  private resetFilters() {
    this.source = '';
    this.filterType = '';
    this.pendingType = '';
    this.status = '';
    this.from = '';
    this.to = '';
    this.includeOverdue = false;
    this.filterAnimalId = '';
    this.filterGroupId = '';
    this.applied = {};
    this.page.set(0);
  }
  selectTab(tab: AgendaTab) {
    if (this.context.transitionPending()) return;
    this.tab.set(tab);
    this.resetFilters();
    this.applyFilters();
  }
  chooseGroupFilter(id: string) {
    this.filterGroupId = id;
    this.applyFilters();
  }
  clearFilters() {
    this.resetFilters();
    this.applyFilters();
  }
  showToday() {
    this.from = this.to = this.today;
    this.includeOverdue = true;
    this.applyFilters();
  }
  applyFilters() {
    if (
      (this.filterAnimalId && !validUuid(this.filterAnimalId.trim())) ||
      (this.filterGroupId && !validUuid(this.filterGroupId)) ||
      (this.from && !validImportDate(this.from)) ||
      (this.to && !validImportDate(this.to)) ||
      (this.from && this.to && this.from > this.to)
    ) {
      this.error.set('Revise o período e os identificadores informados.');
      return;
    }
    this.applied = {
      source: this.source,
      type: this.tab() === 'pending' ? this.pendingType : this.filterType,
      status: this.status,
      from: this.from,
      to: this.to,
      includeOverdue: this.includeOverdue && this.from === this.today && this.to >= this.today ? 'true' : '',
      animalId: this.filterAnimalId.trim(),
      groupId: this.filterGroupId,
    };
    this.page.set(0);
    this.load();
  }
  hasFilters() {
    return Object.values(this.applied).some(Boolean);
  }
  private clearData() {
    this.agenda.set(null);
    this.pending.set(null);
    this.planner.set(null);
    this.loading.set(true);
    this.error.set('');
  }
  load() {
    if (this.context.transitionPending() || !this.context.selectedFarm()) return;
    this.scope.reset();
    this.clearData();
    const f = this.applied;
    const fail = (failure: unknown) => {
      this.loading.set(false);
      this.error.set(
        managementError(failure, 'Não foi possível carregar os registros. Tente novamente.'),
      );
    };
    if (this.tab() === 'agenda')
      this.scope.run(
        this.api.agenda({
          includeOverdue: f['includeOverdue'] === 'true' ? true : undefined,
          source: f['source'] || undefined,
          type: f['type'] || undefined,
          animalId: f['animalId'] || undefined,
          from: f['from'] || undefined,
          to: f['to'] || undefined,
          page: this.page(),
        }),
        (value) => {
          this.agenda.set(value);
          this.loading.set(false);
        },
        fail,
      );
    else if (this.tab() === 'pending')
      this.scope.run(
        this.api.pendingWork({
          type: f['type'] || undefined,
          animalId: f['animalId'] || undefined,
          page: this.page(),
        }),
        (value) => {
          this.pending.set(value);
          this.loading.set(false);
        },
        fail,
      );
    else
      this.scope.run(
        this.api.planner({
          status: f['status'] || undefined,
          type: f['type'] || undefined,
          animalId: f['animalId'] || undefined,
          groupId: f['groupId'] || undefined,
          from: f['from'] || undefined,
          to: f['to'] || undefined,
          page: this.page(),
        }),
        (value) => {
          this.planner.set(value);
          this.loading.set(false);
        },
        fail,
      );
  }
  total() {
    return this.tab() === 'agenda'
      ? (this.agenda()?.totalElements ?? null)
      : this.tab() === 'pending'
        ? (this.pending()?.totalElements ?? null)
        : (this.planner()?.totalElements ?? null);
  }
  itemCount() {
    return this.tab() === 'agenda'
      ? this.agenda()?.items.length || 0
      : this.tab() === 'pending'
        ? this.pending()?.items.length || 0
        : this.planner()?.items.length || 0;
  }
  totalPages() {
    const data =
      this.tab() === 'agenda'
        ? this.agenda()
        : this.tab() === 'pending'
          ? this.pending()
          : this.planner();
    return data ? Math.ceil(data.totalElements / data.size) : 0;
  }
  changePage(page: number) {
    if (this.loading() || page < 0 || this.context.transitionPending()) return;
    this.page.set(page);
    this.load();
  }
  private canWrite() {
    return (
      this.permissions.canMutateHerd() &&
      !this.context.transitionPending() &&
      !!this.context.selectedFarm()
    );
  }
  private resetEditor() {
    this.editorScope.reset();
    this.editorOpen.set(false);
    this.editorLoading.set(false);
    this.editorError.set('');
    this.mode.set('create');
    this.editing.set(null);
    this.selectedAnimal.set(null);
    this.saving.set(false);
    this.review.set(false);
    this.formError.set('');
    this.title = '';
    this.notes = '';
    this.animalId = '';
    this.groupId = '';
    this.plannerType = 'GENERAL';
    this.scheduledFor = localDateOnly();
    this.operationId = '';
    this.editorId = '';
    this.command = null;
  }
  editorTitle() {
    return {
      create: 'Planejar atividade',
      edit: 'Corrigir atividade planejada',
      view: 'Detalhes da atividade',
      complete: 'Concluir atividade',
      cancel: 'Cancelar atividade',
    }[this.mode()];
  }
  openCreate() {
    if (!this.canWrite() || this.saving()) return;
    this.resetEditor();
    this.operationId = newUuid();
    this.groupId = this.filterGroupId;
    this.editorOpen.set(true);
  }
  openItem(id: string, mode: EditorMode) {
    if (this.saving() || this.context.transitionPending() || (mode !== 'view' && !this.canWrite()))
      return;
    this.resetEditor();
    this.editorId = id;
    this.mode.set(mode);
    this.operationId = newUuid();
    this.editorOpen.set(true);
    this.editorLoading.set(true);
    this.editorScope.run(
      this.api.plannerItem(id),
      (item) => {
        this.editorLoading.set(false);
        this.editing.set(item);
        if (mode !== 'view' && item.status !== 'OPEN') {
          this.editorError.set(
            'A atividade já foi encerrada. Recarregue a consulta para revisar o histórico.',
          );
          return;
        }
        this.title = item.title;
        this.notes = item.notes || '';
        this.animalId = item.animalId || '';
        this.groupId = item.groupId || '';
        this.plannerType = item.type;
        this.scheduledFor = item.scheduledFor;
      },
      (failure) => {
        this.editorLoading.set(false);
        this.editorError.set(
          managementError(failure, 'Não foi possível carregar a atividade. Tente novamente.'),
        );
      },
    );
  }
  reloadEditor() {
    if (this.editorId && !this.saving()) this.openItem(this.editorId, this.mode());
  }
  closeEditor() {
    if (!this.saving()) this.resetEditor();
  }
  chooseAnimal(animal: Animal) {
    if (this.saving() || this.review() || !this.canWrite()) return;
    this.selectedAnimal.set(animal);
    this.animalId = animal.id;
  }
  clearAnimal() {
    if (!this.saving() && !this.review()) {
      this.selectedAnimal.set(null);
      this.animalId = '';
    }
  }
  prepare() {
    if (
      !this.canWrite() ||
      this.saving() ||
      this.review() ||
      !['create', 'edit'].includes(this.mode()) ||
      this.editorLoading() ||
      this.editorError()
    )
      return;
    if (
      !this.title.trim() ||
      this.title.trim().length > 160 ||
      this.notes.length > 1000 ||
      !validImportDate(this.scheduledFor) ||
      !this.plannerTypes.includes(this.plannerType) ||
      (this.animalId && !validUuid(this.animalId)) ||
      (this.groupId && !validUuid(this.groupId))
    ) {
      this.formError.set('Revise o título, a data e os vínculos antes de continuar.');
      return;
    }
    this.command = {
      operationId: this.operationId,
      ...(this.mode() === 'edit' ? { expectedVersion: this.editing()!.version } : {}),
      type: this.plannerType,
      title: this.title.trim(),
      notes: this.notes.trim() || null,
      scheduledFor: this.scheduledFor,
      animalId: this.animalId || null,
      groupId: this.groupId || null,
    };
    this.formError.set('');
    this.review.set(true);
  }
  save() {
    if (
      !this.canWrite() ||
      this.saving() ||
      this.editorLoading() ||
      this.editorError() ||
      this.mode() === 'view'
    )
      return;
    const item = this.editing();
    let request;
    if (this.mode() === 'complete' || this.mode() === 'cancel') {
      if (!item || item.status !== 'OPEN') return;
      this.command ??= { operationId: this.operationId, expectedVersion: item.version };
      request =
        this.mode() === 'complete'
          ? this.api.completePlanner(item.id, this.command)
          : this.api.cancelPlanner(item.id, this.command);
    } else {
      if (!this.review() || !this.command || (this.mode() === 'edit' && !item)) return;
      request =
        this.mode() === 'edit'
          ? this.api.correctPlanner(item!.id, this.command)
          : this.api.createPlanner(this.command);
    }
    this.saving.set(true);
    this.formError.set('');
    this.editorScope.run(
      request,
      () => {
        this.resetEditor();
        this.toast.show(
          'success',
          'Atividade atualizada',
          'A operação foi registrada no planejamento.',
        );
        this.load();
      },
      (failure) => {
        this.saving.set(false);
        this.formError.set(
          managementError(
            failure,
            'Não foi possível confirmar a operação. Tente novamente com o mesmo comando.',
          ),
        );
      },
    );
  }
}
function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
