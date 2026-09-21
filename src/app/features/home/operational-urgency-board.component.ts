import { ChangeDetectionStrategy, Component, computed, effect, signal } from '@angular/core';
import { ErrorStateComponent, SkeletonComponent } from '../../design-system/feedback/feedback';
import { DashboardStore } from './dashboard.store';
import {
  URGENCY_LEVEL_RANK,
  buildOperationalUrgencies,
  domainIconOf,
  formatUrgencyLabel,
  groupUrgenciesByDomain,
  pluralizePt,
  urgencyHorizonLabel,
  type OperationalUrgency,
  type UrgencyDetailFact,
  type UrgencyDomain,
  type UrgencyDomainGroup,
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
          [eyebrow]="urgencyHorizonLabel(top.level)"
          [headline]="countdownLabel(top)"
          [title]="top.title"
          [context]="top.context"
          [date]="top.date"
          [dateLabel]="formatIsoDateBr(top.date)"
          [badgeText]="top.status ? statusLabelOf(top.status) : ''"
          [badgeTone]="statusToneOf(top.status)"
          [facts]="heroFacts(top)"
          [items]="[]"
          [ctaRoute]="urgencyCta(top.domain).route"
          [ctaLabel]="urgencyCta(top.domain).label"
          [expanded]="expandedId() === top.id"
          (toggled)="toggleUrgency(top.id)"
        />
      }
      <div class="urgency-groups">
        @for (group of urgencyGroups(); track group.domain) {
          <app-urgency-object
            variant="group"
            [objectId]="'group:' + group.domain"
            [level]="group.items[0].level"
            [icon]="domainIconOf(group.domain)"
            iconSize="md"
            [eyebrow]="group.title"
            [headline]="group.items.length + ' ' + groupNoun(group)"
            [title]="nearestLabel(group)"
            [context]="''"
            [date]="group.items[0].date"
            [dateLabel]="formatIsoDateBr(group.items[0].date)"
            [badgeText]="''"
            [badgeTone]="'neutral'"
            [facts]="[]"
            [items]="groupMemberRows(group)"
            [ctaRoute]="urgencyCta(group.domain).route"
            [ctaLabel]="urgencyCta(group.domain).label"
            [expanded]="expandedId() === 'group:' + group.domain"
            (toggled)="toggleUrgency('group:' + group.domain)"
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
export class OperationalUrgencyBoardComponent {
  readonly expandedId = signal<string | null>(null);

  constructor(readonly store: DashboardStore) {
    effect(() => {
      const valid = new Set<string>();
      for (const item of this.pool()) valid.add(item.id);
      for (const group of this.urgencyGroups()) valid.add(`group:${group.domain}`);
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

  readonly hero = computed<OperationalUrgency | null>(() => {
    const [top] = this.pool();
    return top && URGENCY_LEVEL_RANK[top.level] <= URGENCY_LEVEL_RANK.imminent ? top : null;
  });

  readonly urgencyGroups = computed<UrgencyDomainGroup[]>(() => {
    const [top] = this.pool();
    const rest = top && URGENCY_LEVEL_RANK[top.level] <= URGENCY_LEVEL_RANK.imminent ? this.pool().slice(1) : this.pool();
    return groupUrgenciesByDomain(rest).slice(0, 3);
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
    const facts: UrgencyDetailFact[] = [];
    if (item.context) facts.push({ label: 'Entidade', value: item.context });
    facts.push({ label: 'Previsão', value: this.formatIsoDateBr(item.date) });
    facts.push({ label: 'Prazo', value: this.countdownLabel(item) });
    if (item.status) facts.push({ label: 'Situação', value: this.statusLabelOf(item.status) });
    return facts;
  }

  groupMemberRows(group: UrgencyDomainGroup): { id: string; title: string; context: string; date: string; dateLabel: string }[] {
    return group.items.map(item => ({
      id: item.id,
      title: item.title,
      context: item.context,
      date: item.date,
      dateLabel: this.formatIsoDateBr(item.date),
    }));
  }

  urgencyCta(domain: UrgencyDomain | 'other'): { route: string; label: string } {
    if (domain === 'reproduction') return { route: '/rebanho/reproducao', label: 'Ver reprodução' };
    if (domain === 'health') return { route: '/rebanho/saude', label: 'Abrir sanidade' };
    if (domain === 'movement') return { route: '/rebanho/movimentacoes', label: 'Ver movimentação' };
    return { route: '/rebanho/agenda', label: 'Ver agenda' };
  }

  countdownLabel(item: OperationalUrgency): string {
    return formatUrgencyLabel(item.daysUntil) ?? this.formatIsoDateBr(item.date);
  }

  nearestLabel(group: UrgencyDomainGroup): string {
    const [nearest] = group.items;
    return formatUrgencyLabel(nearest.daysUntil) ?? this.formatIsoDateBr(nearest.date);
  }

  groupNoun(group: UrgencyDomainGroup): string {
    if (group.domain === 'reproduction' && group.items.every(item => item.kind === 'CALVING')) {
      return pluralizePt(group.items.length, 'parto previsto', 'partos previstos');
    }
    return pluralizePt(group.items.length, 'pendência', 'pendências');
  }

  urgencyHorizonLabel = urgencyHorizonLabel;
  pluralizePt = pluralizePt;
  domainIconOf = domainIconOf;

  formatIsoDateBr(value: string): string {
    if (!value) return '—';
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('pt-BR').format(value);
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
