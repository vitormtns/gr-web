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
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AppError } from '../../core/api/api.models';
import { ContextStore } from '../../core/context/context.store';
import { PermissionService } from '../../core/permissions/permission.service';
import { localDateOnly } from '../../core/date/date-only';
import { PaginationComponent } from '../../design-system/data-display/data-display';
import {
  ErrorStateComponent,
  SkeletonComponent,
  ToastService,
} from '../../design-system/feedback/feedback';
import { DialogComponent } from '../../design-system/surfaces/surfaces';
import { Animal, newUuid, statusLabels } from './herd.models';
import { AnimalPickerComponent } from './animal-picker.component';
import { ParityApi } from './parity-api.service';
import {
  CountedPage,
  GroupAnimals,
  GroupKind,
  GroupRules,
  HerdGroup,
  emptyGroupRules,
} from './parity.models';
import { errorReference } from './herd.shared';

@Component({
  selector: 'app-groups-page',
  imports: [
    FormsModule,
    RouterLink,
    PaginationComponent,
    ErrorStateComponent,
    SkeletonComponent,
    DialogComponent,
    AnimalPickerComponent,
  ],
  template: ` <div class="herd-page operations-page page-enter">
    <a class="back-link" routerLink="/rebanho/animais">← Voltar ao rebanho</a>
    <header class="page-header">
      <div>
        <span class="eyebrow">MANEJO E ESCOPO</span>
        <h1>Grupos do rebanho</h1>
        <p>Organize animais por associação manual ou regras consultadas na fazenda.</p>
      </div>
      @if (permissions.canManageHerdGroups()) {
        <button class="primary-action" type="button" (click)="openCreate()">Criar grupo</button>
      }
    </header>
    @if (error()) {
      <gr-error-state
        title="Não foi possível carregar os grupos"
        [reference]="reference()"
        (retry)="load()"
      />
    } @else if (loading()) {
      <gr-skeleton /><gr-skeleton />
    } @else {
      <section class="section-frame parity-section">
        <h2>
          {{ groups()?.totalElements || 0 }}
          {{ groups()?.totalElements === 1 ? 'grupo ativo' : 'grupos ativos' }}
        </h2>
        @if (!groups()?.items?.length) {
          <p>Nenhum grupo cadastrado. Organize o manejo criando um grupo manual ou por regras.</p>
        }
        @for (group of groups()?.items || []; track group.id) {
          <article class="group-row">
            <div>
              <strong>{{ group.name }}</strong>
              <p>
                {{ group.kind === 'MANUAL' ? 'Associação manual' : 'Associação por regras atuais' }}
              </p>
            </div>
            <div class="parity-actions">
              <button class="secondary-action" type="button" (click)="select(group)">
                Ver animais</button
              ><a
                class="secondary-action"
                [routerLink]="['/rebanho/agenda']"
                [queryParams]="{ groupId: group.id }"
                >Ver atividades</a
              >
              @if (permissions.canManageHerdGroups()) {
                <button class="quiet-button" type="button" (click)="edit(group)">Editar</button
                ><button class="quiet-button" type="button" (click)="archiving.set(group)">
                  Arquivar
                </button>
              }
            </div>
          </article>
        }
        <gr-pagination
          [page]="groups()?.page || 0"
          [totalPages]="groupPages()"
          (pageChange)="load($event)"
        />
      </section>
    }
    @if (selected(); as group) {
      <section class="section-frame parity-section">
        <div class="parity-actions">
          <h2>{{ group.name }}</h2>
          <button class="quiet-button" type="button" (click)="selected.set(null)">
            Fechar grupo
          </button>
        </div>
        <p>
          {{
            group.kind === 'SMART'
              ? 'Os membros refletem o estado atual. A referência altera apenas a idade calculada.'
              : 'A associação manual pode incluir animais inativos.'
          }}
        </p>
        <label
          >Referência de idade<input
            type="date"
            [(ngModel)]="referenceDate"
            [max]="today"
            (change)="loadMembers(0)"
        /></label>
        @if (membersLoading()) {
          <gr-skeleton />
        } @else if (membersError()) {
          <gr-error-state title="Não foi possível carregar os membros" (retry)="loadMembers(0)" />
        } @else {
          <p>
            {{ members()?.totalElements || 0 }}
            {{ members()?.totalElements === 1 ? 'animal neste grupo' : 'animais neste grupo' }}.
          </p>
          <div class="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Animal</th>
                  <th>Estado</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                @for (animal of members()?.items || []; track animal.id) {
                  <tr>
                    <td>
                      <a [routerLink]="['/rebanho/animais', animal.id]">{{
                        animal.identification
                      }}</a>
                    </td>
                    <td>{{ statusLabels[animal.status] }}</td>
                    <td>
                      @if (group.kind === 'MANUAL' && permissions.canManageHerdGroups()) {
                        <button
                          class="quiet-button"
                          type="button"
                          [disabled]="saving()"
                          (click)="membership(animal, false)"
                        >
                          Remover do grupo
                        </button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <gr-pagination
            [page]="members()?.page || 0"
            [totalPages]="members()?.totalPages || 0"
            (pageChange)="loadMembers($event)"
          />
        }
        @if (group.kind === 'MANUAL' && permissions.canManageHerdGroups()) {
          <h3>Adicionar animal</h3>
          <app-animal-picker
            status=""
            [disabled]="saving()"
            [excluded]="memberIds()"
            (chosen)="membership($event, true)"
          />
        }
      </section>
    }
    @if (formError()) {
      <p class="form-error" role="alert">{{ formError() }}</p>
    }
    <gr-dialog [open]="editorOpen()" (closed)="closeEditor()"
      ><span dialog-title>{{ editing() ? 'Editar grupo' : 'Criar grupo' }}</span>
      <fieldset [disabled]="saving()" class="form-grid compact">
        <label class="wide">Nome<input [(ngModel)]="name" maxlength="120" /></label
        ><label
          >Associação<select [(ngModel)]="kind" [disabled]="editing() !== null">
            <option value="MANUAL">Manual</option>
            <option value="SMART">Por regras</option>
          </select></label
        >
        @if (kind === 'SMART') {
          <label
            >Sexo<select [(ngModel)]="rules.sex">
              <option [ngValue]="null">Todos</option>
              <option value="FEMALE">Fêmea</option>
              <option value="MALE">Macho</option>
            </select></label
          ><label
            >Estado<select [(ngModel)]="rules.status">
              <option [ngValue]="null">Todos</option>
              @for (status of statuses; track status) {
                <option [value]="status">{{ statusLabels[status] }}</option>
              }
            </select></label
          ><label
            >Idade mínima (meses)<input
              type="number"
              min="0"
              step="1"
              [(ngModel)]="rules.minAgeMonths" /></label
          ><label
            >Idade máxima (meses)<input
              type="number"
              min="0"
              step="1"
              [(ngModel)]="rules.maxAgeMonths" /></label
          ><label class="wide"
            ><span
              ><input type="checkbox" [(ngModel)]="rules.onlyReproductionActive" /> Apenas gestação
              aberta</span
            ></label
          ><label class="wide"
            ><span
              ><input type="checkbox" [(ngModel)]="rules.onlyMissingProfile" /> Apenas nascimento ou
              mãe ausentes</span
            ></label
          >
        }
        @if (formError()) {
          <p class="form-error wide" role="alert">{{ formError() }}</p>
        }
      </fieldset>
      <div dialog-actions>
        <button class="quiet-button" type="button" [disabled]="saving()" (click)="closeEditor()">
          Cancelar</button
        ><button
          class="primary-action"
          type="button"
          [disabled]="saving() || !valid()"
          (click)="save()"
        >
          Salvar grupo
        </button>
      </div></gr-dialog
    >
    <gr-dialog [open]="archiving() !== null" (closed)="closeArchive()"
      ><span dialog-title>Arquivar grupo</span>
      <p>
        {{ archiving()?.name }} deixará de estar disponível para novas consultas e atividades. Os
        animais não serão alterados.
      </p>
      @if (formError()) {
        <p class="form-error" role="alert">{{ formError() }}</p>
      }
      <div dialog-actions>
        <button class="quiet-button" type="button" (click)="closeArchive()">Voltar</button
        ><button class="primary-action" type="button" [disabled]="saving()" (click)="archive()">
          Confirmar arquivamento
        </button>
      </div></gr-dialog
    >
  </div>`,
  styleUrls: ['./herd-page.scss', './operations-page.component.scss', './parity.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupsPageComponent {
  readonly permissions = inject(PermissionService);
  private readonly context = inject(ContextStore);
  private readonly api = inject(ParityApi);
  private readonly destroy = inject(DestroyRef);
  private readonly toast = inject(ToastService);
  readonly groups = signal<CountedPage<HerdGroup> | null>(null);
  readonly selected = signal<HerdGroup | null>(null);
  readonly members = signal<GroupAnimals | null>(null);
  readonly loading = signal(true);
  readonly error = signal<AppError | null>(null);
  readonly membersLoading = signal(false);
  readonly membersError = signal(false);
  readonly editorOpen = signal(false);
  readonly editing = signal<HerdGroup | null>(null);
  readonly archiving = signal<HerdGroup | null>(null);
  readonly saving = signal(false);
  readonly formError = signal('');
  readonly statusLabels = statusLabels;
  readonly statuses = Object.keys(statusLabels) as Animal['status'][];
  name = '';
  kind: GroupKind = 'MANUAL';
  rules: GroupRules = emptyGroupRules();
  today = localDateOnly();
  referenceDate = this.today;
  private createId = '';
  private contextEpoch = 0;
  private generation = 0;
  private memberGeneration = 0;
  constructor() {
    effect(() => {
      this.context.contextVersion();
      const pending = this.context.transitionPending();
      const farm = this.context.selectedFarm();
      this.contextEpoch++;
      this.generation++;
      this.memberGeneration++;
      this.groups.set(null);
      this.selected.set(null);
      this.members.set(null);
      this.editorOpen.set(false);
      this.archiving.set(null);
      this.saving.set(false);
      this.formError.set('');
      if (!pending && farm) untracked(() => this.load());
    });
  }
  reference() {
    return errorReference(this.error()?.requestId);
  }
  groupPages() {
    return Math.ceil((this.groups()?.totalElements || 0) / (this.groups()?.size || 20));
  }
  memberIds() {
    return this.members()?.items.map((a) => a.id) || [];
  }
  load(page = 0) {
    const g = ++this.generation;
    this.loading.set(true);
    this.error.set(null);
    this.api
      .groups(page)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (value) => {
          if (g !== this.generation) return;
          this.groups.set(value);
          this.loading.set(false);
        },
        error: (e) => {
          if (g !== this.generation) return;
          this.error.set(
            e instanceof AppError
              ? e
              : new AppError(
                  'unavailable',
                  'Não foi possível carregar os grupos.',
                  503,
                  'READ_FAILED',
                ),
          );
          this.loading.set(false);
        },
      });
  }
  select(group: HerdGroup) {
    this.selected.set(group);
    this.formError.set('');
    this.loadMembers(0);
  }
  loadMembers(page: number) {
    const group = this.selected();
    if (!group || !this.referenceDate || this.referenceDate > this.today) return;
    const g = ++this.memberGeneration;
    this.membersLoading.set(true);
    this.membersError.set(false);
    this.api
      .groupAnimals(group.id, page, this.referenceDate)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (value) => {
          if (g !== this.memberGeneration) return;
          this.members.set(value);
          this.membersLoading.set(false);
        },
        error: () => {
          if (g !== this.memberGeneration) return;
          this.membersError.set(true);
          this.membersLoading.set(false);
        },
      });
  }
  openCreate() {
    if (!this.permissions.canManageHerdGroups()) return;
    this.createId = newUuid();
    this.editing.set(null);
    this.name = '';
    this.kind = 'MANUAL';
    this.rules = emptyGroupRules();
    this.formError.set('');
    this.editorOpen.set(true);
  }
  edit(group: HerdGroup) {
    if (!this.permissions.canManageHerdGroups()) return;
    this.editing.set(group);
    this.name = group.name;
    this.kind = group.kind;
    this.rules = { ...group.rules };
    this.formError.set('');
    this.editorOpen.set(true);
  }
  valid() {
    return (
      !!this.name.trim() &&
      (this.kind === 'MANUAL' ||
        ([this.rules.minAgeMonths, this.rules.maxAgeMonths].every(
          (x) => x === null || (Number.isInteger(x) && x >= 0),
        ) &&
          (this.rules.minAgeMonths === null ||
            this.rules.maxAgeMonths === null ||
            this.rules.minAgeMonths <= this.rules.maxAgeMonths)))
    );
  }
  save() {
    if (!this.valid() || !this.permissions.canManageHerdGroups() || this.saving()) return;
    const rules = this.kind === 'MANUAL' ? emptyGroupRules() : { ...this.rules };
    const current = this.editing();
    const request = current
      ? this.api.updateGroup(current.id, {
          expectedVersion: current.version,
          name: this.name.trim(),
          rules,
        })
      : this.api.createGroup({ id: this.createId, name: this.name.trim(), kind: this.kind, rules });
    this.run(request, 'Grupo salvo');
  }
  archive() {
    const group = this.archiving();
    if (group) this.run(this.api.archiveGroup(group.id, group.version), 'Grupo arquivado');
  }
  membership(animal: Animal, add: boolean) {
    const group = this.selected();
    if (!group || group.kind !== 'MANUAL') return;
    this.run(
      this.api.membership(group.id, animal.id, group.version, add),
      add ? 'Animal adicionado ao grupo' : 'Animal removido do grupo',
    );
  }
  private run(request: ReturnType<ParityApi['createGroup']>, message: string) {
    if (
      !this.permissions.canManageHerdGroups() ||
      this.saving() ||
      this.context.transitionPending()
    )
      return;
    const epoch = this.contextEpoch;
    this.saving.set(true);
    this.formError.set('');
    request.pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: (value) => {
        if (epoch !== this.contextEpoch) return;
        this.saving.set(false);
        this.editorOpen.set(false);
        this.archiving.set(null);
        this.toast.show('success', message);
        if (this.selected()?.id === value.id) {
          if (value.status === 'ARCHIVED') this.selected.set(null);
          else {
            this.selected.set(value);
            this.loadMembers(0);
          }
        }
        this.load(this.groups()?.page || 0);
      },
      error: (e) => {
        if (epoch !== this.contextEpoch) return;
        this.saving.set(false);
        this.formError.set(
          e instanceof AppError
            ? `${e.status === 409 ? 'O grupo mudou. Recarregue antes de tentar novamente.' : e.message} ${errorReference(e.requestId)}`
            : 'Não foi possível concluir a ação.',
        );
      },
    });
  }
  closeEditor() {
    if (!this.saving()) this.editorOpen.set(false);
  }
  closeArchive() {
    if (!this.saving()) this.archiving.set(null);
  }
}
