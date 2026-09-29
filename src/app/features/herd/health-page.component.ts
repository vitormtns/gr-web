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
import { Observable, forkJoin } from 'rxjs';
import { ContextStore } from '../../core/context/context.store';
import { localDateOnly } from '../../core/date/date-only';
import { PermissionService } from '../../core/permissions/permission.service';
import {
  ErrorStateComponent,
  SkeletonComponent,
  ToastService,
} from '../../design-system/feedback/feedback';
import { DialogComponent } from '../../design-system/surfaces/surfaces';
import {
  ContextRequestScope,
  managementError,
  managementTimestamp,
} from '../management/management.shared';
import { AnimalPickerComponent } from './animal-picker.component';
import { HerdApi } from './herd-api.service';
import { validImportDate } from './herd-import';
import { Animal, newUuid } from './herd.models';
import {
  HealthReport,
  HealthProcedureCode,
  HealthTreatmentType,
  healthLabels,
  procedureLabels,
  OperationResult,
} from './herd-operations.models';
import { AnimalIdentityComponent, formatDate } from './herd.shared';

interface HealthCommand {
  batch: boolean;
  target: string;
  body: Readonly<Record<string, unknown>>;
}
@Component({
  selector: 'app-health-page',
  imports: [
    FormsModule,
    AnimalIdentityComponent,
    AnimalPickerComponent,
    ErrorStateComponent,
    SkeletonComponent,
    DialogComponent,
  ],
  templateUrl: './health-page.component.html',
  styleUrls: [
    './herd-page.scss',
    './operations-page.component.scss',
    './health-page.component.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HealthPageComponent {
  private readonly api = inject(HerdApi);
  private readonly context = inject(ContextStore);
  private readonly destroy = inject(DestroyRef);
  private readonly toast = inject(ToastService);
  private readonly reportScope = new ContextRequestScope(this.destroy);
  private readonly writeScope = new ContextRequestScope(this.destroy);
  private command: HealthCommand | null = null;
  readonly permissions = inject(PermissionService);
  readonly report = signal<HealthReport | null>(null);
  readonly animals = signal<Animal[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly filterError = signal('');
  readonly creating = signal(false);
  readonly saving = signal(false);
  readonly preparing = signal(false);
  readonly reviewing = signal(false);
  readonly formError = signal('');
  readonly today = localDateOnly();
  readonly procedureLabels = procedureLabels;
  type = '';
  filterProcedure: HealthProcedureCode | '' = '';
  animalFilter = '';
  from = '';
  to = '';
  page = 0;
  batch = false;
  animalId = '';
  animalIds: string[] = [];
  treatmentType: HealthTreatmentType = 'VACCINATION';
  procedureCode: HealthProcedureCode | null = null;
  occurredOn = this.today;
  nextDueOn = '';
  product = '';
  protocol = '';
  notes = '';
  constructor() {
    effect(() => {
      this.context.contextVersion();
      const pending = this.context.transitionPending();
      const farm = this.context.selectedFarm();
      untracked(() => {
        this.reportScope.reset();
        this.resetEditor();
        this.report.set(null);
        this.loading.set(false);
        this.error.set('');
        this.filterError.set('');
        this.type = this.animalFilter = this.from = this.to = '';
        this.filterProcedure = '';
        this.page = 0;
        if (!pending && farm) this.reload();
      });
    });
  }
  reload() {
    if (!this.ready()) return;
    this.reportScope.reset();
    this.report.set(null);
    this.error.set('');
    this.filterError.set('');
    this.loading.set(false);
    if (
      (this.animalFilter &&
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          this.animalFilter.trim(),
        )) ||
      (this.from && !validImportDate(this.from)) ||
      (this.to && !validImportDate(this.to)) ||
      (this.from && this.to && this.from > this.to)
    ) {
      this.filterError.set('Informe um identificador válido e datas válidas em ordem.');
      return;
    }
    this.loading.set(true);
    this.reportScope.run(
      this.api.healthReport({
        treatmentType: this.type || undefined,
        procedureCode: this.filterProcedure || undefined,
        animalId: this.animalFilter.trim() || undefined,
        from: this.from || undefined,
        to: this.to || undefined,
        page: this.page,
      }),
      (result) => {
        this.report.set(result);
        this.loading.set(false);
      },
      (failure) => {
        this.error.set(managementError(failure, 'Não foi possível carregar o histórico de saúde.'));
        this.loading.set(false);
      },
    );
  }
  applyFilters() {
    this.page = 0;
    this.reload();
  }
  clearFilters() {
    this.type = this.animalFilter = this.from = this.to = '';
    this.filterProcedure = '';
    this.applyFilters();
  }
  changePage(page: number) {
    this.page = page;
    this.reload();
  }
  openCreate() {
    if (this.permissions.canMutateHerd() && this.ready() && !this.saving()) {
      this.resetEditor();
      this.creating.set(true);
    }
  }
  closeCreate() {
    if (!this.saving() && !this.preparing()) this.resetEditor();
  }
  toggleBatch() {
    if (!this.saving() && !this.preparing() && !this.reviewing()) {
      this.animals.set([]);
      this.animalIds = [];
      this.animalId = '';
      this.formError.set('');
    }
  }
  chooseAnimal(animal: Animal) {
    if (
      !this.creating() ||
      this.saving() ||
      this.preparing() ||
      this.reviewing() ||
      animal.status !== 'ACTIVE'
    )
      return;
    if (this.batch) {
      if (this.animals().some((a) => a.id === animal.id)) return;
      if (this.animals().length >= 100) {
        this.formError.set('Cada lote pode ter até 100 animais.');
        return;
      }
      this.animals.update((items) => [...items, animal]);
      this.animalIds = this.animals().map((a) => a.id);
    } else {
      this.animals.set([animal]);
      this.animalId = animal.id;
    }
    this.formError.set('');
  }
  removeAnimal(id: string) {
    if (this.saving() || this.preparing() || this.reviewing()) return;
    this.animals.update((items) => items.filter((a) => a.id !== id));
    this.animalIds = this.animals().map((a) => a.id);
    this.animalId = this.animals()[0]?.id || '';
  }
  onTreatmentTypeChange() {
    if (this.treatmentType !== 'VACCINATION') this.procedureCode = null;
  }
  prepare() {
    if (
      !this.creating() ||
      !this.permissions.canMutateHerd() ||
      !this.ready() ||
      this.saving() ||
      this.preparing() ||
      this.reviewing()
    )
      return;
    const selected = this.animals().filter((a) =>
      (this.batch ? this.animalIds : [this.animalId]).includes(a.id),
    );
    if (
      !selected.length ||
      selected.length > 100 ||
      new Set(selected.map((a) => a.id)).size !== selected.length ||
      !this.validDraft(selected)
    ) {
      if (!this.formError())
        this.formError.set('Selecione de 1 a 100 animais ativos e revise os campos.');
      return;
    }
    this.writeScope.reset();
    this.formError.set('');
    this.preparing.set(true);
    this.writeScope.run(
      forkJoin(selected.map((a) => this.api.animal(a.id))),
      (current) => {
        this.preparing.set(false);
        if (current.some((a) => a.status !== 'ACTIVE') || !this.validDraft(current)) {
          if (!this.formError())
            this.formError.set('Um dos animais não está ativo. Refaça a seleção.');
          return;
        }
        this.animals.set(current);
        const common = {
          operationId: newUuid(),
          treatmentType: this.treatmentType,
          procedureCode: this.treatmentType === 'VACCINATION' ? this.procedureCode : null,
          occurredOn: this.occurredOn,
          product: this.product.trim() || null,
          protocol: this.protocol.trim() || null,
          nextDueOn: this.nextDueOn || null,
          notes: this.notes.trim() || null,
        };
        const body = this.batch
          ? {
              ...common,
              animals: Object.freeze(
                current.map((a) => Object.freeze({ id: a.id, expectedVersion: a.version })),
              ),
            }
          : { ...common, expectedVersion: current[0].version };
        this.command = Object.freeze({
          batch: this.batch,
          target: current[0].id,
          body: Object.freeze(body),
        });
        this.reviewing.set(true);
      },
      (failure) => {
        this.preparing.set(false);
        this.formError.set(
          managementError(
            failure,
            'Não foi possível consultar as versões atuais. Tente revisar novamente.',
          ),
        );
      },
    );
  }
  editAgain() {
    if (!this.saving()) {
      this.command = null;
      this.reviewing.set(false);
      this.formError.set('');
    }
  }
  save() {
    const command = this.command;
    if (
      !command ||
      !this.reviewing() ||
      !this.creating() ||
      !this.permissions.canMutateHerd() ||
      !this.ready() ||
      this.saving()
    )
      return;
    this.saving.set(true);
    this.formError.set('');
    const request: Observable<OperationResult> = command.batch
      ? this.api.recordHealthBatch(command.body)
      : this.api.recordHealth(command.target, command.body);
    this.writeScope.run(
      request,
      (result) => {
        this.resetEditor();
        this.toast.show(
          'success',
          result.replayed
            ? 'Tratamento já registrado'
            : command.batch
              ? 'Tratamentos registrados'
              : 'Tratamento registrado',
        );
        this.reload();
      },
      (failure) => {
        this.saving.set(false);
        this.formError.set(
          managementError(
            failure,
            'Não foi possível registrar o tratamento. Tente novamente com o mesmo comando.',
          ),
        );
      },
    );
  }
  private validDraft(selected: Animal[]) {
    if (
      !validImportDate(this.occurredOn) ||
      this.occurredOn > this.today ||
      selected.some((a) => a.birthDate && this.occurredOn < a.birthDate) ||
      (this.nextDueOn && (!validImportDate(this.nextDueOn) || this.nextDueOn < this.occurredOn)) ||
      !['VACCINATION', 'DEWORMING'].includes(this.treatmentType) ||
      (this.treatmentType === 'VACCINATION' &&
        this.procedureCode !== null &&
        !['BRUCELLOSIS', 'FOOT_AND_MOUTH_DISEASE'].includes(this.procedureCode)) ||
      this.product.trim().length > 160 ||
      this.protocol.trim().length > 160 ||
      this.notes.trim().length > 1000
    ) {
      this.formError.set(
        'Revise o tratamento, os limites de texto e as datas: o cuidado não pode ser anterior ao nascimento ou posterior a hoje, e a próxima aplicação não pode ser anterior ao cuidado.',
      );
      return false;
    }
    return true;
  }
  private ready() {
    return !this.context.transitionPending() && !!this.context.selectedFarm();
  }
  private resetEditor() {
    this.writeScope.reset();
    this.creating.set(false);
    this.saving.set(false);
    this.preparing.set(false);
    this.reviewing.set(false);
    this.formError.set('');
    this.command = null;
    this.animals.set([]);
    this.animalId = '';
    this.animalIds = [];
    this.batch = false;
    this.treatmentType = 'VACCINATION';
    this.procedureCode = null;
    this.occurredOn = this.today;
    this.nextDueOn = this.product = this.protocol = this.notes = '';
  }
  selectedIds() {
    return this.animals().map((a) => a.id);
  }
  healthLabel = (value: HealthTreatmentType) => healthLabels[value];
  date = formatDate;
  timestamp = managementTimestamp;
  animalRef = (animal: { id: string; identification: string; name: string | null }) =>
    ({
      ...animal,
      sex: 'FEMALE',
      birthDate: null,
      status: 'ACTIVE',
      version: 0,
      paddock: null,
    }) as Animal;
}
