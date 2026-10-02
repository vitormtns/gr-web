import { DestroyRef, Injectable, effect, inject, signal, untracked } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ContextStore } from '../../core/context/context.store';
import { ContextRequestScope, managementError } from '../management/management.shared';
import { DashboardApiClient } from '../home/dashboard-api.service';
import type { AgendaPage, DashboardAttention } from '../home/dashboard.models';
import { todayLocalIso } from '../home/operational-urgency';
import { HerdApi } from './herd-api.service';
import type { PendingWorkItem, PendingWorkPage } from './herd-operations.models';
import { ParityApi } from './parity-api.service';
import type { ProcedureCoverage } from './parity.models';
import {
  datePlusDays,
  HEALTH_PENDING_TYPES,
  type HealthPendingType,
  rankSanitaryItems,
} from './health-operational.models';

export interface HealthSection<T> {
  status: 'idle' | 'loading' | 'ready' | 'error';
  value: T | null;
  error: string;
}
const idle = <T>(): HealthSection<T> => ({ status: 'idle', value: null, error: '' });
const loading = <T>(): HealthSection<T> => ({ status: 'loading', value: null, error: '' });
const ready = <T>(value: T): HealthSection<T> => ({ status: 'ready', value, error: '' });
const failed = <T>(error: string): HealthSection<T> => ({ status: 'error', value: null, error });

@Injectable()
export class HealthOperationalStore {
  private readonly context = inject(ContextStore);
  private readonly api = inject(HerdApi);
  private readonly dashboard = inject(DashboardApiClient);
  private readonly parity = inject(ParityApi);
  private readonly destroy = inject(DestroyRef);
  private readonly attentionScope = new ContextRequestScope(this.destroy);
  private readonly sampleScope = new ContextRequestScope(this.destroy);
  private readonly agendaScope = new ContextRequestScope(this.destroy);
  private readonly brucScope = new ContextRequestScope(this.destroy);
  private readonly aftosaScope = new ContextRequestScope(this.destroy);
  private readonly pendingScope = new ContextRequestScope(this.destroy);
  private readonly detailScope = new ContextRequestScope(this.destroy);

  readonly today = todayLocalIso();
  readonly attention = signal<HealthSection<DashboardAttention>>(idle());
  readonly samples = signal<HealthSection<PendingWorkItem[]>>(idle());
  readonly agenda = signal<HealthSection<AgendaPage>>(idle());
  readonly brucCoverage = signal<HealthSection<ProcedureCoverage>>(idle());
  readonly aftosaCoverage = signal<HealthSection<ProcedureCoverage>>(idle());
  readonly pending = signal<HealthSection<PendingWorkPage>>(idle());
  readonly detail = signal<HealthSection<PendingWorkPage>>(idle());
  readonly pendingType = signal<HealthPendingType>('BRUCELLOSIS_WINDOW_MISSED');
  readonly pendingAnimalId = signal('');
  readonly pendingAnimalLabel = signal('');
  readonly pendingPage = signal(0);
  readonly detailType = signal<HealthPendingType | null>(null);
  readonly detailPage = signal(0);
  readonly selectedItem = signal<PendingWorkItem | null>(null);
  readonly referenceDate = signal(this.today);

  constructor() {
    effect(() => {
      this.context.contextVersion();
      const transitioning = this.context.transitionPending();
      const farm = this.context.selectedFarm();
      untracked(() => {
        this.reset();
        if (!transitioning && farm) this.loadAll();
      });
    });
  }

  private reset() {
    for (const scope of [
      this.attentionScope,
      this.sampleScope,
      this.agendaScope,
      this.brucScope,
      this.aftosaScope,
      this.pendingScope,
      this.detailScope,
    ])
      scope.reset();
    this.attention.set(idle());
    this.samples.set(idle());
    this.agenda.set(idle());
    this.brucCoverage.set(idle());
    this.aftosaCoverage.set(idle());
    this.pending.set(idle());
    this.detail.set(idle());
    this.pendingType.set('BRUCELLOSIS_WINDOW_MISSED');
    this.pendingAnimalId.set('');
    this.pendingAnimalLabel.set('');
    this.pendingPage.set(0);
    this.detailType.set(null);
    this.detailPage.set(0);
    this.selectedItem.set(null);
    this.referenceDate.set(this.today);
  }

  private active() {
    return !this.context.transitionPending() && !!this.context.selectedFarm();
  }

  loadAll() {
    this.loadAttention();
    this.loadAgenda();
    this.loadBrucCoverage();
    this.loadAftosaCoverage();
  }

