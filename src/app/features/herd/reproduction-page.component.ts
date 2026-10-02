import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewChild,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { expectedCalvingPreview } from './reproduction-preview';
import { Animal, AnimalSex, newUuid } from './herd.models';
import {
  Pregnancy,
  FarmPregnancyPage,
  PregnancyTerminationReason,
  ReproductionReport,
  ReproductionServiceType,
  pregnancyLabels,
  serviceLabels,
} from './herd-operations.models';
import { formatDate } from './herd.shared';
import { ReproductionOperationalStore } from './reproduction-operational.store';
import { ReproductionOverviewComponent } from './reproduction-overview.component';

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
    ReproductionOverviewComponent,
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
  providers: [ReproductionOperationalStore],
})
export class ReproductionPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(HerdApi);
  readonly operational = inject(ReproductionOperationalStore);
  @ViewChild(BreedingBatchComponent) batch?: BreedingBatchComponent;
  readonly context = inject(ContextStore);
  readonly permissions = inject(PermissionService);
  private readonly toast = inject(ToastService);
  private readonly destroy = inject(DestroyRef);
  private readonly reportScope = new ContextRequestScope(this.destroy);
  private readonly pregnanciesScope = new ContextRequestScope(this.destroy);
  private readonly editorScope = new ContextRequestScope(this.destroy);
  private initialContext = true;
  private prepared: PreparedCommand | null = null;
  readonly report = signal<ReproductionReport | null>(null);
  readonly pregnancies = signal<FarmPregnancyPage | null>(null);
  readonly pregnanciesLoading = signal(false);
  readonly pregnanciesError = signal('');
  readonly tab = signal<'overview' | 'pregnancies' | 'history'>('overview');
  readonly eventMenuOpen = signal(false);
  readonly historyPickerOpen = signal(false);
  readonly selectedHistoryMother = signal<Animal | null>(null);
  readonly pregnancyPickerOpen = signal(false);
  readonly selectedPregnancyMother = signal<Animal | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly filterError = signal('');
  readonly flow = signal<Flow | null>(null);
  readonly pregnancy = signal<Pregnancy | null>(null);
  private readonly calvingContextReady = signal(true);
  private consumedIntent = '';
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
  pregnancyPage = 0;
  pregnancyStatus = '';
  pregnancyServiceType = '';
  pregnancyMotherId = '';
  serviceType: ReproductionServiceType = 'INSEMINATION';
  serviceOn = this.today;
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
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroy)).subscribe((params) => {
      const requested = params.get('tab');
      this.tab.set(requested === 'history' || requested === 'pregnancies' ? requested : 'overview');
      if (!this.initialContext && this.tab() === 'pregnancies' && !this.pregnancies() && !this.pregnanciesLoading() && this.ready())
        this.loadPregnancies();
      if (!this.initialContext) this.applyIntent();
    });
    effect(() => {
      this.context.contextVersion();
      const pending = this.context.transitionPending();
      const farm = this.context.selectedFarm();
      untracked(() => {
        const initialIntent = this.initialContext;
        this.reportScope.reset();
        this.pregnanciesScope.reset();
        this.operational.closeDetail();
        this.pregnancies.set(null);
        this.pregnanciesLoading.set(false);
        this.pregnanciesError.set('');
        this.eventMenuOpen.set(false);
        this.historyPickerOpen.set(false);
        this.selectedHistoryMother.set(null);
        this.pregnancyPickerOpen.set(false);
        this.selectedPregnancyMother.set(null);
        this.resetEditor();
        this.report.set(null);
        this.error.set('');
        this.filterError.set('');
        this.loading.set(false);
        this.page = 0;
        this.pregnancyPage = 0;
        this.pregnancyStatus = this.pregnancyServiceType = this.pregnancyMotherId = '';
        this.status = this.serviceFilter = this.motherFilter = this.from = this.to = '';
        if (!this.initialContext) {
          void this.router.navigate([], { relativeTo: this.route, queryParamsHandling: 'merge', queryParams: {
            pregnancyStatus: null, serviceType: null, motherId: null, from: null, to: null, page: null, pregnancyId: null, action: null,
          } });
        }
        if (pending || !farm) return;
        if (this.initialContext) {
          const requested = this.route.snapshot.queryParamMap.get('pregnancyStatus') || '';
          this.status = ['POSSIBLE', 'CONFIRMED', 'CALVED', 'TERMINATED'].includes(requested)
            ? requested
            : '';
          const params = this.route.snapshot.queryParamMap;
          this.serviceFilter = ['INSEMINATION', 'NATURAL_SERVICE'].includes(params.get('serviceType') || '') ? params.get('serviceType')! : '';
          this.motherFilter = uuid.test(params.get('motherId') || '') ? params.get('motherId')! : '';
          this.from = validImportDate(params.get('from') || '') ? params.get('from')! : '';
          this.to = validImportDate(params.get('to') || '') ? params.get('to')! : '';
          const requestedPage = Number(params.get('page') || 0);
          this.page = Number.isSafeInteger(requestedPage) && requestedPage >= 0 ? requestedPage : 0;
          this.initialContext = false;
        }
        this.reload();
        if (this.tab() === 'pregnancies') this.loadPregnancies();
        if (initialIntent) this.applyIntent();
      });
    });
  }
  private applyIntent() {
    const params = this.route.snapshot.queryParamMap;
    const id = params.get('pregnancyId') || '';
    const action = params.get('action') || 'view';
    const key = `${this.context.selectedFarm()?.farmId}:${id}:${action}`;
    if (key === this.consumedIntent) return;
    if (uuid.test(id) && ['view', 'confirm', 'terminate', 'calving'].includes(action) && this.ready()) {
      this.consumedIntent = key;
      this.openPregnancy(id, action as Exclude<Flow, 'breeding'>);
    }
  }
  selectTab(tab: 'overview' | 'pregnancies' | 'history') {
    if (tab !== 'overview') this.operational.closeDetail();
    this.tab.set(tab);
    void this.router.navigate([], { relativeTo: this.route, queryParams: { tab }, queryParamsHandling: 'merge' });
    if (tab === 'pregnancies' && !this.pregnancies() && !this.pregnanciesLoading()) this.loadPregnancies();
  }
  onTabKeydown(event: KeyboardEvent) {
    const tabs = ['overview', 'pregnancies', 'history'] as const;
    const index = tabs.indexOf(this.tab());
    const next = event.key === 'ArrowRight' ? (index + 1) % 3
      : event.key === 'ArrowLeft' ? (index + 2) % 3
      : event.key === 'Home' ? 0 : event.key === 'End' ? 2 : -1;
    if (next < 0) return;
    event.preventDefault();
    this.selectTab(tabs[next]);
    queueMicrotask(() => document.getElementById(`repro-tab-${tabs[next]}`)?.focus());
  }
  openBatch() {
    if (this.permissions.canMutateHerd() && this.ready()) this.batch?.start();
  }
  toggleEventMenu() {
    this.eventMenuOpen.update((open) => !open);
    if (this.eventMenuOpen()) queueMicrotask(() => document.querySelector<HTMLButtonElement>('.event-menu-list button')?.focus());
  }
  onEventMenuKeydown(event: KeyboardEvent) {
    if (!this.eventMenuOpen()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.eventMenuOpen.set(false);
      queueMicrotask(() => document.querySelector<HTMLButtonElement>('.event-menu > button')?.focus());
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const items = Array.from(document.querySelectorAll<HTMLButtonElement>('.event-menu-list button'));
    if (!items.length) return;
    event.preventDefault();
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
      : event.key === 'ArrowDown' ? (current + 1) % items.length
      : (current - 1 + items.length) % items.length;
    items[next].focus();
  }
  chooseHistoryMother(animal: Animal) {
    this.selectedHistoryMother.set(animal);
    this.motherFilter = animal.id;
    this.historyPickerOpen.set(false);
  }
  clearHistoryMother() {
    this.selectedHistoryMother.set(null);
    this.motherFilter = '';
  }
  choosePregnancyMother(animal: Animal) {
    this.selectedPregnancyMother.set(animal);
    this.pregnancyMotherId = animal.id;
    this.pregnancyPickerOpen.set(false);
  }
  clearPregnancyMother() {
    this.selectedPregnancyMother.set(null);
    this.pregnancyMotherId = '';
  }
  loadPregnancies() {
    if (!this.ready()) return;
    this.pregnanciesScope.reset();
    this.pregnanciesLoading.set(true);
    this.pregnanciesError.set('');
    this.pregnanciesScope.run(
      this.api.allPregnancies({ status: this.pregnancyStatus || undefined, serviceType: this.pregnancyServiceType || undefined, motherId: this.pregnancyMotherId || undefined, page: this.pregnancyPage }),
      (value) => { this.pregnancies.set(value); this.pregnanciesLoading.set(false); },
      (error) => { this.pregnanciesError.set(managementError(error, 'Não foi possível carregar as gestações.')); this.pregnanciesLoading.set(false); },
    );
  }
  applyPregnancyFilters() { this.pregnancyPage = 0; this.loadPregnancies(); }
  changePregnancyPage(page: number) { this.pregnancyPage = page; this.loadPregnancies(); }
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
    this.syncHistoryQuery();
    this.reload();
  }
  clearFilters() {
    this.status = this.serviceFilter = this.motherFilter = this.from = this.to = '';
    this.selectedHistoryMother.set(null);
    this.applyFilters();
  }
  changePage(page: number) {
    this.page = page;
    this.syncHistoryQuery();
    this.reload();
  }
  private syncHistoryQuery() {
    void this.router.navigate([], { relativeTo: this.route, queryParamsHandling: 'merge', queryParams: {
      pregnancyStatus: this.status || null, serviceType: this.serviceFilter || null,
      motherId: this.motherFilter || null, from: this.from || null, to: this.to || null,
      page: this.page || null,
    } });
  }
  openBreeding() {
    if (this.permissions.canMutateHerd() && this.ready()) {
      this.resetEditor();
      this.flow.set('breeding');
      this.eventMenuOpen.set(false);
    }
  }
  openStandaloneCalving() {
    if (this.permissions.canManageReproduction() && this.ready()) {
      this.resetEditor();
      this.flow.set('calving');
      this.eventMenuOpen.set(false);
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
    if (this.flow() === 'calving') {
      this.calvingContextReady.set(false);
      this.pregnancy.set(null);
      this.editorLoading.set(true);
      this.editorScope.run(
        forkJoin({
          possible: this.api.allPregnancies({ motherId: animal.id, status: 'POSSIBLE' }),
          confirmed: this.api.allPregnancies({ motherId: animal.id, status: 'CONFIRMED' }),
        }),
        (result) => {
          const open = [...result.possible.items, ...result.confirmed.items];
          this.editorLoading.set(false);
          if (open.length > 1) {
            this.formError.set('Há mais de uma gestação aberta. Revise os acompanhamentos antes de registrar o parto.');
            return;
          }
          if (open.length === 1) {
            this.editorLoading.set(true);
            this.editorScope.run(this.api.pregnancy(open[0].id), (pregnancy) => {
              this.pregnancy.set(pregnancy);
              this.calvingContextReady.set(true);
              this.editorLoading.set(false);
            }, () => {
              this.editorLoading.set(false);
              this.formError.set('Não foi possível carregar a gestação. Selecione a mãe novamente.');
            });
          } else this.calvingContextReady.set(true);
        },
        () => {
          this.editorLoading.set(false);
          this.formError.set('Não foi possível verificar as gestações. Selecione a mãe novamente.');
        },
      );
    }
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
    if (flow === 'calving' && !this.calvingContextReady()) {
      this.formError.set('Verifique a gestação selecionando a mãe novamente antes de revisar o parto.');
      return;
    }
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
        this.operational.loadAll();
        if (this.tab() === 'pregnancies') this.loadPregnancies();
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
        this.sireReference.trim().length > 160 ||
        this.notes.trim().length > 1000)
    ) {
      this.formError.set(
        'Revise o tipo de serviço e os limites das observações.',
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
  expectedCalvingPreview = expectedCalvingPreview;
  private ready() {
    return !this.context.transitionPending() && !!this.context.selectedFarm();
  }
  private resetEditor() {
    this.calvingContextReady.set(true);
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
