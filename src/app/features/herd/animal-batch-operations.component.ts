import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ContextStore } from '../../core/context/context.store';
import { localDateOnly } from '../../core/date/date-only';
import { PermissionService } from '../../core/permissions/permission.service';
import { ToastService } from '../../design-system/feedback/feedback';
import { DialogComponent } from '../../design-system/surfaces/surfaces';
import { ContextRequestScope, managementError } from '../management/management.shared';
import { HerdApi } from './herd-api.service';
import { Animal, PaddockRef, newUuid } from './herd.models';
import { formatDate } from './herd.shared';

type BatchAction = 'move' | 'weight' | 'transfer';
interface WeightDraft {
  animal: Animal;
  weight: string;
  date: string;
  notes: string;
}

@Component({
  selector: 'app-animal-batch-operations',
  imports: [FormsModule, DialogComponent],
  template: `@if (animals().length && permissions.canMutateHerd()) {
      <div class="batch-actions">
        <button class="secondary-action" type="button" (click)="open('move')">Mover seleção</button
        ><button class="secondary-action" type="button" (click)="open('weight')">
          Registrar pesagens
        </button>
        @if (permissions.canTransferHerd()) {
          <button class="secondary-action" type="button" (click)="open('transfer')">
            Transferir seleção
          </button>
        }
      </div>
    }
    <gr-dialog [open]="action() !== null" (closed)="close()"
      ><span dialog-title>{{ title() }}</span>
      <div class="batch-form">
        <p>
          {{ animals().length }}
          {{ animals().length === 1 ? 'animal selecionado' : 'animais selecionados' }} ·
          {{ context.selectedFarm()?.farmName }}
        </p>
        @if (review()) {
          <p class="review-notice">
            {{
              action() === 'transfer'
                ? 'A fazenda de destino assumirá a custódia de todos os animais. A operação é realizada integralmente.'
                : 'Confira os dados de todos os animais antes de confirmar.'
            }}
          </p>
          @if (action() === 'weight') {
            @for (row of weights; track row.animal.id) {
              <article class="batch-row">
                <strong>{{ row.animal.identification }}</strong
                ><span>{{ row.weight }} kg · {{ formatDate(row.date) }}</span>
                <p>{{ row.notes || 'Sem observações' }}</p>
              </article>
            }
          } @else {
            <dl>
              <dt>Destino</dt>
              <dd>{{ destinationName() }}</dd>
              <dt>Data</dt>
              <dd>{{ formatDate(date) }}</dd>
              <dt>Observações</dt>
              <dd>{{ notes || 'Sem observações' }}</dd>
            </dl>
            <p>{{ identifications() }}</p>
          }
        } @else {
          @if (action() === 'weight') {
            <p>
              Informe o peso em quilogramas, a data e as observações de cada animal. Máximo de três
              casas decimais.
            </p>
            @for (row of weights; track row.animal.id) {
              <fieldset class="batch-row" [disabled]="pending()">
                <legend>{{ row.animal.identification }}</legend>
                <label
                  >Peso (kg) *<input
                    inputmode="decimal"
                    [(ngModel)]="row.weight"
                    placeholder="Ex.: 418,750"
                    required /></label
                ><label
                  >Data da pesagem *<input
                    type="date"
                    [(ngModel)]="row.date"
                    [max]="today"
                    [min]="row.animal.birthDate || ''"
                    required /></label
                ><label
                  >Observações<textarea [(ngModel)]="row.notes" maxlength="1000"></textarea>
                </label>
              </fieldset>
            }
          } @else {
            @if (action() === 'transfer') {
              <label
                >Fazenda de destino *<select
                  [(ngModel)]="destinationFarm"
                  (ngModelChange)="loadPaddocks()"
                >
                  <option value="">Selecione uma fazenda</option>
                  @for (farm of destinationFarms(); track farm.farmId) {
                    <option [value]="farm.farmId">{{ farm.farmName }}</option>
                  }
                </select></label
              >
              @if (!destinationFarms().length) {
                <p>Não há outra fazenda acessível nesta organização.</p>
              }
            }
            <label
              >{{ action() === 'move' ? 'Piquete de destino *' : 'Piquete na fazenda de destino'
              }}<select
                [(ngModel)]="paddock"
                [disabled]="
                  loadingPaddocks() ||
                  !!catalogError() ||
                  (action() === 'transfer' && !destinationFarm)
                "
              >
                <option value="">
                  {{ action() === 'move' ? 'Selecione um piquete' : 'Sem piquete definido' }}
                </option>
                @for (item of paddocks(); track item.id) {
                  <option [value]="item.id">{{ item.name }}</option>
                }
              </select></label
            >
            @if (loadingPaddocks()) {
              <p role="status">Carregando piquetes disponíveis…</p>
            }
            @if (catalogError()) {
              <p class="form-error" role="alert">{{ catalogError() }}</p>
              <button class="quiet-button" type="button" (click)="loadPaddocks()">
                Tentar novamente
              </button>
            }
            <label
              >Data da operação *<input
                type="date"
                [(ngModel)]="date"
                [max]="today"
                required /></label
            ><label>Observações<textarea [(ngModel)]="notes" maxlength="1000"></textarea></label>
          }
        }
        @if (error()) {
          <p class="form-error" role="alert">{{ error() }}</p>
        }
      </div>
      <div dialog-actions>
        <button class="quiet-button" type="button" [disabled]="pending()" (click)="close()">
          Fechar
        </button>
        @if (review()) {
          <button class="primary-action" type="button" [disabled]="pending()" (click)="submit()">
            {{ pending() ? 'Registrando…' : 'Confirmar operação' }}
          </button>
        } @else {
          <button
            class="primary-action"
            type="button"
            [disabled]="pending() || loadingPaddocks()"
            (click)="prepare()"
          >
            Revisar operação
          </button>
        }
      </div>
    </gr-dialog>`,
  styleUrl: './animal-batch-operations.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnimalBatchOperationsComponent {
  private readonly api = inject(HerdApi);
  private readonly scope = new ContextRequestScope(inject(DestroyRef));
  private readonly catalogs = new ContextRequestScope(inject(DestroyRef));
  private readonly toast = inject(ToastService);
  readonly context = inject(ContextStore);
  readonly permissions = inject(PermissionService);
  readonly animals = input.required<Animal[]>();
  readonly completed = output<void>();
  readonly action = signal<BatchAction | null>(null);
  readonly pending = signal(false);
  readonly review = signal(false);
  readonly error = signal('');
  readonly catalogError = signal('');
  readonly loadingPaddocks = signal(false);
  readonly paddocks = signal<PaddockRef[]>([]);
  readonly today = localDateOnly();
  weights: WeightDraft[] = [];
  date = this.today;
  notes = '';
  paddock = '';
  destinationFarm = '';
  private command: object | null = null;
  formatDate = formatDate;
  constructor() {
    effect(() => {
      this.context.contextVersion();
      this.context.transitionPending();
      this.animals();
      untracked(() => this.reset());
    });
  }
  title() {
    return this.action() === 'weight'
      ? 'Pesagens em lote'
      : this.action() === 'transfer'
        ? 'Transferência entre fazendas'
        : 'Movimentação em lote';
  }
  identifications() {
    return this.animals()
      .map((animal) => animal.identification)
      .join(', ');
  }
  destinationFarms() {
    return this.context
      .farms()
      .filter((farm) => farm.farmId !== this.context.selectedFarm()?.farmId);
  }
  destinationName() {
    const farm = this.destinationFarms().find(
      (item) => item.farmId === this.destinationFarm,
    )?.farmName;
    const paddock = this.paddocks().find((item) => item.id === this.paddock)?.name;
    return this.action() === 'move'
      ? paddock
      : `${farm}${paddock ? ' · ' + paddock : ' · Sem piquete definido'}`;
  }
  private allowed() {
    return (
      !this.context.transitionPending() &&
      !!this.context.selectedFarm() &&
      this.permissions.canMutateHerd() &&
      (this.action() !== 'transfer' || this.permissions.canTransferHerd())
    );
  }
  open(action: BatchAction) {
    if (
      this.pending() ||
      !this.permissions.canMutateHerd() ||
      this.context.transitionPending() ||
      (action === 'transfer' && !this.permissions.canTransferHerd())
    )
      return;
    this.reset();
    this.action.set(action);
    if (
      !this.animals().length ||
      this.animals().length > 100 ||
      this.animals().some((animal) => animal.status !== 'ACTIVE')
    ) {
      this.error.set('Selecione de 1 a 100 animais ativos.');
      return;
    }
    this.weights = this.animals().map((animal) => ({
      animal,
      weight: '',
      date: this.today,
      notes: '',
    }));
    if (action === 'move') this.loadPaddocks();
  }
  close() {
    if (!this.pending()) this.reset();
  }
  private reset() {
    this.scope.reset();
    this.catalogs.reset();
    this.action.set(null);
    this.pending.set(false);
    this.review.set(false);
    this.error.set('');
    this.catalogError.set('');
    this.loadingPaddocks.set(false);
    this.paddocks.set([]);
    this.command = null;
    this.weights = [];
    this.date = this.today;
    this.notes = '';
    this.paddock = '';
    this.destinationFarm = '';
  }
  loadPaddocks() {
    if (this.pending() || this.review() || !this.allowed()) return;
    this.catalogs.reset();
    this.paddock = '';
    this.paddocks.set([]);
    this.catalogError.set('');
    this.loadingPaddocks.set(false);
    const organization = this.context.selectedOrganization();
    if (
      this.action() === 'transfer' &&
      (!organization ||
        !this.destinationFarms().some((farm) => farm.farmId === this.destinationFarm))
    )
      return;
    this.loadingPaddocks.set(true);
    const destination =
      this.action() === 'transfer'
        ? { organizationId: organization!.organizationId, farmId: this.destinationFarm }
        : undefined;
    this.catalogs.run(
      this.api.allPaddocks(destination),
      (items) => {
        this.paddocks.set(items);
        this.loadingPaddocks.set(false);
      },
      () => {
        this.loadingPaddocks.set(false);
        this.catalogError.set(
          'Não foi possível carregar os piquetes. Tente novamente antes de revisar.',
        );
      },
    );
  }
  prepare() {
    if (this.pending() || this.review() || !this.action() || !this.allowed()) return;
    this.error.set('');
    const animals = this.animals();
    if (
      !animals.length ||
      animals.length > 100 ||
      animals.some((animal) => animal.status !== 'ACTIVE')
    ) {
      this.error.set('Selecione de 1 a 100 animais ativos.');
      return;
    }
    if (this.action() === 'weight') {
      if (
        this.weights.some(
          (row) =>
            !validBatchWeight(row.weight) ||
            !this.validDate(row.date, row.animal) ||
            row.notes.length > 1000,
        )
      ) {
        this.error.set(
          'Informe pesos entre 0,001 e 99.999,999 kg, datas válidas e observações de até 1.000 caracteres.',
        );
        return;
      }
      this.command = {
        operationId: newUuid(),
        animals: this.weights.map((row) => ({
          id: row.animal.id,
          expectedVersion: row.animal.version,
          weightKg: row.weight.trim().replace(',', '.'),
          measuredOn: row.date,
          notes: row.notes.trim() || null,
        })),
      };
    } else {
      if (
        this.loadingPaddocks() ||
        this.catalogError() ||
        !animals.every((animal) => this.validDate(this.date, animal)) ||
        this.notes.length > 1000 ||
        (this.action() === 'move' && !this.paddock) ||
        (this.paddock && !this.paddocks().some((item) => item.id === this.paddock)) ||
        (this.action() === 'transfer' &&
          !this.destinationFarms().some((item) => item.farmId === this.destinationFarm))
      ) {
        this.error.set('Revise o destino, a data e as observações antes de continuar.');
        return;
      }
      this.command = {
        operationId: newUuid(),
        animals: animals.map((animal) => ({
          animalId: animal.id,
          expectedVersion: animal.version,
        })),
        occurredOn: this.date,
        notes: this.notes.trim() || null,
        ...(this.action() === 'transfer'
          ? { destinationFarmId: this.destinationFarm, destinationPaddockId: this.paddock || null }
          : { destinationPaddockId: this.paddock }),
      };
    }
    this.review.set(true);
  }
  private validDate(value: string, animal: Animal) {
    return (
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !Number.isNaN(Date.parse(value)) &&
      new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value &&
      value <= this.today &&
      (!animal.birthDate || value >= animal.birthDate)
    );
  }
  submit() {
    if (this.pending() || !this.review() || !this.command || !this.allowed()) return;
    this.pending.set(true);
    this.error.set('');
    const request =
      this.action() === 'weight'
        ? this.api.recordWeightBatch(this.command)
        : this.action() === 'transfer'
          ? this.api.transferBatch(this.command)
          : this.api.moveBatch(this.command);
    this.scope.run<unknown>(
      request,
      () => {
        const count = this.animals().length;
        this.reset();
        this.toast.show(
          'success',
          'Operação concluída',
          `${count} ${count === 1 ? 'animal atualizado' : 'animais atualizados'}.`,
        );
        this.completed.emit();
      },
      (failure) => {
        this.pending.set(false);
        this.error.set(
          managementError(
            failure,
            'Não foi possível confirmar a operação. Tentar novamente reutiliza o mesmo comando, evitando registros duplicados.',
          ),
        );
      },
    );
  }
}
export function validBatchWeight(value: string): boolean {
  const normalized = value.trim().replace(',', '.');
  return /^\d{1,5}(\.\d{1,3})?$/.test(normalized) && Number(normalized) > 0;
}
