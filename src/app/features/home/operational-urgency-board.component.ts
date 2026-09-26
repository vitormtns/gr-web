import { ChangeDetectionStrategy, Component, computed, effect, signal } from '@angular/core';
import { ErrorStateComponent, SkeletonComponent } from '../../design-system/feedback/feedback';
import { DashboardStore } from './dashboard.store';
import {
  URGENCY_LEVEL_RANK,
  URGENCY_SECONDARY_LIMIT,
  buildOperationalUrgencies,
  domainIconOf,
  formatUrgencyLabel,
  overdueSignalLabel,
  selectUrgencySpotlight,
  urgencyDomainEyebrow,
  pluralizePt as pluralizePtFn,
  type OperationalUrgency,
  type UrgencyDetailFact,
  type UrgencyDomain,
} from './operational-urgency';
import { OperationalUrgencyObjectComponent } from './operational-urgency-object.component';

@Component({
  selector: 'app-urgency-board',
  imports: [ErrorStateComponent, SkeletonComponent, OperationalUrgencyObjectComponent],
  template: `<section class="urgency-board" aria-labelledby="urgency-title">
    <div class="urgency-heading">
      <div>
        <span class="urgency-kicker">Urgência operacional</span>
        <h2 id="urgency-title">Foco da operação</h2>
      </div>
    </div>
    @if (boardState() === 'loading') {
      <div class="urgency-skeleton" aria-label="Carregando urgências">
        <gr-skeleton class="hero-skeleton" /><gr-skeleton /><gr-skeleton /><gr-skeleton />
      </div>
    } @else if (boardState() === 'error') {
      <gr-error-state
        title="Não foi possível carregar as urgências"
        description="Os dados de atenção e agenda não puderam ser lidos. O restante da Home continua disponível."
        (retry)="retryBoth()"
      />
    } @else if (isCalm()) {
      <div class="urgency-calm">
        <span class="calm-mark" aria-hidden="true">✓</span>
        <div>
          <strong>Operação em dia</strong>
          <p>Nenhum compromisso exige atenção imediata.</p>
        </div>
      </div>
    } @else {
      @if (isPartial()) {
        <p class="urgency-partial-note">Exibindo dados parciais: uma fonte está indisponível.</p>
      }
      @if (hero(); as top) {
        <app-urgency-object
          variant="hero"
          [objectId]="top.id"
          [level]="top.level"
          [icon]="domainIconOf(top.domain)"
          iconSize="lg"
          [eyebrow]="domainEyebrow(top)"
          [headline]="top.title"
          [title]="''"
          [context]="top.context"
          [date]="top.date"
          [dateLabel]="formatIsoDateBr(top.date)"
          [badgeText]="urgencyBadge(top)"
          [badgeTone]="urgencyBadgeTone(top)"
          [facts]="heroFacts(top)"
          [items]="[]"
          [ctaRoute]="urgencyCta(top.domain).route"
          [ctaLabel]="urgencyCta(top.domain).label"
          [expanded]="expandedId() === top.id"
          (toggled)="toggleUrgency(top.id)"
        />
      }
      <div class="urgency-groups">
        @for (item of secondaryItems(); track item.id) {
          <app-urgency-object
            variant="group"
            [objectId]="item.id"
            [level]="item.level"
            [icon]="domainIconOf(item.domain)"
            iconSize="md"
            [eyebrow]="domainEyebrow(item)"
            [headline]="item.title"
            [title]="''"
            [context]="item.context"
            [date]="item.date"
            [dateLabel]="formatIsoDateBr(item.date)"
            [badgeText]="urgencyBadge(item)"
            [badgeTone]="urgencyBadgeTone(item)"
            [facts]="secondaryFacts(item)"
            [items]="[]"
            [ctaRoute]="urgencyCta(item.domain).route"
            [ctaLabel]="urgencyCta(item.domain).label"
            [expanded]="expandedId() === item.id"
            (toggled)="toggleUrgency(item.id)"
          />
        }
        @if (plannerOverdue() > 0) {
          <app-urgency-object
            variant="group"
            objectId="planner-overdue"
            level="overdue"
            icon="planner"
            iconSize="md"
            eyebrow="Planejamento"
            [headline]="formatNumber(plannerOverdue()) + ' ' + pluralizePt(plannerOverdue(), 'tarefa em atraso', 'tarefas em atraso')"
            title="Verificar planejamento"
            [context]="''"
            [date]="''"
            [dateLabel]="''"
            [badgeText]="''"
            [badgeTone]="'neutral'"
            [facts]="[{ label: 'Tarefas em atraso', value: formatNumber(plannerOverdue()) }]"
            [items]="[]"
            ctaRoute="/rebanho/agenda"
            ctaLabel="Abrir agenda"
            [expanded]="expandedId() === 'planner-overdue'"
            (toggled)="toggleUrgency('planner-overdue')"
          />
        }
      </div>
    }
  </section>`,
  styles: [`
    :host {
      display: block;
      min-width: 0;
    }
    .urgency-board {
      min-width: 0;
    }
    .urgency-heading {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: var(--space-3);
    }
    .urgency-heading h2 {
      margin: 0.15rem 0 0;
      font-size: 1.125rem;
      letter-spacing: -0.025em;
      font-weight: 750;
      color: var(--text-primary);
    }
    .urgency-kicker {
      display: block;
      color: var(--color-primary);
      font-size: 0.6875rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .urgency-partial-note {
      margin: 0 0 var(--space-3);
      font-size: 0.75rem;
      color: var(--text-secondary);
    }
    .urgency-groups {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--space-3);
      margin-top: var(--space-3);
    }
    .urgency-calm {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-4) var(--space-5);
      border: 1px solid var(--border-soft);
      border-radius: var(--radius-xl);
      background: var(--surface-subtle);
    }
    .calm-mark {
      width: 2.25rem;
      height: 2.25rem;
      display: grid;
      place-items: center;
      flex: 0 0 auto;
      border-radius: 50%;
      color: var(--semantic-success);
      background: var(--color-success-subtle);
      font-weight: 800;
    }
    .urgency-calm strong {
      font-size: 0.875rem;
      color: var(--text-primary);
    }
    .urgency-calm p {
      margin: 0.15rem 0 0;
      font-size: 0.75rem;
      color: var(--text-secondary);
    }
    .urgency-skeleton {
      display: grid;
      gap: var(--space-3);
    }
    .urgency-skeleton gr-skeleton {
      height: 4.5rem;
      border-radius: var(--radius-lg);
    }
    .urgency-skeleton .hero-skeleton {
      height: 8.5rem;
      border-radius: var(--radius-xl);
    }
    @media (max-width: 64rem) {
      .urgency-groups {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Foco da operação — prioritization, urgency, immediate action.
 * Renders one featured event plus up to URGENCY_SECONDARY_LIMIT distinct
 * secondary events. Calendar/day-by-day lives in the Agenda; the remaining
 * queue lives in Atenção operacional (see HomeActionsComponent, which filters
 * this board's promoted ids out of its preview without touching the store).
 */
export class OperationalUrgencyBoardComponent {
  readonly expandedId = signal<string | null>(null);

  constructor(readonly store: DashboardStore) {
    effect(() => {
      const valid = new Set<string>();
      for (const item of this.pool()) valid.add(item.id);
      if (this.plannerOverdue() > 0) valid.add('planner-overdue');
      const current = this.expandedId();
      if (current && !valid.has(current)) this.expandedId.set(null);
    });
  }

  readonly boardState = computed<'loading' | 'error' | 'ready'>(() => {
    const attention = this.store.attention().status;
    const agenda = this.store.agenda().status;
    if (attention === 'error' && agenda === 'error') return 'error';
    if (attention === 'ready' || agenda === 'ready') return 'ready';
    return 'loading';
  });

  readonly isPartial = computed<boolean>(
    () =>
      this.boardState() === 'ready' &&
      (this.store.attention().status === 'error' || this.store.agenda().status === 'error'),
  );

  private readonly pool = computed<OperationalUrgency[]>(() =>
    buildOperationalUrgencies({
      attention: this.store.attention().value?.preview ?? [],
      agenda: this.store.agenda().value?.items ?? [],
      referenceDate: this.store.attention().value?.referenceDate ?? null,
    }),
  );

  readonly spotlight = computed(() => {
    const pool = this.pool();
    const [top] = pool;
    if (top && URGENCY_LEVEL_RANK[top.level] <= URGENCY_LEVEL_RANK.imminent) {
      return selectUrgencySpotlight(pool, URGENCY_SECONDARY_LIMIT);
    }
    return { featured: null as OperationalUrgency | null, secondary: pool.slice(0, URGENCY_SECONDARY_LIMIT + 1) };
  });

  readonly hero = computed<OperationalUrgency | null>(() => this.spotlight().featured);

  readonly secondaryItems = computed<OperationalUrgency[]>(() => this.spotlight().secondary);

  /** Stable ids promoted to Foco; used to filter the Atenção preview. */
  readonly promotedIds = computed<ReadonlySet<string>>(() => {
    const ids = new Set<string>();
    const top = this.hero();
    if (top) ids.add(top.id);
    for (const item of this.secondaryItems()) ids.add(item.id);
    return ids;
  });

  readonly plannerOverdue = computed<number>(
    () => this.store.attention().value?.summary?.plannerOverdue ?? 0,
  );

  readonly isCalm = computed<boolean>(
    () =>
      this.pool().length === 0 &&
      this.plannerOverdue() === 0 &&
      this.store.attention().status !== 'error' &&
      this.store.agenda().status !== 'error',
  );

  retryBoth(): void {
    this.store.retry('attention');
    this.store.retry('agenda');
  }

  toggleUrgency(id: string): void {
    this.expandedId.update(current => (current === id ? null : id));
  }

  heroFacts(item: OperationalUrgency): UrgencyDetailFact[] {
    return this.detailFacts(item);
  }

  secondaryFacts(item: OperationalUrgency): UrgencyDetailFact[] {
    return this.detailFacts(item);
  }

  /**
   * Expanded content adds only context not already visible collapsed
   * (collapsed already shows domain, title, entity, urgency badge, date).
   */
  private detailFacts(item: OperationalUrgency): UrgencyDetailFact[] {
    const facts: UrgencyDetailFact[] = [{ label: 'Data prevista', value: this.formatIsoDateBr(item.date) }];
    if (!overdueSignalLabel(item.daysUntil)) {
      facts.push({ label: 'Prazo', value: this.temporalLabel(item) });
    }
    if (item.status) facts.push({ label: 'Situação', value: this.statusLabelOf(item.status) });
    facts.push({ label: 'Origem', value: this.sourceLabel(item.source) });
    return facts;
  }

  urgencyCta(domain: UrgencyDomain | 'other'): { route: string; label: string } {
    if (domain === 'reproduction') return { route: '/rebanho/reproducao', label: 'Ver reprodução' };
    if (domain === 'health') return { route: '/rebanho/saude', label: 'Abrir sanidade' };
    if (domain === 'movement') return { route: '/rebanho/movimentacoes', label: 'Ver movimentação' };
    return { route: '/rebanho/agenda', label: 'Ver agenda' };
  }

  temporalLabel(item: OperationalUrgency): string {
    return formatUrgencyLabel(item.daysUntil) ?? this.formatIsoDateBr(item.date);
  }

  domainEyebrow(item: OperationalUrgency): string {
    return urgencyDomainEyebrow(item.domain === 'traceability' ? 'other' : item.domain);
  }

  /** Collapsed urgency signal: overdue countdown wins, otherwise temporal label, otherwise backend status. */
  urgencyBadge(item: OperationalUrgency): string {
    return overdueSignalLabel(item.daysUntil) ?? this.temporalLabel(item) ?? (item.status ? this.statusLabelOf(item.status) : '');
  }

  urgencyBadgeTone(item: OperationalUrgency): 'danger' | 'attention' | 'success' | 'neutral' {
    if (item.daysUntil < 0) return 'danger';
    return this.statusToneOf(item.status);
  }

  sourceLabel(source: OperationalUrgency['source']): string {
    return source === 'MANUAL' ? 'Planejado' : 'Identificado pelos dados';
  }

  formatIsoDateBr(value: string): string {
    if (!value) return '—';
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('pt-BR').format(value);
  }

  domainIconOf = domainIconOf;
  pluralizePt(count: number, one: string, many: string): string {
    return pluralizePtFn(count, one, many);
  }

  statusToneOf(status: string | null): 'danger' | 'attention' | 'success' | 'neutral' {
    if (status === 'OVERDUE') return 'danger';
    if (status === 'OPEN') return 'attention';
    if (status === 'COMPLETED') return 'success';
    return 'neutral';
  }

  statusLabelOf(status: string): string {
    return (
      {
        OPEN: 'Aberta',
        OVERDUE: 'Atrasada',
        COMPLETED: 'Concluída',
        CANCELLED: 'Cancelada',
      } as Record<string, string>
    )[status] ?? status.toLocaleLowerCase('pt-BR');
  }
}
