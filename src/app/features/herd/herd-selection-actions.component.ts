import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AppError } from '../../core/api/api.models';
import { ContextStore } from '../../core/context/context.store';
import { PermissionService } from '../../core/permissions/permission.service';
import { DialogComponent } from '../../design-system/surfaces/surfaces';
import { ToastService } from '../../design-system/feedback/feedback';
import { ContextRequestScope } from '../management/management.shared';
import { BreedingBatchComponent } from './breeding-batch.component';
import { HealthPageComponent } from './health-page.component';
import { HerdApi } from './herd-api.service';
import { Animal, newUuid } from './herd.models';
import { ParityApi } from './parity-api.service';
import {
  CreateGroupWithAnimalsCommand,
  GroupMembershipBatchCommand,
  HerdGroup,
} from './parity.models';

@Component({
  selector: 'app-herd-selection-actions',
  imports: [FormsModule, DialogComponent, BreedingBatchComponent, HealthPageComponent],
  template: `
    <div class="parity-actions">
      @if (permissions.canMutateHerd()) {
        <button
          class="secondary-action"
          type="button"
          [disabled]="!validSelection()"
          (click)="health()?.openSelected(animals())"
        >
          Tratamento da seleção
        </button>
        <button
          class="secondary-action"
          type="button"
          [disabled]="!validSelection()"
          (click)="breeding()?.startWithSelection(animals())"
        >
          Serviço da seleção
        </button>
      }
      @if (permissions.canManageHerdGroups()) {
        <button
          class="secondary-action"
          type="button"
          [disabled]="!validSelection()"
          (click)="openGroup()"
        >
          Grupo da seleção
        </button>
      }
    </div>
    <app-health-page [embedded]="true" (changed)="changed.emit()" />
    <app-breeding-batch [embedded]="true" (changed)="changed.emit()" />
    <gr-dialog [open]="groupOpen()" size="lg" (closed)="closeGroup()">
      <span dialog-title>Grupo da seleção</span>
      <p>
        {{ snapshot().length === 1 ? 'Somente o animal selecionado será associado.' : 'Somente os ' + snapshot().length + ' animais selecionados serão associados.' }} O lote tem limite
        de 100 animais.
      </p>
      @if (!reviewing()) {
        <fieldset class="form-grid compact" [disabled]="busy()">
          <label
            >Destino<select [(ngModel)]="mode">
              <option value="new">Criar grupo manual</option>
              <option value="existing">Adicionar a grupo manual</option>
            </select></label
          >
          @if (mode === 'new') {
            <label>Nome do grupo<input [(ngModel)]="name" maxlength="120" /></label>
          } @else {
            <label
              >Grupo<select [(ngModel)]="groupId">
                <option value="">Selecione um grupo</option>
                @for (group of groups(); track group.id) {
                  <option [value]="group.id">{{ group.name }}</option>
                }
              </select></label
            >
            <div class="parity-actions">
              <button
                type="button"
                class="quiet-button"
                [disabled]="busy() || groupPage() === 0"
                (click)="loadGroups(groupPage() - 1)"
              >
                Grupos anteriores</button
              ><span>Página {{ groupPage() + 1 }} de {{ groupPages() }}</span
              ><button
                type="button"
                class="quiet-button"
                [disabled]="busy() || groupPage() + 1 >= groupPages()"
                (click)="loadGroups(groupPage() + 1)"
              >
                Próximos grupos
              </button>
            </div>
          }
        </fieldset>
      } @else {
        <p>
          Confirmar associação ao grupo <strong>{{ reviewedName() }}</strong
          >:
        </p>
      }
      <ul>
        @for (animal of snapshot(); track animal.id) {
          <li>{{ animal.identification }}{{ animal.name ? ' · ' + animal.name : '' }}</li>
        }
      </ul>
      @if (error()) {
        <p class="form-error" role="alert">{{ error() }}</p>
      }
      <div dialog-actions>
        <button
          type="button"
          class="quiet-button"
          [disabled]="busy()"
          (click)="reviewing() ? editAgain() : closeGroup()"
        >
          {{ reviewing() ? 'Voltar à seleção do grupo' : 'Cancelar' }}
        </button>
        <button
          type="button"
          class="primary-action"
          [disabled]="busy() || !validGroup()"
          (click)="reviewing() ? submitGroup() : reviewGroup()"
        >
          {{
            busy() ? 'Consultando…' : reviewing() ? 'Confirmar associação' : 'Revisar associação'
          }}
        </button>
      </div>
    </gr-dialog>
  `,
  styleUrls: ['./herd-page.scss', './operations-page.component.scss', './parity.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HerdSelectionActionsComponent {
  readonly animals = input.required<readonly Animal[]>();
  readonly changed = output<void>();
  readonly permissions = inject(PermissionService);
  private readonly context = inject(ContextStore);
  private readonly api = inject(ParityApi);
  private readonly herd = inject(HerdApi);
  private readonly toast = inject(ToastService);
  private readonly scope = new ContextRequestScope(inject(DestroyRef));
  readonly health = viewChild(HealthPageComponent);
  readonly breeding = viewChild(BreedingBatchComponent);
  readonly groupOpen = signal(false);
  readonly busy = signal(false);
  readonly reviewing = signal(false);
  readonly snapshot = signal<Animal[]>([]);
  readonly groups = signal<HerdGroup[]>([]);
  readonly groupPage = signal(0);
  readonly groupPages = signal(1);
  readonly reviewedName = signal('');
  readonly error = signal('');
  mode: 'new' | 'existing' = 'new';
  name = '';
  groupId = '';
  private createCommand: CreateGroupWithAnimalsCommand | null = null;
  private batchCommand: { id: string; body: GroupMembershipBatchCommand } | null = null;
  constructor() {
    effect(() => {
      this.context.contextVersion();
      this.context.transitionPending();
      this.scope.reset();
      this.groupOpen.set(false);
      this.busy.set(false);
      this.reviewing.set(false);
      this.snapshot.set([]);
      this.groups.set([]);
      this.error.set('');
      this.createCommand = this.batchCommand = null;
    });
  }
  validSelection() {
    return (
      !this.context.transitionPending() &&
      this.animals().length > 0 &&
      this.animals().length <= 100 &&
      new Set(this.animals().map((a) => a.id)).size === this.animals().length
    );
  }
  validGroup() {
    return (
      this.permissions.canManageHerdGroups() &&
      !this.context.transitionPending() &&
      this.snapshot().length > 0 &&
      this.snapshot().length <= 100 &&
      (this.reviewing() ||
        (this.mode === 'new'
          ? !!this.name.trim() && this.name.trim().length <= 120 && !this.name.includes('\0')
          : !!this.groupId))
    );
  }
  openGroup() {
    if (!this.permissions.canManageHerdGroups() || !this.validSelection() || this.busy()) return;
    this.scope.reset();
    this.snapshot.set([...this.animals()]);
    this.mode = 'new';
    this.name = this.groupId = '';
    this.createCommand = this.batchCommand = null;
    this.reviewing.set(false);
    this.error.set('');
    this.groupOpen.set(true);
    this.loadGroups(0);
  }
  loadGroups(page: number) {
    if (!this.groupOpen() || this.busy() || this.context.transitionPending()) return;
    this.busy.set(true);
    this.error.set('');
    this.scope.run(
      this.api.groups(page),
      (result) => {
        this.busy.set(false);
        this.groupPage.set(result.page);
        this.groupPages.set(Math.max(1, Math.ceil(result.totalElements / result.size)));
        this.groups.set(
          result.items.filter((group) => group.kind === 'MANUAL' && group.status === 'ACTIVE'),
        );
      },
      (failure) =>
        this.fail(failure, 'Não foi possível consultar os grupos. Feche e tente novamente.'),
    );
  }
  reviewGroup() {
    if (!this.validGroup() || this.busy() || this.reviewing()) return;
    const ids = this.snapshot().map((a) => a.id);
    this.busy.set(true);
    this.error.set('');
    this.scope.run(
      forkJoin(ids.map((id) => this.herd.animal(id))),
      (animals) => {
        this.snapshot.set(animals);
        if (this.mode === 'new') {
          this.createCommand = {
            operationId: newUuid(),
            id: newUuid(),
            name: this.name.trim(),
            animalIds: [...ids],
          };
          this.reviewedName.set(this.name.trim());
          this.busy.set(false);
          this.reviewing.set(true);
        } else {
          this.scope.run(
            this.api.group(this.groupId),
            (group) => {
              this.busy.set(false);
              if (group.kind !== 'MANUAL' || group.status !== 'ACTIVE') {
                this.error.set('Escolha um grupo manual ativo.');
                return;
              }
              this.batchCommand = {
                id: group.id,
                body: {
                  operationId: newUuid(),
                  expectedVersion: group.version,
                  animalIds: [...ids],
                },
              };
              this.reviewedName.set(group.name);
              this.reviewing.set(true);
            },
            (failure) =>
              this.fail(
                failure,
                'Não foi possível consultar o grupo atual. Tente revisar novamente.',
              ),
          );
        }
      },
      (failure) =>
        this.fail(
          failure,
          'Não foi possível consultar os animais atuais. Tente revisar novamente.',
        ),
    );
  }
  submitGroup() {
    if (!this.validGroup() || !this.reviewing() || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    const done = (result: import('./parity.models').GroupMembershipBatchResult) => {
      this.busy.set(false);
      this.groupOpen.set(false);
      this.reviewing.set(false);
      this.createCommand = this.batchCommand = null;
      this.toast.show(
        'success',
        result.replayed ? 'Associação já registrada' : 'Seleção associada ao grupo',
        `${result.addedCount} animais adicionados e ${result.alreadyMemberCount} já associados.`,
      );
      this.changed.emit();
    };
    if (this.createCommand)
      this.scope.run(this.api.createGroupWithAnimals(this.createCommand), done, (failure) =>
        this.fail(failure, 'Não foi possível criar o grupo. Tente novamente com a mesma revisão.'),
      );
    else if (this.batchCommand)
      this.scope.run(
        this.api.membershipBatch(this.batchCommand.id, this.batchCommand.body),
        done,
        (failure) =>
          this.fail(
            failure,
            'Não foi possível associar a seleção. Tente novamente com a mesma revisão.',
          ),
      );
    else this.busy.set(false);
  }
  editAgain() {
    if (this.busy()) return;
    this.reviewing.set(false);
    this.createCommand = this.batchCommand = null;
    this.error.set('');
  }
  closeGroup() {
    if (this.busy()) return;
    this.scope.reset();
    this.groupOpen.set(false);
    this.snapshot.set([]);
    this.reviewing.set(false);
    this.createCommand = this.batchCommand = null;
  }
  private fail(failure: unknown, fallback: string) {
    this.busy.set(false);
    this.error.set(failure instanceof AppError ? failure.message : fallback);
  }
}
