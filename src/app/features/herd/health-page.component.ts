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
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { DomainIconComponent } from '../../design-system/primitives/domain-icon';
import { PaginationComponent } from '../../design-system/data-display/data-display';
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
  HealthTreatment,
  healthLabels,
  procedureLabels,
  OperationResult,
  PendingWorkItem,
} from './herd-operations.models';
import { formatDate } from './herd.shared';
import { HealthCommandCenterComponent } from './health-command-center.component';
import { isHealthPendingType, type HealthPendingType } from './health-operational.models';

interface HealthCommand {
  batch: boolean;
  target: string;
  body: Readonly<Record<string, unknown>>;
}
interface AppliedHealthFilters {
  type: HealthTreatmentType | '';
  procedure: HealthProcedureCode | '';
  animalId: string;
  from: string;
  to: string;
}
type FilterKey = keyof AppliedHealthFilters;
@Component({
  selector: 'app-health-page',
  imports: [
    FormsModule,
    AnimalPickerComponent,
    DomainIconComponent,
    PaginationComponent,
    ErrorStateComponent,
    SkeletonComponent,
    DialogComponent,
    HealthCommandCenterComponent,
  ],
  templateUrl: './health-page.component.html',
  styleUrls: [
    './herd-page.scss',
    './operations-page.component.scss',
    './health-page.component.scss',
    './health-page-dialog.component.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HealthPageComponent {
  readonly embedded = input(false);
  readonly changed = output<void>();
  private readonly api = inject(HerdApi);
  readonly context = inject(ContextStore);
  private readonly destroy = inject(DestroyRef);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly router = inject(Router, { optional: true });
  private readonly reportScope = new ContextRequestScope(this.destroy);
  private readonly writeScope = new ContextRequestScope(this.destroy);
  private command: HealthCommand | null = null;
  readonly permissions = inject(PermissionService);
  readonly report = signal<HealthReport | null>(null);
  readonly animals = signal<Animal[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly filterError = signal('');
  readonly filterPickerOpen = signal(false);
  readonly filterAnimalLabel = signal('');
  readonly selectedTreatment = signal<HealthTreatment | null>(null);
  readonly tab = signal<'overview' | 'pending' | 'history'>('overview');
  readonly pendingTypeFromRoute = signal<HealthPendingType | null>(null);
  readonly pendingAnimalFromRoute = signal('');
  readonly appliedFilters = signal<AppliedHealthFilters | null>(null);
  readonly metricLabels = ['Tratamentos', 'Animais atendidos', 'Vacinações', 'Vermifugações'];
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
  private initialContext = true;
  constructor() {
    this.route?.queryParamMap.pipe(takeUntilDestroyed(this.destroy)).subscribe((params) => {
      const tab = params.get('tab');
      this.tab.set(tab === 'pending' || tab === 'history' ? tab : 'overview');
      const type = params.get('pendingType');
      this.pendingTypeFromRoute.set(isHealthPendingType(type) ? type : null);
      const animalId = params.get('animalId') || '';
      this.pendingAnimalFromRoute.set(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(animalId)
          ? animalId
          : '',
      );
    });
    effect(() => {
      this.context.contextVersion();
      const pending = this.context.transitionPending();
      const farm = this.context.selectedFarm();
      untracked(() => {
        if (!this.initialContext) this.pendingAnimalFromRoute.set('');
        if (!pending && farm) this.initialContext = false;
        this.reportScope.reset();
        this.resetEditor();
        this.report.set(null);
        this.selectedTreatment.set(null);
        this.filterPickerOpen.set(false);
        this.filterAnimalLabel.set('');
        this.appliedFilters.set(null);
        this.loading.set(false);
        this.error.set('');
        this.filterError.set('');
        this.type = this.animalFilter = this.from = this.to = '';
        this.filterProcedure = '';
        this.page = 0;
        if (!pending && farm && !this.embedded()) this.reload();
      });
    });
  }
  selectTab(tab: 'overview' | 'pending' | 'history') {
    this.tab.set(tab);
    if (this.router && this.route) {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { tab, pendingType: null },
        queryParamsHandling: 'merge',
      });
    }
  }
  reload() {
    if (!this.ready() || this.embedded()) return;
    this.reportScope.reset();
    this.report.set(null);
    this.selectedTreatment.set(null);
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
      this.appliedFilters.set(null);
      return;
    }
    this.appliedFilters.set({
      type: this.type === 'VACCINATION' || this.type === 'DEWORMING' ? this.type : '',
      procedure: this.filterProcedure,
      animalId: this.animalFilter.trim(),
      from: this.from,
      to: this.to,
    });
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
    this.filterAnimalLabel.set('');
    this.applyFilters();
  }
  onFilterTypeChange() {
    if (this.type === 'DEWORMING') this.filterProcedure = '';
  }
  filterByType(type: HealthTreatmentType) {
    this.type = this.appliedFilters()?.type === type ? '' : type;
    this.onFilterTypeChange();
    this.applyFilters();
  }
  chooseFilterAnimal(animal: Animal) {
    this.animalFilter = animal.id;
    this.filterAnimalLabel.set(`${animal.identification}${animal.name ? ' · ' + animal.name : ''}`);
    this.filterPickerOpen.set(false);
    this.applyFilters();
  }
  hasAppliedFilters() {
    const filters = this.appliedFilters();
    return !!(
      filters &&
      (filters.type || filters.procedure || filters.animalId || filters.from || filters.to)
    );
  }
  appliedType() {
    return this.appliedFilters()?.type || '';
  }
  appliedFilterChips(): { key: FilterKey; label: string }[] {
    const filters = this.appliedFilters();
    if (!filters) return [];
    const chips: { key: FilterKey; label: string }[] = [];
    if (filters.type) chips.push({ key: 'type', label: this.healthLabel(filters.type) });
    if (filters.procedure)
      chips.push({ key: 'procedure', label: procedureLabels[filters.procedure] });
    if (filters.animalId)
      chips.push({
        key: 'animalId',
        label: this.filterAnimalLabel() || `Animal: ${filters.animalId}`,
      });
    if (filters.from) chips.push({ key: 'from', label: `De ${this.date(filters.from)}` });
    if (filters.to) chips.push({ key: 'to', label: `Até ${this.date(filters.to)}` });
    return chips;
  }
  removeFilter(key: FilterKey) {
    if (key === 'type') this.type = '';
    else if (key === 'procedure') this.filterProcedure = '';
    else if (key === 'animalId') {
      this.animalFilter = '';
      this.filterAnimalLabel.set('');
    } else if (key === 'from') this.from = '';
    else this.to = '';
    this.applyFilters();
  }
  typeShare(type: HealthTreatmentType) {
    const summary = this.report()?.summary;
    return summary?.treatmentsCount
      ? ((summary.countsByTreatmentType[type] || 0) / summary.treatmentsCount) * 100
      : 0;
  }
  number(value: number) {
    return new Intl.NumberFormat('pt-BR').format(value);
  }
  treatmentTypeOf(item: HealthTreatment) {
    return item.treatmentType || item.type || null;
  }
  treatmentLabel(item: HealthTreatment) {
    const type = this.treatmentTypeOf(item);
    return type ? healthLabels[type] : 'Tratamento registrado';
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
  openSelected(snapshot: readonly Animal[]) {
    if (!this.permissions.canMutateHerd() || !this.ready() || this.saving() || this.preparing())
      return;
    this.openCreate();
    this.batch = true;
    const ids = snapshot.map((animal) => animal.id);
    if (!ids.length || ids.length > 100 || new Set(ids).size !== ids.length) {
      this.formError.set('Selecione de 1 a 100 animais diferentes para preparar o tratamento.');
      return;
    }
    this.preparing.set(true);
    this.writeScope.run(
      forkJoin(ids.map((id) => this.api.animal(id))),
      (animals) => {
        this.preparing.set(false);
        if (animals.some((animal) => animal.status !== 'ACTIVE')) {
          this.formError.set(
            'Um dos animais não está ativo. Revise a seleção no rebanho; nenhum animal foi incluído automaticamente.',
          );
          return;
        }
        this.animals.set(animals);
        this.animalIds = [...ids];
      },
      (failure) => {
        this.preparing.set(false);
        this.formError.set(
          managementError(
            failure,
            'Não foi possível consultar a seleção atual. Feche e tente novamente.',
          ),
        );
      },
    );
  }
  openPendingCare(item: PendingWorkItem) {
    if (!this.permissions.canMutateHerd() || !this.ready() || this.saving()) return;
    this.openCreate();
    this.treatmentType = item.type === 'DEWORMING_DUE' ? 'DEWORMING' : 'VACCINATION';
    this.procedureCode = item.type.startsWith('BRUCELLOSIS_') ? 'BRUCELLOSIS' : null;
    this.preparing.set(true);
    this.writeScope.run(
      this.api.animal(item.animalId),
      (animal) => {
        this.preparing.set(false);
        if (animal.status !== 'ACTIVE') {
          this.formError.set('O animal não está ativo para este registro.');
          return;
        }
        this.chooseAnimal(animal);
      },
      () => {
        this.preparing.set(false);
        this.formError.set('Não foi possível carregar o animal. Feche e tente novamente.');
      },
    );
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
        this.changed.emit();
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
}
