import { AgendaDailySummaryComponent, SummaryDay } from './agenda-daily-summary.component';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  inject,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ContextStore } from '../../core/context/context.store';
import { PermissionService } from '../../core/permissions/permission.service';
import type { AgendaDto } from '../home/dashboard.models';
import { DomainIconComponent } from '../../design-system/primitives/domain-icon';
import { ErrorStateComponent, SkeletonComponent } from '../../design-system/feedback/feedback';
import { PaginationComponent } from '../../design-system/data-display/data-display';
import { DialogComponent } from '../../design-system/surfaces/surfaces';
import { formatDate } from './herd.shared';
import { Animal } from './herd.models';
import { AnimalPickerComponent } from './animal-picker.component';
import type { HealthReport, PendingWorkItem } from './herd-operations.models';
import {
  HEALTH_PENDING_LABELS,
  HEALTH_PENDING_TYPES,
  sanitaryAgenda,
  datePlusDays,
  type HealthPendingType,
} from './health-operational.models';
import { HealthOperationalStore } from './health-operational.store';

@Component({
  selector: 'app-health-command-center',
  imports: [AgendaDailySummaryComponent,
    FormsModule,
    RouterLink,
    DomainIconComponent,
    ErrorStateComponent,
    SkeletonComponent,
    PaginationComponent,
    DialogComponent,
    AnimalPickerComponent,
  ],
  providers: [HealthOperationalStore],
  templateUrl: './health-command-center.component.html',
  styleUrls: ['./health-command-center.component.scss', './health-command-center-polish.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HealthCommandCenterComponent {
  readonly dailySummary = signal<SummaryDay[] | null>(null);
  dayCount(day: string): number | string { const days = this.dailySummary(); return days ? days.find(item => item.displayOn === day)?.count ?? 0 : "—"; }
  readonly permissions = inject(PermissionService);
  readonly store = inject(HealthOperationalStore);
  private readonly context = inject(ContextStore);
  readonly view = input<'overview' | 'pending'>('overview');
  readonly openPending = output<void>();
  readonly initialPendingType = input<HealthPendingType | null>(null);
  readonly initialAnimalId = input('');
  readonly registerCare = output<PendingWorkItem>();
  readonly historySummary = input<HealthReport['summary'] | null>(null);
  readonly pickerOpen = signal(false);
  readonly types = HEALTH_PENDING_TYPES;
  readonly labels = HEALTH_PENDING_LABELS;
  readonly pendingCount = computed(() => {
    const attention = this.store.attention().value?.summary;
    return attention
      ? attention.vaccinationDue +
          attention.dewormingDue +
          attention.brucellosisDue +
          attention.brucellosisWindowMissed
      : null;
  });
  readonly ranked = computed(() => this.store.samples().value ?? []);
  readonly hero = computed(() => this.ranked()[0] ?? null);
  readonly secondary = computed(() => {
    const attention = this.store.attention().value;
    if (!attention) return [];
    return [
      {
        type: 'VACCINATION_DUE' as const,
        count: attention.summary.vaccinationDue,
        title: 'Vacinações pendentes',
      },
      {
        type: 'DEWORMING_DUE' as const,
        count: attention.summary.dewormingDue,
        title: 'Vermifugações pendentes',
      },
      {
        type: 'BRUCELLOSIS_DUE' as const,
        count: attention.summary.brucellosisDue,
        title: 'Brucelose na janela',
      },
    ].filter((category) => category.count > 0 && category.type !== this.hero()?.type);
  });
  readonly agendaItems = computed(() => sanitaryAgenda(this.store.agenda().value?.items ?? []));
  readonly days = Array.from({ length: 7 }, (_, index) => datePlusDays(this.store.today, index));
  pendingType: HealthPendingType = 'BRUCELLOSIS_WINDOW_MISSED';
  date = formatDate;

  constructor() {
    effect(() => {
      this.context.contextVersion();
      const transitioning = this.context.transitionPending();
      const type = this.initialPendingType();
      const animalId = this.initialAnimalId();
      const view = this.view();
      untracked(() => {
        this.pickerOpen.set(false);
        if (view !== 'pending' || transitioning) return;
        if (type) {
          this.pendingType = type;
          this.store.applyPending(type, animalId, animalId ? 'Animal da ação de origem' : '');
        } else this.store.loadPending(0);
      });
    });
  }

  count(value: number | null | undefined) {
    return value === null || value === undefined
      ? '—'
      : new Intl.NumberFormat('pt-BR').format(value);
  }
  share(value: number, total: number) {
    return total > 0 ? Math.max(0, Math.min(100, (value / total) * 100)) : 0;
  }
  relativeBar(value: number, other: number) {
    return this.share(value, Math.max(value, other));
  }
  coverageDenominator(total: number, unknown: number) {
    return Math.max(0, total - unknown);
  }
  coveragePercent(withRecord: number, total: number, unknown: number): number | null {
    const denominator = this.coverageDenominator(total, unknown);
    return denominator
      ? Math.min(100, Math.max(0, Math.round((withRecord / denominator) * 100)))
      : null;
  }
  dayTitle(day: string, index: number) {
    if (index === 0) return 'Hoje';
    if (index === 1) return 'Amanhã';
    const date = new Date(`${day}T12:00:00`);
    return new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).replace('.', '');
  }
  onDay(day: string): AgendaDto[] {
    return this.agendaItems().filter((item) => (item.displayOn ?? item.operationalDate) === day);
  }
  typeName(item: PendingWorkItem) {
    return HEALTH_PENDING_LABELS[item.type as HealthPendingType] || 'Pendência sanitária';
  }
  deadline(item: PendingWorkItem) {
    return item.dueOn || item.expectedOn;
  }
  timing(item: PendingWorkItem) {
    if (item.type === 'BRUCELLOSIS_WINDOW_MISSED') return 'Janela primária perdida';
    if ((item.daysOverdue ?? 0) > 0)
      return `Atraso de ${item.daysOverdue} ${item.daysOverdue === 1 ? 'dia' : 'dias'}`;
    if (item.daysUntil === 0) return 'Hoje';
    if (item.daysUntil === 1) return 'Amanhã';
    if (item.daysUntil !== null) return `Em ${item.daysUntil} dias`;
    return 'Prazo não informado';
  }
  chooseAnimal(animal: Animal) {
    this.pickerOpen.set(false);
    this.store.applyPending(
      this.pendingType,
      animal.id,
      `${animal.identification}${animal.name ? ' · ' + animal.name : ''}`,
    );
  }
  applyType() {
    this.store.applyPending(
      this.pendingType,
      this.store.pendingAnimalId(),
      this.store.pendingAnimalLabel(),
    );
  }
  clearAnimal() {
    this.store.applyPending(this.pendingType, '', '');
  }
  showCategory(type: HealthPendingType) {
    this.store.openDetail(type);
  }
  showItem(item: PendingWorkItem) {
    this.store.openDetail(item.type as HealthPendingType, item);
  }
  gotoPending(type: HealthPendingType) {
    this.pendingType = type;
    this.store.applyPending(type, '', '');
    this.store.closeDetail();
  }
}
