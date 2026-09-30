import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContextStore } from '../../core/context/context.store';
import { PaginationComponent, TableComponent } from '../../design-system/data-display/data-display';
import { EmptyStateComponent, ErrorStateComponent } from '../../design-system/feedback/feedback';
import {
  ContextRequestScope,
  managementError,
  managementTimestamp,
} from '../management/management.shared';
import { ExactDecimalPipe } from '../management/exact-decimal';
import { HerdApi } from './herd-api.service';
import { Animal } from './herd.models';
import {
  HealthTreatment,
  PregnancyPage,
  WeightPage,
  healthLabels,
  procedureLabels,
  pregnancyLabels,
  serviceLabels,
} from './herd-operations.models';
import { CountedPage } from './parity.models';
import { formatDate } from './herd.shared';

type HistoryTab = 'weights' | 'health' | 'pregnancies' | 'calves';
@Component({
  selector: 'app-animal-operational-history',
  imports: [
    RouterLink,
    PaginationComponent,
    TableComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    ExactDecimalPipe,
  ],
  template: `<section class="section-frame operational-history">
    <header>
      <div>
        <span class="section-kicker">REGISTROS DO ANIMAL</span>
        <h2>
          {{ navigationMode() === 'all' ? 'Históricos e vínculos' : tabLabel() + ' do animal' }}
        </h2>
      </div>
    </header>
    @if (navigationMode() !== 'none') {
      <nav class="history-tabs" aria-label="Históricos do animal">
        @for (option of tabs(); track option.id) {
          <button
            type="button"
            class="secondary-action"
            [class.active]="tab() === option.id"
            [attr.aria-pressed]="tab() === option.id"
            (click)="selectTab(option.id)"
          >
            {{ option.label }}
          </button>
        }
      </nav>
    }
    @if (error()) {
      <gr-error-state
        [title]="'Não foi possível carregar ' + tabLabel().toLowerCase()"
        [description]="error()"
        (retry)="load(true)"
      />
    } @else if (!loading() && !itemCount()) {
      <gr-empty-state
        [title]="'Nenhum registro em ' + tabLabel().toLowerCase()"
        description="Os registros disponíveis nesta fazenda aparecerão aqui."
      />
    } @else {
      @if (tab() === 'weights') {
        <gr-table [loading]="loading()"
          ><thead>
            <tr>
              <th>Data da pesagem</th>
              <th>Peso (kg)</th>
              <th>Observações</th>
              <th>Registrada em</th>
            </tr>
          </thead>
          <tbody>
            @for (item of weights()?.items || []; track item.id) {
              <tr>
                <td>{{ date(item.measuredOn) }}</td>
                <td>{{ item.weightKg | grDecimal }}</td>
                <td>{{ item.notes || 'Sem observações' }}</td>
                <td>{{ timestamp(item.recordedAt) }}</td>
              </tr>
            }
          </tbody></gr-table
        >
      } @else if (tab() === 'health') {
        <gr-table [loading]="loading()"
          ><thead>
            <tr>
              <th>Data</th>
              <th>Tratamento</th>
              <th>Produto e protocolo</th>
              <th>Próxima aplicação</th>
              <th>Observações</th>
            </tr>
          </thead>
          <tbody>
            @for (item of health()?.items || []; track item.id) {
              <tr>
                <td>{{ date(item.occurredOn) }}</td>
                <td>
                  {{ treatmentLabel(item) }}
                  @if (item.procedureCode) {
                    <small>{{ procedureLabels[item.procedureCode] }}</small>
                  }
                </td>
                <td>
                  {{ item.product || 'Não informado'
                  }}<small>{{ item.protocol || 'Sem protocolo informado' }}</small>
                </td>
                <td>{{ date(item.nextDueOn) }}</td>
                <td>{{ item.notes || 'Sem observações' }}</td>
              </tr>
            }
          </tbody></gr-table
        >
      } @else if (tab() === 'pregnancies') {
        <gr-table [loading]="loading()"
          ><thead>
            <tr>
              <th>Serviço</th>
              <th>Data</th>
              <th>Reprodutor</th>
              <th>Gestação</th>
              <th>Previsão de parto</th>
              <th>Desfecho</th>
            </tr>
          </thead>
          <tbody>
            @for (item of pregnancies()?.items || []; track item.id) {
              <tr>
                <td>{{ serviceLabels[item.serviceType] }}</td>
                <td>{{ date(item.serviceOn) }}</td>
                <td>{{ item.sireReference || 'Não informado' }}</td>
                <td>
                  {{ pregnancyLabels[item.status]
                  }}<small>{{
                    item.confirmedOn
                      ? 'Confirmada em ' + date(item.confirmedOn)
                      : 'Sem confirmação registrada'
                  }}</small>
                </td>
                <td>{{ date(item.expectedCalvingOn) }}</td>
                <td>
                  {{ date(item.endedOn) }}
                  @if (item.terminationReason) {
                    <small>{{ terminationLabels[item.terminationReason] }}</small>
                  }
                  @if (item.calfAnimalId) {
                    <a [routerLink]="['/rebanho/animais', item.calfAnimalId]"
                      >Ver cria registrada</a
                    >
                  }
                </td>
              </tr>
            }
          </tbody></gr-table
        >
      } @else {
        <gr-table [loading]="loading()"
          ><thead>
            <tr>
              <th>Cria</th>
              <th>Sexo</th>
              <th>Nascimento</th>
              <th>Perfil</th>
            </tr>
          </thead>
          <tbody>
            @for (item of calves(); track item.id) {
              <tr>
                <td>
                  <strong>{{ item.identification }}</strong
                  ><small>{{ item.name || 'Sem nome informado' }}</small>
                </td>
                <td>{{ item.sex === 'FEMALE' ? 'Fêmea' : 'Macho' }}</td>
                <td>{{ date(item.birthDate) }}</td>
                <td><a [routerLink]="['/rebanho/animais', item.id]">Ver perfil</a></td>
              </tr>
            }
          </tbody></gr-table
        >
      }
    }
    @if (!loading() && !error()) {
      @if (tab() === 'calves') {
        <div class="calves-pagination">
          <span
            >Página {{ page() + 1 }} · {{ calves().length }}
            {{ calves().length === 1 ? 'cria nesta página' : 'crias nesta página' }}</span
          ><button
            class="quiet-button"
            type="button"
            [disabled]="page() === 0"
            (click)="changePage(page() - 1)"
          >
            Anterior</button
          ><button
            class="quiet-button"
            type="button"
            [disabled]="calves().length < 20"
            (click)="changePage(page() + 1)"
          >
            Próxima
          </button>
        </div>
      } @else {
        <gr-pagination
          [page]="page()"
          [totalPages]="totalPages()"
          (pageChange)="changePage($event)"
        />
      }
    }
  </section>`,
  styleUrl: './animal-operational-history.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnimalOperationalHistoryComponent {
  readonly animal = input.required<Animal>();
  readonly activeTab = input<HistoryTab | null>('weights');
  readonly navigationMode = input<'all' | 'reproduction' | 'none'>('all');
  readonly context = inject(ContextStore);
  private readonly api = inject(HerdApi);
  private readonly scope = new ContextRequestScope(inject(DestroyRef));
  readonly tab = signal<HistoryTab>('weights');
  readonly page = signal(0);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly weights = signal<WeightPage | null>(null);
  readonly health = signal<CountedPage<HealthTreatment> | null>(null);
  readonly pregnancies = signal<PregnancyPage | null>(null);
  readonly calves = signal<Animal[]>([]);
  private readonly cache = new Map<string, unknown>();
  date = formatDate;
  timestamp = managementTimestamp;
  procedureLabels = procedureLabels;
  pregnancyLabels = pregnancyLabels;
  serviceLabels = serviceLabels;
  terminationLabels = {
    NOT_PREGNANT: 'Não gestante',
    PREGNANCY_LOSS: 'Perda gestacional',
    ABORTION: 'Aborto',
    OTHER: 'Outro motivo',
  };
  constructor() {
    effect(() => {
      this.animal();
      this.context.contextVersion();
      const pending = this.context.transitionPending();
      untracked(() => {
        this.scope.reset();
        this.cache.clear();
        this.tab.set('weights');
        this.page.set(0);
        this.clear();
        if (!pending && this.context.selectedFarm() && this.activeTab()) {
          this.tab.set(this.activeTab()!);
          this.load();
        }
      });
    });
    let initialTab = true;
    effect(() => {
      const active = this.activeTab();
      if (initialTab) {
        initialTab = false;
        return;
      }
      untracked(() => {
        if (active && !this.context.transitionPending()) {
          this.tab.set(active);
          this.page.set(0);
          this.load();
        }
      });
    });
  }
  tabs(): { id: HistoryTab; label: string }[] {
    const available: { id: HistoryTab; label: string }[] = [
      { id: 'weights', label: 'Pesagens' },
      { id: 'health', label: 'Saúde' },
      ...(this.animal().sex === 'FEMALE'
        ? [
            { id: 'pregnancies' as const, label: 'Gestações' },
            { id: 'calves' as const, label: 'Crias' },
          ]
        : []),
    ];
    return this.navigationMode() === 'reproduction'
      ? available.filter((item) => item.id === 'pregnancies' || item.id === 'calves')
      : available;
  }
  tabLabel() {
    return this.tabs().find((item) => item.id === this.tab())?.label || 'Registros';
  }
  selectTab(tab: HistoryTab) {
    if (!this.tabs().some((item) => item.id === tab) || this.context.transitionPending()) return;
    this.tab.set(tab);
    this.page.set(0);
    this.load();
  }
  changePage(page: number) {
    if (page < 0 || this.loading() || this.context.transitionPending()) return;
    this.page.set(page);
    this.load();
  }
  private clear() {
    this.weights.set(null);
    this.health.set(null);
    this.pregnancies.set(null);
    this.calves.set([]);
    this.error.set('');
    this.loading.set(true);
  }
  itemCount() {
    return this.tab() === 'weights'
      ? this.weights()?.items.length || 0
      : this.tab() === 'health'
        ? this.health()?.items.length || 0
        : this.tab() === 'pregnancies'
          ? this.pregnancies()?.items.length || 0
          : this.calves().length;
  }
  totalPages() {
    const data =
      this.tab() === 'weights'
        ? this.weights()
        : this.tab() === 'health'
          ? this.health()
          : this.pregnancies();
    return data ? Math.ceil(data.totalElements / data.size) : 0;
  }
  treatmentLabel(item: HealthTreatment) {
    const type = item.treatmentType || item.type;
    return type ? healthLabels[type] : 'Tratamento registrado';
  }
  load(force = false) {
    if (this.context.transitionPending() || !this.context.selectedFarm()) return;
    this.scope.reset();
    this.clear();
    const id = this.animal().id,
      page = this.page();
    const key = `${this.tab()}:${page}`;
    if (!force && this.cache.has(key)) {
      this.applyResult(this.cache.get(key));
      return;
    }
    const fail = (failure: unknown) => {
      this.loading.set(false);
      this.error.set(
        managementError(failure, 'Não foi possível carregar os registros. Tente novamente.'),
      );
    };
    if (this.tab() === 'weights')
      this.scope.run(
        this.api.weights(id, page),
        (value) => {
          this.cache.set(key, value);
          this.applyResult(value);
        },
        fail,
      );
    else if (this.tab() === 'health')
      this.scope.run(
        this.api.treatments(id, page),
        (value) => {
          this.cache.set(key, value);
          this.applyResult(value);
        },
        fail,
      );
    else if (this.tab() === 'pregnancies')
      this.scope.run(
        this.api.pregnancies(id, page),
        (value) => {
          this.cache.set(key, value);
          this.applyResult(value);
        },
        fail,
      );
    else
      this.scope.run(
        this.api.calves(id, page, 20),
        (value) => {
          this.cache.set(key, value);
          this.applyResult(value);
        },
        fail,
      );
  }
  private applyResult(value: unknown) {
    if (this.tab() === 'weights') this.weights.set(value as WeightPage);
    else if (this.tab() === 'health') this.health.set(value as CountedPage<HealthTreatment>);
    else if (this.tab() === 'pregnancies') this.pregnancies.set(value as PregnancyPage);
    else this.calves.set(value as Animal[]);
    this.loading.set(false);
  }
}
