import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ContextRequestScope } from '../management/management.shared';
import { HerdApi } from './herd-api.service';
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
      @if (!embedded()) { <section class="section-frame parity-section">
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
      </section> }
    }
    <gr-dialog [open]="opened()" (closed)="close()"
      ><span dialog-title>Preparar serviço em lote</span>
      @if (opened()) {
        <fieldset class="form-grid compact" [disabled]="saving() || preparing()">
          @if (!confirming()) {
            <app-animal-picker
              class="wide"
              label="Buscar fêmeas ativas"
              sex="FEMALE"
              [excluded]="selectedIds()"
              [disabled]="saving() || preparing() || selected().length >= 100"
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
                {{ serviceLabels[serviceType] }} em {{ date(serviceOn) }} para
                {{ selected().length }} {{ selected().length === 1 ? 'fêmea' : 'fêmeas' }}.
              </p>
              <ul>
                @for (a of selected(); track a.id) {
                  <li>
                    {{ a.identification }}{{ a.name ? ' · ' + a.name : '' }} · Versão
                    {{ a.version }}
                  </li>
                }
              </ul>
              <p>Referência do reprodutor: {{ sireReference || 'Não informada' }}</p>
              <p>
                Parto esperado:
                {{ expectedCalvingOn ? date(expectedCalvingOn) : 'Calculado pelo serviço' }}
              </p>
              <p>Observações: {{ notes || 'Sem observações' }}</p>
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
      }
      <div dialog-actions>
        <button
          class="quiet-button"
          type="button"
          [disabled]="saving() || preparing()"
          (click)="confirming() ? confirming.set(false) : close()"
        >
          Voltar
        </button>
        @if (confirming()) {
          <button class="primary-action" type="button" [disabled]="saving()" (click)="submit()">
            {{ saving() ? 'Registrando…' : 'Confirmar lote' }}
          </button>
        } @else {
          <button
            class="primary-action"
            type="button"
            [disabled]="!valid() || preparing() || saving()"
            (click)="review()"
          >
            {{
              preparing()
                ? 'Consultando versões…'
                : 'Revisar ' + selected().length + (selected().length === 1 ? ' fêmea' : ' fêmeas')
            }}
          </button>
        }
      </div></gr-dialog
    >
  `,
  styleUrls: ['./herd-page.scss', './operations-page.component.scss', './parity.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreedingBatchComponent {
  readonly embedded = input(false);
  readonly changed = output<void>();
  readonly permissions = inject(PermissionService);
  private readonly context = inject(ContextStore);
  private readonly api = inject(ParityApi);
  private readonly destroy = inject(DestroyRef);
  private readonly requests = new ContextRequestScope(this.destroy);
  private readonly herd = inject(HerdApi);
  readonly preparing = signal(false);
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
      this.requests.reset();
      this.opened.set(false);
      this.saving.set(false);
      this.preparing.set(false);
      this.confirming.set(false);
      this.selected.set([]);
      this.result.set(null);
      this.command = null;
      this.error.set('');
      this.today = localDateOnly();
      this.serviceOn = this.today;
      this.serviceType = 'INSEMINATION';
      this.expectedCalvingOn = '';
      this.sireReference = '';
      this.notes = '';
    });
  }
  start() {
    if (
      !this.permissions.canMutateHerd() ||
      this.context.transitionPending() ||
      this.saving() ||
      this.preparing()
    )
      return;
    this.requests.reset();
    this.selected.set([]);
    this.result.set(null);
    this.error.set('');
    this.confirming.set(false);
    this.opened.set(true);
    this.command = null;
    this.today = localDateOnly();
    this.serviceOn = this.today;
    this.serviceType = 'INSEMINATION';
    this.expectedCalvingOn = '';
    this.sireReference = '';
    this.notes = '';
  }
  selectedIds() {
    return this.selected().map((a) => a.id);
  }
  add(animal: Animal) {
    if (
      !this.confirming() &&
      !this.preparing() &&
      !this.saving() &&
      animal.sex === 'FEMALE' &&
      animal.status === 'ACTIVE' &&
      this.selected().length < 100 &&
      !this.selectedIds().includes(animal.id)
    )
      this.selected.update((items) => [...items, animal]);
  }
  remove(id: string) {
    if (this.confirming() || this.preparing() || this.saving()) return;
    this.selected.update((items) => items.filter((a) => a.id !== id));
  }
  valid() {
    return (
      this.permissions.canMutateHerd() &&
      !this.context.transitionPending() &&
      [...this.sireReference.trim()].length <= 160 &&
      [...this.notes.trim()].length <= 1000 &&
      this.selected().every(
        (a) =>
          a.sex === 'FEMALE' &&
          a.status === 'ACTIVE' &&
          (!a.birthDate || this.serviceOn >= a.birthDate),
      ) &&
      this.selected().length > 0 &&
      this.selected().length <= 100 &&
      validImportDate(this.serviceOn) &&
      this.serviceOn <= this.today &&
      (!this.expectedCalvingOn ||
        (validImportDate(this.expectedCalvingOn) && this.expectedCalvingOn > this.serviceOn))
    );
  }
  review() {
    if (!this.valid() || this.saving() || this.preparing()) return;
    this.requests.reset();
    this.preparing.set(true);
    this.error.set('');
    const ids = this.selectedIds();
    this.requests.run(
      forkJoin(ids.map((id) => this.herd.animal(id))),
      (animals) => {
        this.preparing.set(false);
        if (
          animals.some(
            (a) =>
              a.sex !== 'FEMALE' ||
              a.status !== 'ACTIVE' ||
              (a.birthDate && this.serviceOn < a.birthDate),
          )
        ) {
          this.error.set(
            'Uma matriz mudou de estado ou não admite a data informada. Revise a seleção.',
          );
          return;
        }
        this.selected.set(animals);
        this.command = {
          operationId: newUuid(),
          serviceType: this.serviceType,
          serviceOn: this.serviceOn,
          sireReference: this.sireReference.trim() || null,
          expectedCalvingOn: this.expectedCalvingOn || null,
          notes: this.notes.trim() || null,
          mothers: animals.map((a) => ({ id: a.id, expectedVersion: a.version })),
        };
        this.confirming.set(true);
      },
      (e) => {
        this.preparing.set(false);
        this.error.set(
          e instanceof AppError
            ? e.message + ' ' + errorReference(e.requestId)
            : 'Não foi possível consultar as versões atuais. Tente novamente.',
        );
      },
    );
  }
  submit() {
    if (
      !this.permissions.canMutateHerd() ||
      this.saving() ||
      !this.command ||
      !this.confirming() ||
      this.context.transitionPending()
    )
      return;
    this.saving.set(true);
    this.error.set('');
    this.requests.run(
      this.api.breedBatch(this.command),
      (result) => {
        this.result.set(result);
        this.opened.set(false);
        this.saving.set(false);
        this.changed.emit();
      },
      (e) => {
        this.saving.set(false);
        this.error.set(
          e instanceof AppError
            ? `${e.status === 409 ? 'O lote conflita com os dados atuais. Nenhuma gestação foi criada parcialmente. Atualize as mães para uma nova tentativa.' : e.message} ${errorReference(e.requestId)}`
            : 'Não foi possível registrar o lote. Tente novamente com a mesma revisão.',
        );
      },
    );
  }
  motherLabel(id: string) {
    return this.selected().find((a) => a.id === id)?.identification || 'Matriz registrada';
  }
  close() {
    if (!this.saving() && !this.preparing()) {
      this.requests.reset();
      this.opened.set(false);
      this.confirming.set(false);
      this.command = null;
      this.selected.set([]);
      this.notes = '';
      this.sireReference = '';
      this.expectedCalvingOn = '';
      this.error.set('');
    }
  }
}