  loadAttention() {
    if (!this.active()) return;
    this.attentionScope.reset();
    this.sampleScope.reset();
    this.attention.set(loading());
    this.samples.set(idle());
    this.attentionScope.run(
      this.dashboard.attention(),
      (value) => {
        this.attention.set(ready(value));
        this.referenceDate.set(value.referenceDate);
        this.loadSamples(value);
      },
      (error) =>
        this.attention.set(
          failed(managementError(error, 'Não foi possível carregar a situação sanitária.')),
        ),
    );
  }

  private loadSamples(attention: DashboardAttention) {
    const available: HealthPendingType[] = HEALTH_PENDING_TYPES.filter(
      (type) => this.countFor(attention, type) > 0,
    );
    if (!available.length) {
      this.samples.set(ready([]));
      return;
    }
    this.samples.set(loading());
    this.sampleScope.run(
      forkJoin(available.map((type) => this.api.pendingWork({ type, page: 0 }))),
      (pages) => this.samples.set(ready(rankSanitaryItems(pages.flatMap((page) => page.items)))),
      (error) =>
        this.samples.set(
          failed(managementError(error, 'Não foi possível carregar as prioridades sanitárias.')),
        ),
    );
  }

  countFor(attention: DashboardAttention, type: HealthPendingType): number {
    const summary = attention.summary;
    switch (type) {
      case 'BRUCELLOSIS_WINDOW_MISSED':
        return summary.brucellosisWindowMissed;
      case 'BRUCELLOSIS_DUE':
        return summary.brucellosisDue;
      case 'VACCINATION_DUE':
        return summary.vaccinationDue;
      case 'DEWORMING_DUE':
        return summary.dewormingDue;
    }
  }

  loadAgenda() {
    if (!this.active()) return;
    this.agendaScope.reset();
    this.agenda.set(loading());
    this.agendaScope.run(
      this.dashboard.agendaPage(this.today, datePlusDays(this.today, 6), 0, 100, true),
      (value) => this.agenda.set(ready(value)),
      (error) =>
        this.agenda.set(
          failed(managementError(error, 'Não foi possível carregar a agenda sanitária.')),
        ),
    );
  }

  loadBrucCoverage() {
    if (!this.active()) return;
    this.brucScope.reset();
    this.brucCoverage.set(loading());
    this.brucScope.run(
      this.parity.coverage('BRUCELLOSIS', this.today),
      (value) => this.brucCoverage.set(ready(value)),
      (error) =>
        this.brucCoverage.set(
          failed(managementError(error, 'Não foi possível carregar os registros de brucelose.')),
        ),
    );
  }

  loadAftosaCoverage() {
    if (!this.active()) return;
    this.aftosaScope.reset();
    this.aftosaCoverage.set(loading());
    this.aftosaScope.run(
      this.parity.coverage('FOOT_AND_MOUTH_DISEASE', this.today),
      (value) => this.aftosaCoverage.set(ready(value)),
      (error) =>
        this.aftosaCoverage.set(
          failed(managementError(error, 'Não foi possível carregar o histórico de aftosa.')),
        ),
    );
  }

  loadPending(page = this.pendingPage()) {
    if (!this.active()) return;
    this.pendingScope.reset();
    this.pendingPage.set(page);
    this.pending.set(loading());
    this.pendingScope.run(
      this.api.pendingWork({
        type: this.pendingType() || undefined,
        animalId: this.pendingAnimalId() || undefined,
        page,
      }),
      (value) => this.pending.set(ready(value)),
      (error) =>
        this.pending.set(
          failed(managementError(error, 'Não foi possível carregar as pendências sanitárias.')),
        ),
    );
  }

  applyPending(type: HealthPendingType, animalId: string, animalLabel: string) {
    this.pendingType.set(type);
    this.pendingAnimalId.set(animalId);
    this.pendingAnimalLabel.set(animalLabel);
    this.loadPending(0);
  }

  openDetail(type: HealthPendingType, item: PendingWorkItem | null = null) {
    this.detailType.set(type);
    this.selectedItem.set(item);
    this.loadDetail(0);
  }

  loadDetail(page = this.detailPage()) {
    const type = this.detailType();
    if (!type || !this.active()) return;
    this.detailScope.reset();
    this.detailPage.set(page);
    this.detail.set(loading());
    this.detailScope.run(
      this.api.pendingWork({ type, page }),
      (value) => this.detail.set(ready(value)),
      (error) =>
        this.detail.set(
          failed(managementError(error, 'Não foi possível carregar os detalhes da pendência.')),
        ),
    );
  }

  closeDetail() {
    this.detailScope.reset();
    this.detailType.set(null);
    this.selectedItem.set(null);
    this.detail.set(idle());
  }
}
