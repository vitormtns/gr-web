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
import { forkJoin, Observable, of } from 'rxjs';
import { ContextStore } from '../../core/context/context.store';
import { localDateOnly } from '../../core/date/date-only';
import { PermissionService } from '../../core/permissions/permission.service';
import {
  ErrorStateComponent,
  SkeletonComponent,
  ToastService,
} from '../../design-system/feedback/feedback';
import { DialogComponent } from '../../design-system/surfaces/surfaces';
import { ContextRequestScope, managementError } from '../management/management.shared';
import { AnimalPickerComponent } from './animal-picker.component';
import { BreedingBatchComponent } from './breeding-batch.component';
import { HerdApi } from './herd-api.service';
import { validImportDate } from './herd-import';
import { Animal, AnimalSex, newUuid } from './herd.models';
import {
  Pregnancy,
  PregnancyTerminationReason,
  ReproductionReport,
  ReproductionServiceType,
  pregnancyLabels,
  serviceLabels,
} from './herd-operations.models';
import { formatDate } from './herd.shared';

type Flow = 'breeding' | 'confirm' | 'terminate' | 'calving' | 'view';
interface PreparedCommand {
  flow: Exclude<Flow, 'view'>;
  target: string;
  body: Readonly<Record<string, unknown>>;
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Component({
  selector: 'app-reproduction-page',
  imports: [
    FormsModule,
    RouterLink,
    AnimalPickerComponent,
    BreedingBatchComponent,
    ErrorStateComponent,
    SkeletonComponent,
    DialogComponent,
  ],
  templateUrl: './reproduction-page.component.html',
  styleUrls: [
    './herd-page.scss',
    './operations-page.component.scss',
    './reproduction-page.component.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReproductionPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(HerdApi);
  readonly context = inject(ContextStore);
  readonly permissions = inject(PermissionService);
  private readonly toast = inject(ToastService);
  private readonly destroy = inject(DestroyRef);
  private readonly reportScope = new ContextRequestScope(this.destroy);
  private readonly editorScope = new ContextRequestScope(this.destroy);
  private initialContext = true;
  private prepared: PreparedCommand | null = null;
  readonly report = signal<ReproductionReport | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly filterError = signal('');
  readonly flow = signal<Flow | null>(null);
  readonly pregnancy = signal<Pregnancy | null>(null);
  readonly mother = signal<Animal | null>(null);
  readonly editorLoading = signal(false);
  readonly saving = signal(false);
  readonly reviewing = signal(false);
  readonly formError = signal('');
  readonly today = localDateOnly();
  status = '';
  serviceFilter = '';
  motherFilter = '';
  from = '';
  to = '';
  page = 0;
  serviceType: ReproductionServiceType = 'INSEMINATION';
  serviceOn = this.today;
  expectedCalvingOn = '';
  sireReference = '';
  notes = '';
  transitionOn = this.today;
  terminationReason: PregnancyTerminationReason = 'NOT_PREGNANT';
  calvedOn = this.today;
  calfIdentification = '';
  calfName = '';
  calfSex: AnimalSex = 'FEMALE';
  birthDate = this.today;
  constructor() {
    effect(() => {
      this.context.contextVersion();
      const pending = this.context.transitionPending();
      const farm = this.context.selectedFarm();
      untracked(() => {
        this.reportScope.reset();
        this.resetEditor();
        this.report.set(null);
        this.error.set('');
        this.filterError.set('');
        this.loading.set(false);
        this.page = 0;
        this.status = this.serviceFilter = this.motherFilter = this.from = this.to = '';
        if (pending || !farm) return;
        if (this.initialContext) {
          const requested = this.route.snapshot.queryParamMap.get('pregnancyStatus') || '';
          this.status = ['POSSIBLE', 'CONFIRMED', 'CALVED', 'TERMINATED'].includes(requested)
            ? requested
            : '';
          this.initialContext = false;
        }
        this.reload();
      });
    });
  }
  reload() {
    if (!this.ready()) return;
    this.reportScope.reset();
    this.report.set(null);
    this.loading.set(false);
    this.error.set('');
    this.filterError.set('');
    if (
      (this.motherFilter && !uuid.test(this.motherFilter.trim())) ||
      (this.from && !validImportDate(this.from)) ||
      (this.to && !validImportDate(this.to)) ||
      (this.from && this.to && this.from > this.to)
    ) {
      this.filterError.set(
        'Informe um identificador válido para a mãe e um período com datas válidas em ordem.',
      );
      return;
    }
    this.loading.set(true);
    this.reportScope.run(
      this.api.reproductionReport({
        pregnancyStatus: this.status || undefined,
        serviceType: this.serviceFilter || undefined,
        motherId: this.motherFilter.trim() || undefined,
        from: this.from || undefined,
        to: this.to || undefined,
        page: this.page,
      }),
      (result) => {
        this.report.set(result);
        this.loading.set(false);
      },
      (failure) => {
        this.error.set(managementError(failure, 'Não foi possível carregar a reprodução.'));
        this.loading.set(false);
      },
    );
  }
  applyFilters() {
    this.page = 0;
    this.reload();
  }
  clearFilters() {
    this.status = this.serviceFilter = this.motherFilter = this.from = this.to = '';
    this.applyFilters();
  }
  changePage(page: number) {
    this.page = page;
    this.reload();
  }
  openBreeding() {
    if (this.permissions.canMutateHerd() && this.ready()) {
      this.resetEditor();
      this.flow.set('breeding');
    }
  }
  openStandaloneCalving() {
    if (this.permissions.canManageReproduction() && this.ready()) {
      this.resetEditor();
      this.flow.set('calving');
    }
  }
  chooseMother(animal: Animal) {
    if (
      this.saving() ||
      this.editorLoading() ||
      this.reviewing() ||
      animal.sex !== 'FEMALE' ||
      animal.status !== 'ACTIVE'
    )
      return;
    this.mother.set(animal);
    this.formError.set('');
  }
  openPregnancy(id: string, flow: Exclude<Flow, 'breeding'>) {
    if (!this.ready() || this.saving() || !this.allowed(flow)) return;
    this.resetEditor();
    this.flow.set(flow);
    this.editorLoading.set(true);
    this.editorScope.run(
      this.api.pregnancy(id),
      (pregnancy) => {
        this.pregnancy.set(pregnancy);
        this.editorLoading.set(false);
        if (!this.validState(flow, pregnancy))
          this.formError.set(
            'A gestação não permite esta ação no estado atual. Recarregue o registro.',
          );
      },
      (failure) => {
        this.editorLoading.set(false);
        this.formError.set(
          managementError(
            failure,
            'Não foi possível carregar a gestação. Feche e tente novamente.',
          ),
        );
      },
    );
  }
  close() {
    if (!this.saving() && !this.editorLoading()) this.resetEditor();
  }
  editAgain() {
    if (!this.saving()) {
      this.prepared = null;
      this.reviewing.set(false);
      this.formError.set('');
    }
  }
  prepare() {
    const flow = this.flow();
    if (
      !flow ||
      flow === 'view' ||
      !this.allowed(flow) ||
      !this.ready() ||
      this.saving() ||
      this.editorLoading() ||
      this.reviewing()
    )
      return;
    const pregnancy = this.pregnancy();
    const motherId = pregnancy?.motherId || this.mother()?.id;
    if (!motherId || ((flow === 'confirm' || flow === 'terminate') && !pregnancy)) {
      this.formError.set('Selecione uma mãe ou recarregue a gestação antes de continuar.');
      return;
    }
    if (!this.validDraft(flow, pregnancy)) return;
    this.editorScope.reset();
    this.formError.set('');
    this.editorLoading.set(true);
    // Consulta versões atuais antes da revisão. Após a revisão, o comando é imutável.
    this.editorScope.run(
      forkJoin({
        mother: this.api.animal(motherId),
        pregnancy: pregnancy ? this.api.pregnancy(pregnancy.id) : of(null),
      }),
      (current) => {
        this.editorLoading.set(false);
        this.mother.set(current.mother);
        this.pregnancy.set(current.pregnancy);
        if (
          current.mother.status !== 'ACTIVE' ||
          current.mother.sex !== 'FEMALE' ||
          (current.pregnancy && !this.validState(flow, current.pregnancy))
        ) {
          this.formError.set('A mãe ou a gestação não permite esta ação no estado atual.');
          return;
        }
        if (!this.validDraft(flow, current.pregnancy, current.mother)) return;
        const operationId = newUuid();
        let body: Record<string, unknown>;
        if (flow === 'breeding')
          body = {
            operationId,
            expectedVersion: current.mother.version,
            serviceType: this.serviceType,
            serviceOn: this.serviceOn,
            expectedCalvingOn: this.expectedCalvingOn || null,
            sireReference: this.sireReference.trim() || null,
            notes: this.notes.trim() || null,
          };
        else if (flow === 'calving')
          body = {
            operationId,
            expectedVersion: current.mother.version,
            pregnancyId: current.pregnancy?.id || null,
            expectedPregnancyVersion: current.pregnancy?.version ?? null,
            calvedOn: this.calvedOn,
            calfId: newUuid(),
            identification: this.calfIdentification.trim(),
            name: this.calfName.trim() || null,
            sex: this.calfSex,
            birthDate: this.birthDate,
          };
        else if (flow === 'confirm')
          body = {
            operationId,
            expectedVersion: current.pregnancy!.version,
            occurredOn: this.transitionOn,
          };
        else
          body = {
            operationId,
            expectedVersion: current.pregnancy!.version,
            endedOn: this.transitionOn,
            reason: this.terminationReason,
          };
        this.prepared = Object.freeze({
          flow,
          target:
            flow === 'confirm' || flow === 'terminate' ? current.pregnancy!.id : current.mother.id,
          body: Object.freeze(body),
        });
        this.reviewing.set(true);
      },
      (failure) => {
        this.editorLoading.set(false);
        this.formError.set(
          managementError(
            failure,
            'Não foi possível consultar as versões atuais. Tente revisar novamente.',
          ),
        );
      },
    );
  }
  save() {
    const command = this.prepared;
    if (
      !command ||
      !this.reviewing() ||
      this.saving() ||
      !this.ready() ||
      !this.allowed(command.flow)
    )
      return;
    this.saving.set(true);
    this.formError.set('');
    let request: Observable<unknown>;
    switch (command.flow) {
      case 'breeding':
        request = this.api.breed(command.target, command.body);
        break;
      case 'confirm':
        request = this.api.confirmPregnancy(command.target, command.body);
        break;
      case 'terminate':
        request = this.api.terminatePregnancy(command.target, command.body);
        break;
      case 'calving':
        request = this.api.calve(command.target, command.body);
        break;
    }
    this.editorScope.run(
      request,
      () => {
        const message = {
          breeding: 'Serviço reprodutivo registrado',
          confirm: 'Gestação confirmada',
          terminate: 'Acompanhamento encerrado',
          calving: 'Parto e cria registrados',
        }[command.flow];
        this.resetEditor();
        this.toast.show('success', message);
        this.reload();
      },
      (failure) => {
        this.saving.set(false);
        this.formError.set(
          managementError(
            failure,
            'Não foi possível concluir a ação. Tente novamente com o mesmo comando.',
          ),
        );
      },
    );
  }
  private allowed(flow: Flow) {
    return (
      flow === 'view' ||
      (flow === 'breeding' || flow === 'confirm'
        ? this.permissions.canMutateHerd()
        : this.permissions.canManageReproduction())
    );
  }
  private validState(flow: Flow, p: Pregnancy) {
    return (
      flow === 'view' ||
      (flow === 'confirm'
        ? p.status === 'POSSIBLE'
        : p.status === 'POSSIBLE' || p.status === 'CONFIRMED')
    );
  }
  private validDraft(flow: Exclude<Flow, 'view'>, p: Pregnancy | null, mother = this.mother()) {
    const occurred =
      flow === 'breeding' ? this.serviceOn : flow === 'calving' ? this.calvedOn : this.transitionOn;
    if (
      !validImportDate(occurred) ||
      occurred > this.today ||
      (mother?.birthDate && occurred < mother.birthDate) ||
      (p && occurred < p.serviceOn)
    ) {
      this.formError.set(
        'Informe uma data válida, entre o início do acompanhamento ou nascimento da mãe e hoje.',
      );
      return false;
    }
    if (
      flow === 'breeding' &&
      (!['INSEMINATION', 'NATURAL_SERVICE'].includes(this.serviceType) ||
        (this.expectedCalvingOn &&
          (!validImportDate(this.expectedCalvingOn) || this.expectedCalvingOn <= this.serviceOn)) ||
        this.sireReference.trim().length > 160 ||
        this.notes.trim().length > 1000)
    ) {
      this.formError.set(
        'Revise o tipo de serviço, a previsão posterior ao serviço e os limites das observações.',
      );
      return false;
    }
    if (
      flow === 'terminate' &&
      !['NOT_PREGNANT', 'PREGNANCY_LOSS', 'ABORTION', 'OTHER'].includes(this.terminationReason)
    ) {
      this.formError.set('Selecione um motivo válido para o encerramento.');
      return false;
    }
    if (
      flow === 'calving' &&
      (!this.calfIdentification.trim() ||
        this.calfIdentification.trim().length > 100 ||
        this.calfName.trim().length > 255 ||
        !['FEMALE', 'MALE'].includes(this.calfSex) ||
        !validImportDate(this.birthDate) ||
        this.birthDate > this.calvedOn)
    ) {
      this.formError.set(
        'Informe identificação, sexo e nascimento da cria com data válida até o parto.',
      );
      return false;
    }
    return true;
  }
  private ready() {
    return !this.context.transitionPending() && !!this.context.selectedFarm();
  }
  private resetEditor() {
    this.editorScope.reset();
    this.flow.set(null);
    this.pregnancy.set(null);
    this.mother.set(null);
    this.saving.set(false);
    this.editorLoading.set(false);
    this.reviewing.set(false);
    this.formError.set('');
    this.prepared = null;
    this.serviceType = 'INSEMINATION';
    this.serviceOn = this.transitionOn = this.calvedOn = this.birthDate = this.today;
    this.expectedCalvingOn =
      this.sireReference =
      this.notes =
      this.calfIdentification =
      this.calfName =
        '';
    this.calfSex = 'FEMALE';
    this.terminationReason = 'NOT_PREGNANT';
  }
  title() {
    return {
      breeding: 'Registrar serviço reprodutivo',
      confirm: 'Confirmar gestação',
      terminate: 'Encerrar acompanhamento',
      calving: 'Registrar parto e cria',
      view: 'Detalhes da gestação',
    }[this.flow() || 'view'];
  }
  actionLabel(value: string) {
    return (
      (
        {
          BREEDING_RECORDED: 'Serviço registrado',
          PREGNANCY_CONFIRMED: 'Gestação confirmada',
          PREGNANCY_TERMINATED: 'Acompanhamento encerrado',
          CALVED: 'Parto realizado',
          BORN: 'Cria nascida',
        } as Record<string, string>
      )[value] || 'Evento reprodutivo'
    );
  }
  terminationLabel(value: PregnancyTerminationReason) {
    return {
      NOT_PREGNANT: 'Gestação não confirmada',
      PREGNANCY_LOSS: 'Perda gestacional',
      ABORTION: 'Abortamento',
      OTHER: 'Outro',
    }[value];
  }
  date = formatDate;
  serviceLabel = (value: ReproductionServiceType) => serviceLabels[value];
  pregnancyLabel = (value: Pregnancy['status']) => pregnancyLabels[value];
}
