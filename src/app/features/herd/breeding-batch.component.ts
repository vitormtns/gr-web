import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AppError } from '../../core/api/api.models';
import { ContextStore } from '../../core/context/context.store';
import { PermissionService } from '../../core/permissions/permission.service';
import { localDateOnly } from '../../core/date/date-only';
import { DialogComponent } from '../../design-system/surfaces/surfaces';
import { AnimalPickerComponent } from './animal-picker.component';
import { Animal, newUuid } from './herd.models';
import { ParityApi } from './parity-api.service';
import { BreedingBatchCommand, BreedingBatchResult } from './parity.models';
import { ReproductionServiceType, serviceLabels } from './herd-operations.models';
import { errorReference, formatDate } from './herd.shared';
import { validImportDate } from './herd-import';

@Component({
  selector: 'app-breeding-batch',
  imports: [FormsModule, DialogComponent, AnimalPickerComponent],
  template: `
    @if (permissions.canMutateHerd()) {
      <section class="section-frame parity-section">
        <h2>Serviço reprodutivo em lote</h2>
        <p>Registre inseminação ou monta natural para até 100 fêmeas em uma operação atômica.</p>
        <button class="secondary-action" type="button" (click)="start()">Preparar lote</button>
        @if (result(); as receipt) {
          <p role="status">
            {{ receipt.replayed ? 'Lote já registrado' : 'Lote registrado' }} ·
            {{ receipt.items.length }} {{ receipt.items.length === 1 ? 'gestação' : 'gestações' }}.
          </p>
          <div class="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Matriz</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                @for (item of receipt.items; track item.motherId) {
                  <tr>
                    <td>{{ motherLabel(item.motherId) }}</td>
                    <td>Gestação registrada</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>
    }
    <gr-dialog [open]="opened()" (closed)="close()"
      ><span dialog-title>Preparar serviço em lote</span>
      <fieldset class="form-grid compact" [disabled]="saving()">
        @if (!confirming()) {
          <app-animal-picker
            class="wide"
            label="Buscar fêmeas ativas"
            sex="FEMALE"
            [excluded]="selectedIds()"
            [disabled]="saving() || selected().length >= 100"
            (chosen)="add($event)"
          />
          <div class="wide">
            <strong>{{ selected().length }} de 100 fêmeas selecionadas</strong>
            <ul>
              @for (a of selected(); track a.id) {
                <li>
                  {{ a.identification }}
                  <button
                    type="button"
                    [attr.aria-label]="'Remover ' + a.identification"
                    (click)="remove(a.id)"
                  >
                    Remover
                  </button>
                </li>
              }
            </ul>
          </div>
          <label
            >Serviço<select [(ngModel)]="serviceType">
              <option value="INSEMINATION">Inseminação</option>
              <option value="NATURAL_SERVICE">Monta natural</option>
            </select></label
          ><label>Data realizada<input type="date" [(ngModel)]="serviceOn" [max]="today" /></label
          ><label
            >Referência do reprodutor<input
              [(ngModel)]="sireReference"
              maxlength="160"
              placeholder="Opcional" /></label
          ><label
            >Parto esperado<input
              type="date"
              [(ngModel)]="expectedCalvingOn"
              [min]="serviceOn" /></label
          ><label class="wide"
            >Observações<textarea
              [(ngModel)]="notes"
              maxlength="1000"
              placeholder="Opcional"
            ></textarea>
          </label>
        } @else {
          <div class="wide">
            <p>
              {{ serviceLabels[serviceType] }} em {{ date(serviceOn) }} para {{ selected().length }}
              {{ selected().length === 1 ? 'fêmea' : 'fêmeas' }}.
            </p>
            <ul>
              @for (a of selected(); track a.id) {
                <li>{{ a.identification }}{{ a.name ? ' · ' + a.name : '' }}</li>
              }
            </ul>
            <p class="semantic-note">
              Qualquer mãe inválida, conflito de versão ou gestação incompatível reverte o lote
              inteiro. A previsão será calculada pelo serviço se não for informada.
            </p>
          </div>
        }
        @if (error()) {
          <p class="form-error wide" role="alert">{{ error() }}</p>
        }
      </fieldset>
      <div dialog-actions>
        <button
          class="quiet-button"
          type="button"
          [disabled]="saving()"
          (click)="confirming() ? confirming.set(false) : close()"
        >
          Voltar
        </button>
        @if (confirming()) {
          <button class="primary-action" type="button" [disabled]="saving()" (click)="submit()">
            {{ saving() ? 'Registrando…' : 'Confirmar lote' }}
          </button>
        } @else {
          <button class="primary-action" type="button" [disabled]="!valid()" (click)="review()">
            Revisar {{ selected().length }} fêmeas
          </button>
        }
      </div></gr-dialog
    >
  `,
  styleUrls: ['./herd-page.scss', './operations-page.component.scss', './parity.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreedingBatchComponent {
  readonly changed = output<void>();
  readonly permissions = inject(PermissionService);
  private readonly context = inject(ContextStore);
  private readonly api = inject(ParityApi);
  private readonly destroy = inject(DestroyRef);
  private generation = 0;
  readonly opened = signal(false);
  readonly confirming = signal(false);
  readonly saving = signal(false);
  readonly selected = signal<Animal[]>([]);
  readonly result = signal<BreedingBatchResult | null>(null);
  readonly error = signal('');
  readonly serviceLabels = serviceLabels;
  private command: BreedingBatchCommand | null = null;
  today = localDateOnly();
  serviceOn = this.today;
  serviceType: ReproductionServiceType = 'INSEMINATION';
  sireReference = '';
  expectedCalvingOn = '';
  notes = '';
  date = formatDate;
  constructor() {
    effect(() => {
      this.context.contextVersion();
      this.context.transitionPending();
      this.generation++;
      this.opened.set(false);
      this.saving.set(false);
      this.selected.set([]);
      this.result.set(null);
      this.command = null;
    });
  }
  start() {
    if (!this.permissions.canMutateHerd()) return;
    this.selected.set([]);
    this.result.set(null);
    this.error.set('');
    this.confirming.set(false);
    this.opened.set(true);
    this.command = null;
    this.serviceOn = this.today;
    this.expectedCalvingOn = '';
    this.sireReference = '';
    this.notes = '';
  }
  selectedIds() {
    return this.selected().map((a) => a.id);
  }
  add(animal: Animal) {
    if (this.selected().length < 100 && !this.selectedIds().includes(animal.id))
      this.selected.update((items) => [...items, animal]);
  }
  remove(id: string) {
    this.selected.update((items) => items.filter((a) => a.id !== id));
  }
  valid() {
    return (
      this.selected().length > 0 &&
      this.selected().length <= 100 &&
      validImportDate(this.serviceOn) &&
      this.serviceOn <= this.today &&
      (!this.expectedCalvingOn ||
        (validImportDate(this.expectedCalvingOn) && this.expectedCalvingOn > this.serviceOn))
    );
  }
  review() {
    if (!this.valid()) return;
    const target = {
      operationId: this.command?.operationId || newUuid(),
      serviceType: this.serviceType,
      serviceOn: this.serviceOn,
      sireReference: this.sireReference.trim() || null,
      expectedCalvingOn: this.expectedCalvingOn || null,
      notes: this.notes.trim() || null,
      mothers: this.selected().map((a) => ({ id: a.id, expectedVersion: a.version })),
    };
    const previous = this.command;
    if (
      previous &&
      JSON.stringify({ ...previous, operationId: '' }) !==
        JSON.stringify({ ...target, operationId: '' })
    )
      target.operationId = newUuid();
    this.command = target;
    this.confirming.set(true);
  }
  submit() {
    if (
      !this.permissions.canMutateHerd() ||
      this.saving() ||
      !this.command ||
      this.context.transitionPending()
    )
      return;
    const g = this.generation;
    this.saving.set(true);
    this.error.set('');
    this.api
      .breedBatch(this.command)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (result) => {
          if (g !== this.generation) return;
          this.result.set(result);
          this.opened.set(false);
          this.saving.set(false);
          this.changed.emit();
        },
        error: (e) => {
          if (g !== this.generation) return;
          this.saving.set(false);
          this.error.set(
            e instanceof AppError
              ? `${e.status === 409 ? 'O lote conflita com os dados atuais. Nenhuma gestação foi criada parcialmente. Atualize as mães para uma nova tentativa.' : e.message} ${errorReference(e.requestId)}`
              : 'Não foi possível registrar o lote. Tente novamente com a mesma revisão.',
          );
        },
      });
  }
  motherLabel(id: string) {
    return this.selected().find((a) => a.id === id)?.identification || 'Matriz registrada';
  }
  close() {
    if (!this.saving()) this.opened.set(false);
  }
}
