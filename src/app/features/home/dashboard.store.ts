import { DestroyRef, Injectable, effect, signal } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { AppError } from '../../core/api/api.models';
import { localDateOnly } from '../../core/date/date-only';
import { ContextStore } from '../../core/context/context.store';
import { DashboardApiClient } from './dashboard-api.service';
import { AgendaPage, DashboardActivity, DashboardAttention, DashboardOverview, PaddockDto, PaddockPage, PeriodSelection, SectionState, idleSection, periodIsValid } from './dashboard.models';

type SectionName = 'overview' | 'activity' | 'attention' | 'agenda' | 'paddocks';

@Injectable()
export class DashboardStore {
  readonly period = signal<PeriodSelection>({ period: 'LAST_30_DAYS' });
  readonly overview = signal<SectionState<DashboardOverview>>(idleSection());
  readonly activity = signal<SectionState<DashboardActivity>>(idleSection());
  readonly attention = signal<SectionState<DashboardAttention>>(idleSection());
  readonly agenda = signal<SectionState<AgendaPage>>(idleSection());
  readonly paddocks = signal<SectionState<PaddockDto[]>>(idleSection());
  private readonly subscriptions = new Map<SectionName, Subscription>();
  private readonly generations: Record<SectionName, number> = { overview: 0, activity: 0, attention: 0, agenda: 0, paddocks: 0 };
  private activeContext = '';

  constructor(private readonly api: DashboardApiClient, private readonly context: ContextStore, destroyRef: DestroyRef) {
    destroyRef.onDestroy(() => this.subscriptions.forEach(subscription => subscription.unsubscribe()));
    effect(() => {
      const version = this.context.contextVersion();
      const organization = this.context.selectedOrganization()?.organizationId;
      const farm = this.context.selectedFarm()?.farmId;
      const ready = this.context.status() === 'ready' && !this.context.transitionPending();
      const key = ready && organization && farm ? `${version}:${organization}:${farm}` : '';
      if (key === this.activeContext) return;
      this.activeContext = key;
      this.invalidateAll();
      if (key) this.loadAll();
    });
  }

  selectPeriod(selection: PeriodSelection): boolean {
    if (!periodIsValid(selection)) return false;
    const previous = this.period();
    if (previous.period === selection.period && previous.from === selection.from && previous.to === selection.to) return true;
    this.period.set(selection);
    this.invalidate('overview');
    this.invalidate('activity');
    if (this.activeContext) { this.retry('overview'); this.retry('activity'); }
    return true;
  }

  retry(section: SectionName): void {
    if (!this.activeContext) return;
    switch (section) {
      case 'overview': this.load('overview', this.overview, this.api.overview(this.period())); break;
      case 'activity': this.load('activity', this.activity, this.api.activity(this.period())); break;
      case 'attention': this.load('attention', this.attention, this.api.attention()); break;
      case 'agenda': this.load('agenda', this.agenda, this.api.agenda(localDateOnly())); break;
      case 'paddocks': this.loadPaddocks(); break;
    }
  }

  private loadAll(): void {
    (['overview', 'activity', 'attention', 'agenda', 'paddocks'] as const).forEach(name => this.retry(name));
  }

  private invalidateAll(): void {
    (['overview', 'activity', 'attention', 'agenda', 'paddocks'] as const).forEach(name => this.invalidate(name));
  }

  private invalidate(name: SectionName): void {
    ++this.generations[name];
    this.subscriptions.get(name)?.unsubscribe();
    this.subscriptions.delete(name);
    switch (name) {
      case 'overview': this.overview.set(idleSection()); break;
      case 'activity': this.activity.set(idleSection()); break;
      case 'attention': this.attention.set(idleSection()); break;
      case 'agenda': this.agenda.set(idleSection()); break;
      case 'paddocks': this.paddocks.set(idleSection()); break;
    }
  }

  private load<T>(name: SectionName, state: { set(value: SectionState<T>): void }, request: Observable<T>): void {
    this.subscriptions.get(name)?.unsubscribe();
    const generation = ++this.generations[name];
    const key = this.activeContext;
    state.set({ status: 'loading', value: null, error: null });
    const subscription = request.subscribe({
      next: value => { if (this.current(name, generation, key)) state.set({ status: 'ready', value, error: null }); },
      error: error => { if (this.current(name, generation, key)) state.set({ status: 'error', value: null, error: error instanceof AppError ? error : null }); },
    });
    this.subscriptions.set(name, subscription);
  }

  private loadPaddocks(): void {
    const name = 'paddocks';
    this.subscriptions.get(name)?.unsubscribe();
    const generation = ++this.generations[name];
    const key = this.activeContext;
    this.paddocks.set({ status: 'loading', value: null, error: null });
    const collected: PaddockDto[] = [];
    const subscription = new Subscription();
    this.subscriptions.set(name, subscription);
    const nextPage = (page: number) => {
      subscription.add(this.api.paddocks(page).subscribe({
        next: (value: PaddockPage) => {
          if (!this.current(name, generation, key)) return;
          collected.push(...value.items);
          if (page + 1 < value.totalPages) nextPage(page + 1);
          else this.paddocks.set({ status: 'ready', value: collected, error: null });
        },
        error: error => { if (this.current(name, generation, key)) this.paddocks.set({ status: 'error', value: null, error: error instanceof AppError ? error : null }); },
      }));
    };
    nextPage(0);
  }

  private current(name: SectionName, generation: number, key: string): boolean {
    return this.generations[name] === generation && this.activeContext === key && !!key;
  }
}
