import { DestroyRef, Injectable, effect, inject, signal, untracked } from '@angular/core';
import { EMPTY, expand, forkJoin, map, reduce } from 'rxjs';
import { ContextStore } from '../../core/context/context.store';
import { localDateOnly } from '../../core/date/date-only';
import { ContextRequestScope, managementError } from '../management/management.shared';
import { HerdApi } from './herd-api.service';
import type { AgendaItem, PendingWorkItem, PendingWorkPage, ReproductionReport } from './herd-operations.models';

export type ReproductionSection<T> =
  | { status: 'idle' | 'loading' | 'error'; value: null; error: string }
  | { status: 'ready'; value: T; error: '' };
const idle = <T>(): ReproductionSection<T> => ({ status: 'idle', value: null, error: '' });
const loading = <T>(): ReproductionSection<T> => ({ status: 'loading', value: null, error: '' });
const ready = <T>(value: T): ReproductionSection<T> => ({ status: 'ready', value, error: '' });
const failed = <T>(error: string): ReproductionSection<T> => ({ status: 'error', value: null, error });
const reproductiveKinds = new Set(['BREEDING', 'PREGNANCY_CHECK', 'CALVING']);

export function addDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export interface ReproductionAttention {
  overdue: PendingWorkPage;
  upcoming: PendingWorkPage;
  plannedChecks: number;
}

@Injectable()
export class ReproductionOperationalStore {
  private readonly api = inject(HerdApi);
  private readonly context = inject(ContextStore);
  private readonly destroy = inject(DestroyRef);
  private readonly overviewScope = new ContextRequestScope(this.destroy);
  private readonly attentionScope = new ContextRequestScope(this.destroy);
  private readonly milestoneScope = new ContextRequestScope(this.destroy);
  private readonly detailScope = new ContextRequestScope(this.destroy);
  readonly today = localDateOnly();
  readonly overview = signal<ReproductionSection<ReproductionReport>>(idle());
  readonly attention = signal<ReproductionSection<ReproductionAttention>>(idle());
  readonly milestones = signal<ReproductionSection<AgendaItem[]>>(idle());
  readonly detail = signal<ReproductionSection<PendingWorkPage>>(idle());
  readonly detailType = signal<'CALVING_OVERDUE' | 'CALVING_UPCOMING' | null>(null);
  readonly detailPage = signal(0);

  constructor() {
    effect(() => {
      this.context.contextVersion();
      const pending = this.context.transitionPending();
      const farm = this.context.selectedFarm();
      untracked(() => {
        this.reset();
        if (!pending && farm) this.loadAll();
      });
    });
  }

  reset() {
    for (const scope of [this.overviewScope, this.attentionScope, this.milestoneScope, this.detailScope])
      scope.reset();
    this.overview.set(idle());
    this.attention.set(idle());
    this.milestones.set(idle());
    this.detail.set(idle());
    this.detailType.set(null);
    this.detailPage.set(0);
  }

  private active() {
    return !this.context.transitionPending() && !!this.context.selectedFarm();
  }

  loadAll() {
    this.loadOverview();
    this.loadAttention();
    this.loadMilestones();
  }

  loadOverview() {
    if (!this.active()) return;
    this.overviewScope.reset();
    this.overview.set(loading());
    this.overviewScope.run(
      this.api.reproductionReport({ page: 0 }),
      (value) => this.overview.set(ready(value)),
      (error) => this.overview.set(failed(managementError(error, 'Não foi possível carregar a jornada reprodutiva.'))),
    );
  }

  loadAttention() {
    if (!this.active()) return;
    this.attentionScope.reset();
    this.attention.set(loading());
    this.attentionScope.run(
      forkJoin({
        overdue: this.api.pendingWork({ type: 'CALVING_OVERDUE', page: 0 }),
        upcoming: this.api.pendingWork({ type: 'CALVING_UPCOMING', page: 0 }),
        checks: this.api.planner({ type: 'PREGNANCY_CHECK', status: 'OPEN', from: this.today, to: addDays(this.today, 6), page: 0 }),
      }),
      ({ overdue, upcoming, checks }) => this.attention.set(ready({ overdue, upcoming, plannedChecks: checks.totalElements })),
      (error) => this.attention.set(failed(managementError(error, 'Não foi possível carregar a atenção reprodutiva.'))),
    );
  }

  loadMilestones() {
    if (!this.active()) return;
    this.milestoneScope.reset();
    this.milestones.set(loading());
    const from = this.today;
    const to = addDays(from, 6);
    this.milestoneScope.run(
      this.api.agenda({ from, to, includeOverdue: true, page: 0 }).pipe(
        expand((page) => page.page + 1 < page.totalPages
          ? this.api.agenda({ from, to, includeOverdue: true, page: page.page + 1 })
          : EMPTY),
        map((page) => page.items.filter((item) => reproductiveKinds.has(item.kind))),
        reduce((items, pageItems) => [...items, ...pageItems], [] as AgendaItem[]),
      ),
      (items) => this.milestones.set(ready(items)),
      (error) => this.milestones.set(failed(managementError(error, 'Não foi possível carregar os próximos marcos.'))),
    );
  }

  openDetail(type: 'CALVING_OVERDUE' | 'CALVING_UPCOMING') {
    this.detailType.set(type);
    this.loadDetail(0);
  }

  loadDetail(page: number) {
    const type = this.detailType();
    if (!type || !this.active()) return;
    this.detailScope.reset();
    this.detailPage.set(page);
    this.detail.set(loading());
    this.detailScope.run(
      this.api.pendingWork({ type, page }),
      (value) => this.detail.set(ready(value)),
      (error) => this.detail.set(failed(managementError(error, 'Não foi possível carregar os detalhes dos partos.'))),
    );
  }

  closeDetail() {
    this.detailScope.reset();
    this.detailType.set(null);
    this.detail.set(idle());
  }
}
