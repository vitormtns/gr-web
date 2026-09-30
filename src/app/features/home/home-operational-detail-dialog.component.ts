import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  effect,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { ContextStore } from '../../core/context/context.store';
import { ErrorStateComponent, SkeletonComponent } from '../../design-system/feedback/feedback';
import { DialogComponent } from '../../design-system/surfaces/surfaces';
import { HerdApi } from '../herd/herd-api.service';
import {
  PendingWorkItem,
  PendingWorkPage,
  PlannerItem,
  Pregnancy,
} from '../herd/herd-operations.models';
import { Animal, Page } from '../herd/herd.models';
import { DashboardStore } from './dashboard.store';
import type { HomeDetailRequest } from './home-detail.models';
import { ActivityChartComponent } from './activity-chart.component';

type DetailData = PendingWorkPage | Page<Animal> | PlannerItem | Pregnancy | null;

@Component({
  selector: 'app-home-operational-detail-dialog',
  imports: [
    RouterLink,
    DialogComponent,
    ErrorStateComponent,
    SkeletonComponent,
    ActivityChartComponent,
  ],
  template: `<gr-dialog [open]="true" size="lg" (closed)="closed.emit()">
    <strong dialog-title>{{ title() }}</strong>
    <div class="detail-body">
      @switch (request().kind) {
        @case ('metric') {
          @if (request().kind === 'metric') {
            @switch (metric()) {
              @case ('herd') {
                @if (store.overview().value; as overview) {
                  <div class="summary">
                    <strong>{{ number(overview.herdSnapshot.activeAnimals) }}</strong
                    ><span>animais ativos</span>
                  </div>
                  <div class="breakdown">
                    <div>
                      <h3>Por sexo</h3>
                      @for (entry of entries(overview.herdSnapshot.bySex); track entry[0]) {
                        <p>
                          {{ domainLabel(entry[0]) }} <b>{{ number(entry[1]) }}</b>
                        </p>
                      }
                    </div>
                    <div>
                      <h3>Por categoria</h3>
                      @for (entry of entries(overview.herdSnapshot.byCategory); track entry[0]) {
                        <p>
                          {{ domainLabel(entry[0]) }} <b>{{ number(entry[1]) }}</b>
                        </p>
                      }
                    </div>
                  </div>
                  <a routerLink="/rebanho/animais" [queryParams]="{ status: 'ACTIVE' }"
                    >Ver rebanho completo →</a
                  >
                }
              }
              @case ('territory') {
                <div class="summary">
                  <strong>{{ number(store.paddocks().value?.length ?? 0) }}</strong
                  ><span>piquetes</span>
                </div>
                <ul>
                  @for (item of store.paddocks().value ?? []; track item.id) {
                    <li>
                      <strong>{{ item.name }}</strong
                      ><span>{{ item.occupancy }} animais</span>
                    </li>
                  }
                </ul>
                <a routerLink="/rebanho/piquetes">Ver território →</a>
              }
              @case ('location') {
                @if (store.overview().value; as overview) {
                  <div class="summary">
                    <strong>{{ number(overview.herdSnapshot.unlocatedAnimals) }}</strong
                    ><span>animais sem piquete</span>
                  </div>
                }
                @if (loadStatus() === 'ready') {
                  <ul>
                    @for (animal of animalItems(); track animal.id) {
                      <li>
                        <a [routerLink]="['/rebanho/animais', animal.id]"
                          >{{ animal.identification }} · {{ animal.name || 'Sem nome' }}</a
                        >
                      </li>
                    }
                  </ul>
                }
                <a
                  routerLink="/rebanho/animais"
                  [queryParams]="{ status: 'ACTIVE', unlocated: 'true' }"
                  >Consultar animais →</a
                >
              }
              @case ('attention') {
                @if (store.overview().value; as overview) {
                  <ul class="attention-list">
                    <li>
                      Vacinação <b>{{ number(overview.attention.vaccinationDue) }}</b>
                    </li>
                    <li>
                      Vermifugação <b>{{ number(overview.attention.dewormingDue) }}</b>
                    </li>
                    <li>
                      Pesagem <b>{{ number(overview.attention.weighingDue) }}</b>
                    </li>
                    <li>
                      Partos próximos <b>{{ number(overview.attention.calvingUpcoming) }}</b>
                    </li>
                    <li>
                      Partos atrasados <b>{{ number(overview.attention.calvingOverdue) }}</b>
                    </li>
                    <li>
                      Planejamento aberto <b>{{ number(overview.attention.openPlannerItems) }}</b>
                    </li>
                    <li>
                      Brucelose na janela <b>{{ number(overview.attention.brucellosisDue) }}</b>
                    </li>
                    <li>
                      Janela de brucelose perdida
                      <b>{{ number(overview.attention.brucellosisWindowMissed) }}</b>
                    </li>
                  </ul>
                }
                <a routerLink="/rebanho/agenda">Ver agenda completa →</a>
              }
            }
          }
        }
        @case ('pending') {
          <p class="guidance">
            {{
              pendingType() === 'BRUCELLOSIS_WINDOW_MISSED'
                ? 'Janela primária perdida. Consulte o fluxo de regularização aplicável.'
                : 'Confira os animais e os prazos identificados.'
            }}
          </p>
          @if (loadStatus() === 'ready') {
            <p>{{ total() }} registros encontrados</p>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Animal</th>
                    <th>Identificação</th>
                    <th>Prazo</th>
                    <th>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of pendingItems(); track item.animalId) {
                    <tr>
                      <td>
                        <a [routerLink]="['/rebanho/animais', item.animalId]">{{
                          item.name || 'Sem nome'
                        }}</a>
                      </td>
                      <td>{{ item.identification }}</td>
                      <td>{{ date(item.dueOn || item.expectedOn) }}</td>
                      <td>
                        {{
                          item.daysOverdue ? 'Atraso de ' + item.daysOverdue + ' dias' : 'Pendente'
                        }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            @if (hasNext()) {
              <button type="button" class="secondary" (click)="nextPage()">Carregar mais</button>
            }
          }
          <a
            routerLink="/rebanho/agenda"
            [queryParams]="{ tab: 'pending', pendingType: pendingType() }"
            >Abrir pendências na agenda →</a
          >
        }
        @case ('urgency') {
          @if (urgencyItem(); as item) {
            <div class="summary">
              <strong>{{ item.title }}</strong
              ><span>{{ item.context }}</span>
            </div>
            <dl>
              <div>
                <dt>Data operacional</dt>
                <dd>{{ date(item.date) }}</dd>
              </div>
              <div>
                <dt>Origem</dt>
                <dd>{{ item.source === 'MANUAL' ? 'Planejado' : 'Identificado pelos dados' }}</dd>
              </div>
            </dl>
            @if (loadStatus() === 'ready') {
              @if (pendingItems().length) {
                <p>{{ total() }} pendências deste tipo</p>
                <ul>
                  @for (pending of pendingItems(); track pending.animalId) {
                    <li>{{ pending.identification }} · {{ pending.name || 'Sem nome' }}</li>
                  }
                </ul>
              }
              @if (plannerItem(); as planner) {
                <p>{{ planner.notes || 'Sem observações adicionais.' }}</p>
                <p>Situação: {{ domainLabel(planner.status) }}</p>
              }
              @if (pregnancy(); as pregnancyDetail) {
                <p>Parto previsto: {{ date(pregnancyDetail.expectedCalvingOn) }}</p>
                <p>Situação: {{ domainLabel(pregnancyDetail.status) }}</p>
              }
            }
            @if (item.animalId) {
              <a [routerLink]="['/rebanho/animais', item.animalId]">Ver perfil do animal →</a>
            } @else {
              <a routerLink="/rebanho/agenda">Abrir agenda completa →</a>
            }
          }
        }
        @case ('agenda-day') {
          <div class="summary">
            <strong>{{ date(selectedDate()) }}</strong
            ><span>{{ agendaItems(selectedDate()).length }} atividades</span>
          </div>
          <ul>
            @for (item of agendaItems(selectedDate()); track item.stableId) {
              <li>
                <strong>{{ item.summary }}</strong
                ><span>{{
                  item.identification ||
                    item.name ||
                    (item.source === 'MANUAL' ? 'Planejado' : 'Identificado pelos dados')
                }}</span>
              </li>
            } @empty {
              <li>Nenhuma atividade neste dia.</li>
            }
          </ul>
          <a
            routerLink="/rebanho/agenda"
            [queryParams]="{ from: selectedDate(), to: selectedDate() }"
            >Abrir agenda completa →</a
          >
        }
        @case ('activity') {
          @if (store.activity().value; as activity) {
            <div class="summary">
              <strong>{{ activityTotal() }}</strong
              ><span
                >no período de {{ date(activity.period.from) }} a
                {{ date(activity.period.to) }}</span
              >
            </div>
            <app-activity-chart [buckets]="activity.series" /><a
              routerLink="/relatorios"
              [queryParams]="reportParams()"
              >Abrir relatório →</a
            >
          }
        }
      }
      @if (loadStatus() === 'loading') {
        <gr-skeleton />
      }
      @if (loadStatus() === 'error') {
        <gr-error-state title="Não foi possível carregar os detalhes" (retry)="load()" />
      }
    </div>
  </gr-dialog>`,
  styles: [
    `
      :host {
        display: contents;
      }
      .detail-body {
        display: grid;
        gap: 0.85rem;
        color: #183238;
      }
      .summary {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 0.5rem;
        padding: 1rem 1.15rem;
        border-radius: 0.7rem;
        border: 1px solid #d9ebe1;
        background: linear-gradient(110deg, #edf7f2, #f7fbf9);
      }
      .summary strong {
        font-family: var(--font-display);
        font-size: 1.4rem;
      }
      .summary span {
        font-size: 0.8rem;
        color: #506771;
      }
      .breakdown {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }
      .breakdown > div {
        padding: 0.7rem 0.8rem;
        border: 1px solid #e4eee9;
        border-radius: 0.65rem;
        background: #fbfdfc;
      }
      h3 {
        font-size: 0.85rem;
        margin: 0.2rem 0;
      }
      .breakdown p,
      li,
      .attention-list li {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        margin: 0.25rem 0;
        padding: 0.4rem;
        border-bottom: 1px solid #e0eae6;
        font-size: 0.8rem;
      }
      ul {
        list-style: none;
        margin: 0;
        padding: 0;
      }
      li span {
        color: #53676d;
      }
      a {
        color: #076b47;
        font-weight: 700;
        font-size: 0.8rem;
      }
      .detail-body > a {
        justify-self: start;
        display: inline-flex;
        align-items: center;
        min-height: 2.25rem;
        padding: 0.45rem 0.7rem;
        border: 1px solid #b8dec9;
        border-radius: 0.5rem;
        background: #eaf6ef;
        text-decoration: none;
      }
      .detail-body > a:hover,
      .detail-body > a:focus-visible {
        background: #d9f0e3;
        outline: 2px solid #0a7950;
        outline-offset: 2px;
      }
      dl {
        display: flex;
        gap: 2rem;
        font-size: 0.8rem;
      }
      dt {
        color: #60747b;
      }
      dd {
        margin: 0;
        font-weight: 700;
      }
      .guidance {
        margin: 0;
        font-size: 0.82rem;
      }
      .table-wrap {
        overflow-x: auto;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.78rem;
      }
      th,
      td {
        text-align: left;
        padding: 0.55rem;
        border-bottom: 1px solid #dfe9e6;
      }
      th {
        background: #f2f7f5;
      }
      .secondary {
        justify-self: start;
        padding: 0.45rem 0.8rem;
        border: 1px solid #a6cdbb;
        border-radius: 0.5rem;
        background: #fff;
        color: #075e3d;
        cursor: pointer;
      }
      @media (max-width: 36rem) {
        .breakdown {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeOperationalDetailDialogComponent {
  readonly request = input.required<HomeDetailRequest>();
  @Output() closed = new EventEmitter<void>();
  readonly loadStatus = signal<'idle' | 'loading' | 'ready' | 'error'>('idle');
  readonly data = signal<DetailData>(null);
  readonly extraItems = signal<PendingWorkItem[]>([]);
  private page = 0;
  private subscription?: Subscription;
  private pageSubscription?: Subscription;
  private revision = 0;
  constructor(
    readonly store: DashboardStore,
    private readonly api: HerdApi,
    context: ContextStore,
  ) {
    let initialVersion: number | null = null;
    effect(() => {
      const version = context.contextVersion();
      if (initialVersion === null) initialVersion = version;
      else if (version !== initialVersion) {
        this.cancelRequests();
        this.data.set(null);
        this.closed.emit();
      }
    });
    effect((onCleanup) => {
      this.request();
      this.load();
      onCleanup(() => this.cancelRequests());
    });
  }
  private cancelRequests(): void {
    this.revision++;
    this.subscription?.unsubscribe();
    this.pageSubscription?.unsubscribe();
  }
  load(): void {
    this.cancelRequests();
    this.data.set(null);
    this.extraItems.set([]);
    this.page = 0;
    const request = this.request();
    let source: Observable<DetailData> | null = null;
    if (request.kind === 'pending')
      source = this.api.pendingWork({ type: request.pendingType, page: 0 });
    if (request.kind === 'metric' && request.metric === 'location')
      source = this.api.animals({
        search: '',
        sex: '',
        status: 'ACTIVE',
        page: 0,
        size: 20,
        unlocated: true,
      });
    if (request.kind === 'urgency') {
      const item = request.item;
      if (item.pendingWorkType)
        source = this.api.pendingWork({ type: item.pendingWorkType, page: 0 });
      else if (item.plannerItemId) source = this.api.plannerItem(item.plannerItemId);
      else if (item.pregnancyId) source = this.api.pregnancy(item.pregnancyId);
    }
    if (!source) {
      this.loadStatus.set('idle');
      return;
    }
    this.loadStatus.set('loading');
    const revision = this.revision;
    this.subscription = source.subscribe({
      next: (value) => {
        if (this.revision === revision) {
          this.data.set(value);
          this.loadStatus.set('ready');
        }
      },
      error: () => {
        if (this.revision === revision) this.loadStatus.set('error');
      },
    });
  }
  pendingItems(): PendingWorkItem[] {
    const value = this.data();
    return value && 'items' in value && value.items.length && 'dueOn' in value.items[0]
      ? [...(value.items as PendingWorkItem[]), ...this.extraItems()]
      : [];
  }
  animalItems(): Animal[] {
    const value = this.data();
    return value && 'items' in value && value.items.length && 'paddock' in value.items[0]
      ? (value.items as Animal[])
      : [];
  }
  plannerItem(): PlannerItem | null {
    const value = this.data();
    return value && 'scheduledFor' in value ? (value as PlannerItem) : null;
  }
  pregnancy(): Pregnancy | null {
    const value = this.data();
    return value && 'expectedCalvingOn' in value ? (value as Pregnancy) : null;
  }
  total(): number {
    const value = this.data();
    return value && 'totalElements' in value ? value.totalElements : 0;
  }
  hasNext(): boolean {
    const value = this.data();
    return !!value && 'totalPages' in value && this.page + 1 < value.totalPages;
  }
  nextPage(): void {
    const req = this.request();
    if (req.kind !== 'pending' || (this.pageSubscription && !this.pageSubscription.closed)) return;
    const pageNumber = this.page + 1;
    const revision = this.revision;
    this.pageSubscription = this.api
      .pendingWork({ type: req.pendingType, page: pageNumber })
      .subscribe({
        next: (page) => {
          if (this.revision === revision) {
            this.page = pageNumber;
            this.extraItems.update((items) => [...items, ...page.items]);
          }
        },
        error: () => {
          if (this.revision === revision) this.loadStatus.set('error');
        },
      });
  }
  agendaItems(date: string) {
    return (this.store.agenda().value?.items ?? []).filter((item) => item.operationalDate === date);
  }
  title(): string {
    const req = this.request();
    if (req.kind === 'metric')
      return {
        herd: 'Rebanho',
        territory: 'Território',
        location: 'Localização',
        attention: 'Atenção',
      }[req.metric];
    if (req.kind === 'pending') return req.title;
    if (req.kind === 'urgency') return req.item.title;
    if (req.kind === 'agenda-day') return 'Agenda do dia';
    return {
      movements: 'Movimentações',
      weights: 'Pesagens',
      treatments: 'Tratamentos',
      breedings: 'Reprodução',
      calvings: 'Partos',
      births: 'Nascimentos',
    }[req.activity];
  }
  entries(record: Record<string, number>): [string, number][] {
    return Object.entries(record);
  }
  domainLabel(value: string): string {
    return (
      {
        MALE: 'Macho',
        FEMALE: 'Fêmea',
        UNCLASSIFIED: 'Sem classificação',
        CALF: 'Bezerro',
        HEIFER: 'Novilha',
        COW: 'Vaca',
        BULL: 'Touro',
        STEER: 'Boi',
        OPEN: 'Aberta',
        COMPLETED: 'Concluída',
        CANCELLED: 'Cancelada',
        POSSIBLE: 'Em acompanhamento',
        CONFIRMED: 'Confirmada',
        CALVED: 'Parto realizado',
        TERMINATED: 'Encerrada',
      }[value as 'MALE'] ?? value.toLocaleLowerCase('pt-BR').replaceAll('_', ' ')
    );
  }
  number(value: number): string {
    return new Intl.NumberFormat('pt-BR').format(value);
  }
  date(value: string | null | undefined): string {
    if (!value) return '—';
    const [y, m, d] = value.split('-');
    return `${d}/${m}/${y}`;
  }
  metric() {
    const req = this.request();
    return req.kind === 'metric' ? req.metric : null;
  }
  pendingType() {
    const req = this.request();
    return req.kind === 'pending' ? req.pendingType : null;
  }
  urgencyItem() {
    const req = this.request();
    return req.kind === 'urgency' ? req.item : null;
  }
  selectedDate() {
    const req = this.request();
    return req.kind === 'agenda-day' ? req.date : '';
  }
  activityTotal(): string {
    const req = this.request();
    const totals = this.store.activity().value?.totals;
    if (req.kind !== 'activity' || !totals) return '0';
    return this.number(
      {
        movements: totals.movements,
        weights: totals.weightMeasurements,
        treatments: totals.vaccinations + totals.dewormings,
        breedings: totals.breedings,
        calvings: totals.calvings,
        births: totals.births,
      }[req.activity],
    );
  }
  reportParams(): Record<string, string> {
    const req = this.request();
    const period = this.store.activity().value?.period;
    const report =
      req.kind === 'activity'
        ? {
            movements: 'movements',
            weights: 'weights',
            treatments: 'health',
            breedings: 'reproduction',
            calvings: 'reproduction',
            births: 'lifecycle',
          }[req.activity]
        : 'movements';
    return {
      report,
      from: period?.from ?? '',
      to: period?.to ?? '',
      ...(req.kind === 'activity' && req.activity === 'births' ? { event: 'BORN' } : {}),
    };
  }
}
