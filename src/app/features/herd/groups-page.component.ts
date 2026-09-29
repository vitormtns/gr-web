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
import { Observable } from 'rxjs';
import { ContextRequestScope } from '../management/management.shared';
import { validImportDate } from './herd-import';
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
                ><button class="quiet-button" type="button" (click)="beginArchive(group)">
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
          <button class="quiet-button" type="button" (click)="closeGroup()">Fechar grupo</button>
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
      @if (editorOpen() && !reviewing()) {
        <fieldset [disabled]="saving() || preparing()" class="form-grid compact">
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
                ><input type="checkbox" [(ngModel)]="rules.onlyReproductionActive" /> Apenas
                gestação aberta</span
              ></label
            ><label class="wide"
              ><span
                ><input type="checkbox" [(ngModel)]="rules.onlyMissingProfile" /> Apenas nascimento
                ou mãe ausentes</span
              ></label
            >
          }
          @if (formError()) {
            <p class="form-error wide" role="alert">{{ formError() }}</p>
          }
        </fieldset>
      }
      @if (reviewing()) {
        <section class="semantic-note">
          <h3>Revise o grupo</h3>
          <p>
            {{ name }} · {{ kind === 'MANUAL' ? 'Associação manual' : 'Associação por regras' }}
          </p>
          @if (kind === 'SMART') {
            <p>
              Sexo:
              {{ rules.sex === 'FEMALE' ? 'Fêmea' : rules.sex === 'MALE' ? 'Macho' : 'Todos' }}
            </p>
            <p>Estado: {{ rules.status ? statusLabels[rules.status] : 'Todos' }}</p>
            <p>
              Idade mínima:
              {{ rules.minAgeMonths === null ? 'Não informada' : rules.minAgeMonths + ' meses' }}
            </p>
            <p>
              Idade máxima:
              {{ rules.maxAgeMonths === null ? 'Não informada' : rules.maxAgeMonths + ' meses' }}
            </p>
            <p>Apenas gestação aberta: {{ rules.onlyReproductionActive ? 'Sim' : 'Não' }}</p>
            <p>Apenas nascimento ou mãe ausentes: {{ rules.onlyMissingProfile ? 'Sim' : 'Não' }}</p>
          }
          @if (editing()) {
            <p>Versão consultada: {{ editing()?.version }}</p>
          }
        </section>
      }
      @if (formError()) {
        <p class="form-error" role="alert">{{ formError() }}</p>
      }
      <div dialog-actions>
        <button
          class="quiet-button"
          type="button"
          [disabled]="saving() || preparing()"
          (click)="closeEditor()"
        >
          Cancelar</button
        ><button
          class="primary-action"
          type="button"
          [disabled]="saving() || preparing() || (!reviewing() && !valid())"
          (click)="reviewing() ? save() : reviewEditor()"
        >
          {{
            preparing() ? 'Consultando versão…' : reviewing() ? 'Confirmar grupo' : 'Revisar grupo'
          }}
        </button>
      </div></gr-dialog
    >
    <gr-dialog [open]="archiving() !== null" (closed)="closeArchive()"
      ><span dialog-title>Arquivar grupo</span>
      <p>Versão consultada: {{ archiving()?.version }}</p>
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

    <gr-dialog [open]="membershipReview() !== null" (closed)="closeMembership()">
      <span dialog-title>Revisar associação ao grupo</span>
      <p>
        {{ membershipReview()?.add ? 'Adicionar' : 'Remover' }}
        {{ membershipReview()?.animal?.identification }}
        {{ membershipReview()?.add ? 'no grupo' : 'do grupo' }}
        {{ membershipReview()?.group?.name }}.
      </p>
      <p>Versão consultada: {{ membershipReview()?.group?.version }}</p>
      <p>O estado e o território do animal permanecem independentes da associação ao grupo.</p>
      @if (formError()) {
        <p class="form-error" role="alert">{{ formError() }}</p>
      }
      <div dialog-actions>
        <button
          class="quiet-button"
          type="button"
          [disabled]="saving()"
          (click)="closeMembership()"
        >
          Voltar
        </button>
        <button
          class="primary-action"
          type="button"
          [disabled]="saving()"
          (click)="confirmMembership()"
        >
          {{ saving() ? 'Registrando…' : 'Confirmar associação' }}
        </button>
      </div>
    </gr-dialog>
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
  private readonly listScope = new ContextRequestScope(this.destroy);
  private readonly memberScope = new ContextRequestScope(this.destroy);
  private readonly writeScope = new ContextRequestScope(this.destroy);
  readonly preparing = signal(false);
  readonly reviewing = signal(false);
  readonly membershipReview = signal<{ group: HerdGroup; animal: Animal; add: boolean } | null>(
    null,
  );
  private editorRequest: (() => Observable<HerdGroup>) | null = null;
  constructor() {
    effect(() => {
      this.context.contextVersion();
      const pending = this.context.transitionPending();
      const farm = this.context.selectedFarm();
      this.listScope.reset();
      this.memberScope.reset();
      this.writeScope.reset();
      this.preparing.set(false);
      this.reviewing.set(false);
      this.membershipReview.set(null);
      this.editorRequest = null;
      this.editing.set(null);
      this.name = '';
      this.kind = 'MANUAL';
      this.rules = emptyGroupRules();
      this.createId = '';
      this.today = localDateOnly();
      this.referenceDate = this.today;
      this.error.set(null);
      this.membersError.set(false);
      this.membersLoading.set(false);
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
    this.listScope.reset();
    if (this.context.transitionPending()) return;
    this.loading.set(true);
    this.error.set(null);
    this.listScope.run(
      this.api.groups(page),
      (value) => {
        this.groups.set(value);
        this.loading.set(false);
      },
      (e) => {
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
    );
  }
  select(group: HerdGroup) {
    this.selected.set(group);
    this.formError.set('');
    this.loadMembers(0);
  }
  loadMembers(page: number) {
    const group = this.selected();
    this.memberScope.reset();
    if (!group || this.context.transitionPending()) return;
    if (!validImportDate(this.referenceDate) || this.referenceDate > this.today) {
      this.members.set(null);
      this.membersLoading.set(false);
      this.membersError.set(true);
      this.formError.set('Informe uma referência de idade válida até hoje.');
      return;
    }
    this.formError.set('');
    this.membersLoading.set(true);
    this.membersError.set(false);
    this.memberScope.run(
      this.api.groupAnimals(group.id, page, this.referenceDate),
      (value) => {
        this.members.set(value);
        this.membersLoading.set(false);
      },
      () => {
        this.membersError.set(true);
        this.membersLoading.set(false);
      },
    );
  }
  openCreate() {
    if (
      !this.permissions.canManageHerdGroups() ||
      this.context.transitionPending() ||
      this.saving() ||
      this.preparing()
    )
      return;
    this.writeScope.reset();
    this.reviewing.set(false);
    this.editorRequest = null;
    this.createId = newUuid();
    this.editing.set(null);
    this.name = '';
    this.kind = 'MANUAL';
    this.rules = emptyGroupRules();
    this.formError.set('');
    this.editorOpen.set(true);
  }
  edit(group: HerdGroup) {
    if (
      !this.permissions.canManageHerdGroups() ||
      this.context.transitionPending() ||
      this.saving() ||
      this.preparing()
    )
      return;
    this.writeScope.reset();
    this.reviewing.set(false);
    this.editorRequest = null;
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
      [...this.name.trim()].length <= 120 &&
      !this.name.includes('\0') &&
      (this.kind === 'MANUAL' ||
        ([this.rules.minAgeMonths, this.rules.maxAgeMonths].every(
          (x) => x === null || (Number.isInteger(x) && x >= 0 && x <= 2147483647),
        ) &&
          (this.rules.minAgeMonths === null ||
            this.rules.maxAgeMonths === null ||
            this.rules.minAgeMonths <= this.rules.maxAgeMonths)))
    );
  }
  reviewEditor() {
    if (
      !this.valid() ||
      !this.permissions.canManageHerdGroups() ||
      this.saving() ||
      this.preparing() ||
      this.context.transitionPending()
    )
      return;
    const rules = this.kind === 'MANUAL' ? emptyGroupRules() : { ...this.rules };
    const name = this.name.trim();
    const current = this.editing();
    if (!current) {
      const body = { id: this.createId, name, kind: this.kind, rules };
      this.editorRequest = () => this.api.createGroup(body);
      this.reviewing.set(true);
      return;
    }
    this.prepareGroup(current.id, (fresh) => {
      this.editing.set(fresh);
      this.kind = fresh.kind;
      const body = { expectedVersion: fresh.version, name, rules };
      this.editorRequest = () => this.api.updateGroup(fresh.id, body);
      this.reviewing.set(true);
    });
  }
  save() {
    if (!this.reviewing() || !this.editorRequest) return;
    this.run(this.editorRequest(), 'Grupo salvo');
  }
  beginArchive(group: HerdGroup) {
    this.prepareGroup(group.id, (fresh) => this.archiving.set(fresh));
  }
  archive() {
    const group = this.archiving();
    if (group) this.run(this.api.archiveGroup(group.id, group.version), 'Grupo arquivado');
  }
  membership(animal: Animal, add: boolean) {
    const group = this.selected();
    if (!group || group.kind !== 'MANUAL') return;
    this.prepareGroup(group.id, (fresh) => {
      this.selected.set(fresh);
      this.membershipReview.set({ group: fresh, animal, add });
    });
  }
  confirmMembership() {
    const review = this.membershipReview();
    if (!review) return;
    this.run(
      this.api.membership(review.group.id, review.animal.id, review.group.version, review.add),
      review.add ? 'Animal adicionado ao grupo' : 'Animal removido do grupo',
    );
  }
  private prepareGroup(id: string, ready: (group: HerdGroup) => void) {
    if (
      !this.permissions.canManageHerdGroups() ||
      this.saving() ||
      this.preparing() ||
      this.context.transitionPending()
    )
      return;
    this.writeScope.reset();
    this.preparing.set(true);
    this.formError.set('');
    this.writeScope.run(
      this.api.group(id),
      (group) => {
        this.preparing.set(false);
        if (group.status !== 'ACTIVE') {
          this.formError.set('O grupo não está ativo. Recarregue a lista.');
          return;
        }
        ready(group);
      },
      (e) => {
        this.preparing.set(false);
        this.formError.set(
          e instanceof AppError
            ? e.message + ' ' + errorReference(e.requestId)
            : 'Não foi possível consultar o grupo. Tente novamente.',
        );
      },
    );
  }
  private run(request: ReturnType<ParityApi['createGroup']>, message: string) {
    if (
      !this.permissions.canManageHerdGroups() ||
      this.saving() ||
      this.context.transitionPending()
    )
      return;
    this.saving.set(true);
    this.formError.set('');
    this.writeScope.run(
      request,
      (value) => {
        this.saving.set(false);
        this.editorOpen.set(false);
        this.reviewing.set(false);
        this.membershipReview.set(null);
        this.editorRequest = null;
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
      (e) => {
        this.saving.set(false);
        this.formError.set(
          e instanceof AppError
            ? `${e.status === 409 ? 'O grupo mudou. Recarregue antes de tentar novamente.' : e.message} ${errorReference(e.requestId)}`
            : 'Não foi possível concluir a ação.',
        );
      },
    );
  }
  closeEditor() {
    if (!this.saving() && !this.preparing()) {
      this.writeScope.reset();
      this.editorOpen.set(false);
      this.reviewing.set(false);
      this.editorRequest = null;
      this.editing.set(null);
      this.name = '';
      this.rules = emptyGroupRules();
    }
  }
  closeArchive() {
    if (!this.saving()) {
      this.writeScope.reset();
      this.archiving.set(null);
    }
  }
  closeGroup() {
    if (this.saving()) return;
    this.memberScope.reset();
    this.selected.set(null);
    this.members.set(null);
    this.membersError.set(false);
    this.membersLoading.set(false);
  }
  closeMembership() {
    if (!this.saving()) {
      this.writeScope.reset();
      this.membershipReview.set(null);
    }
  }
}
