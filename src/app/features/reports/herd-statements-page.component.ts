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
import { RouterLink } from '@angular/router';
import { ContextRequestScope } from '../management/management.shared';
import { Observable } from 'rxjs';
import { AppError } from '../../core/api/api.models';
import { ContextStore } from '../../core/context/context.store';
import { localDateOnly } from '../../core/date/date-only';
import { ErrorStateComponent, SkeletonComponent } from '../../design-system/feedback/feedback';
import { ParityApi } from '../herd/parity-api.service';
import {
  AgeSexBalance,
  MilkOverview,
  PeriodReconciliation,
  ProcedureCoverage,
  ageBandLabels,
} from '../herd/parity.models';
import { HealthProcedureCode, procedureLabels } from '../herd/herd-operations.models';
import { errorReference, formatDate } from '../herd/herd.shared';
import { validImportDate } from '../herd/herd-import';

type StatementKind = 'current' | 'historical' | 'flows' | 'coverage' | 'milk';
type Statement =
  | { kind: 'current' | 'historical'; data: AgeSexBalance }
  | { kind: 'flows'; data: PeriodReconciliation }
  | { kind: 'coverage'; data: ProcedureCoverage }
  | { kind: 'milk'; data: MilkOverview; referenceDate: string };
@Component({
  selector: 'app-herd-statements-page',
  imports: [FormsModule, RouterLink, ErrorStateComponent, SkeletonComponent],
  template: ` <div class="herd-page operations-page page-enter">
    <a class="back-link" routerLink="/relatorios">← Todos os relatórios</a>
    <header class="page-header">
      <div>
        <span class="eyebrow">QUADROS GERENCIAIS · {{ context.selectedFarm()?.farmName }}</span>
        <h1>Composição e produção</h1>
        <p>Saldos, fluxos e registros que apoiam a gestão da fazenda.</p>
      </div>
    </header>
    <nav class="parity-actions" aria-label="Quadros disponíveis">
      @for (option of options; track option.kind) {
        <button
          class="secondary-action"
          type="button"
          [attr.aria-pressed]="kind === option.kind"
          (click)="switchKind(option.kind)"
        >
          {{ option.label }}
        </button>
      }
    </nav>
    <section class="section-frame parity-section">
      <div class="parity-select">
        @if (kind === 'flows') {
          <label>De<input type="date" [(ngModel)]="from" [max]="today" /></label
          ><label>Até<input type="date" [(ngModel)]="to" [max]="today" /></label>
        } @else {
          <label
            >{{ kind === 'historical' ? 'Posição em' : 'Data de referência'
            }}<input type="date" [(ngModel)]="referenceDate" [max]="today"
          /></label>
        }
        @if (kind === 'coverage') {
          <label
            >Procedimento<select [(ngModel)]="procedure">
              <option value="BRUCELLOSIS">Brucelose</option>
              <option value="FOOT_AND_MOUTH_DISEASE">Aftosa — registro histórico</option>
            </select></label
          >
        }
        <button class="primary-action" type="button" (click)="load()">Consultar quadro</button>
      </div>
      @if (filterError()) {
        <p class="form-error" role="alert">{{ filterError() }}</p>
      }
      <p class="semantic-note">{{ semantics() }}</p>
    </section>
    @if (loading()) {
      <section class="section-frame parity-section" aria-label="Carregando quadro" aria-busy="true">
        <gr-skeleton /><gr-skeleton /><gr-skeleton />
      </section>
    } @else if (error()) {
      <gr-error-state
        title="Não foi possível carregar o quadro"
        [reference]="reference()"
        (retry)="load()"
      />
    } @else {
      @if (balance(); as data) {
        <section class="section-frame parity-section">
          <h2>
            {{ kind === 'historical' ? 'Saldo na referência' : 'Saldo atual' }} ·
            {{ date(data.referenceDate) }}
          </h2>
          <div class="metric-strip">
            <div>
              <span>Animais na posição</span><strong>{{ data.totalActiveAnimals }}</strong>
            </div>
            <div>
              <span>Nascimento desconhecido ou posterior à referência</span
              ><strong>{{ data.unknownBirthDate }}</strong>
            </div>
          </div>
          @if (!data.totalActiveAnimals) {
            <p>Nenhum animal nesta posição para a referência consultada.</p>
          }
          <div class="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Faixa etária</th>
                  <th>Sexo</th>
                  <th>Animais</th>
                </tr>
              </thead>
              <tbody>
                @for (cell of data.cells; track cell.ageBand + cell.sex) {
                  <tr>
                    <td>{{ ageLabels[cell.ageBand] }}</td>
                    <td>{{ cell.sex === 'FEMALE' ? 'Fêmea' : 'Macho' }}</td>
                    <td>{{ cell.count }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }
      @if (flows(); as data) {
        <section class="section-frame parity-section">
          <h2>Fluxos de {{ date(data.from) }} a {{ date(data.to) }}</h2>
          <div class="metric-strip">
            <div>
              <span>Saldo inicial</span><strong>{{ data.balance.openingAnimals }}</strong>
            </div>
            <div>
              <span>Saldo final</span><strong>{{ data.balance.closingAnimals }}</strong>
            </div>
          </div>
          <div class="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Movimento</th>
                  <th>Animais</th>
                </tr>
              </thead>
              <tbody>
                @for (row of flowRows(data); track row.label) {
                  <tr>
                    <td>{{ row.label }}</td>
                    <td>{{ row.value }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          @if (noFlows(data)) {
            <p>
              Nenhum movimento registrado no período. Os saldos representam os eventos disponíveis.
            </p>
          }
        </section>
      }
      @if (coverage(); as data) {
        <section class="section-frame parity-section">
          <h2>{{ procedureLabels[data.procedureCode] }} · {{ date(data.referenceDate) }}</h2>
          <div class="metric-strip">
            <div>
              <span>Ativos atuais</span><strong>{{ data.totalActiveAnimals }}</strong>
            </div>
            <div>
              <span>Com tratamento registrado</span
              ><strong>{{ data.withRecordedTreatment }}</strong>
            </div>
            <div>
              <span>Sem tratamento registrado</span
              ><strong>{{ data.withoutRecordedTreatment }}</strong>
            </div>
            <div>
              <span>Nascimento desconhecido ou posterior</span
              ><strong>{{ data.unknownBirthDate }}</strong>
            </div>
          </div>
          @if (!data.totalActiveAnimals) {
            <p>Nenhum animal ativo disponível para este quadro.</p>
          }
          <div class="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Faixa etária</th>
                  <th>Sexo</th>
                  <th>Com registro</th>
                  <th>Sem registro</th>
                </tr>
              </thead>
              <tbody>
                @for (cell of data.cells; track cell.ageBand + cell.sex) {
                  <tr>
                    <td>{{ ageLabels[cell.ageBand] }}</td>
                    <td>{{ cell.sex === 'FEMALE' ? 'Fêmea' : 'Macho' }}</td>
                    <td>{{ cell.withRecordedTreatment }}</td>
                    <td>{{ cell.withoutRecordedTreatment }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }
      @if (milk(); as data) {
        <section class="section-frame parity-section">
          <h2>Produção de leite · {{ date(milkReference()) }}</h2>
          <div class="metric-strip">
            <div>
              <span>Litros na referência</span><strong>{{ liters(data.litersToday) }}</strong>
            </div>
            <div>
              <span>Fêmeas com registro na referência</span
              ><strong>{{ data.femalesWithRecordToday }}</strong>
            </div>
            <div>
              <span>Média por registro nos últimos 7 dias</span
              ><strong>{{ liters(data.averageLitersPerRecordLast7Days) }}</strong>
            </div>
          </div>
          @if (data.averageLitersPerRecordLast7Days === null) {
            <p>Nenhuma produção registrada nos sete dias até a referência.</p>
          }
          <p>
            Registre a produção e consulte o histórico e os indicadores de cada fêmea no perfil do
            animal.
          </p>
          <a
            class="secondary-action"
            routerLink="/rebanho/animais"
            [queryParams]="{ sex: 'FEMALE' }"
            >Consultar fêmeas</a
          >
        </section>
      }
    }
  </div>`,
  styleUrls: [
    '../herd/herd-page.scss',
    '../herd/operations-page.component.scss',
    '../herd/parity.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HerdStatementsPageComponent {
  readonly context = inject(ContextStore);
  private readonly api = inject(ParityApi);
  private readonly destroy = inject(DestroyRef);
  private readonly scope = new ContextRequestScope(this.destroy);
  readonly options: { kind: StatementKind; label: string }[] = [
    { kind: 'current', label: 'Saldo atual' },
    { kind: 'historical', label: 'Saldo histórico' },
    { kind: 'flows', label: 'Fluxos por período' },
    { kind: 'coverage', label: 'Registros sanitários' },
    { kind: 'milk', label: 'Produção de leite' },
  ];
  readonly result = signal<Statement | null>(null);
  readonly loading = signal(true);
  readonly error = signal<AppError | null>(null);
  readonly filterError = signal('');
  readonly ageLabels = ageBandLabels;
  readonly procedureLabels = procedureLabels;
  today = localDateOnly();
  referenceDate = this.today;
  from = this.today.slice(0, 7) + '-01';
  to = this.today;
  kind: StatementKind = 'current';
  procedure: HealthProcedureCode = 'BRUCELLOSIS';
  date = formatDate;
  constructor() {
    effect(() => {
      this.context.contextVersion();
      const pending = this.context.transitionPending();
      const farm = this.context.selectedFarm();
      untracked(() => {
        this.scope.reset();
        this.result.set(null);
        this.error.set(null);
        this.filterError.set('');
        this.loading.set(true);
        this.today = localDateOnly();
        this.referenceDate = this.today;
        this.from = this.today.slice(0, 7) + '-01';
        this.to = this.today;
        this.kind = 'current';
        this.procedure = 'BRUCELLOSIS';
        if (!pending && farm) this.load();
      });
    });
  }
  switchKind(kind: StatementKind) {
    this.scope.reset();
    this.loading.set(false);
    this.kind = kind;
    this.result.set(null);
    this.load();
  }
  load() {
    if (this.context.transitionPending() || !this.context.selectedFarm()) return;
    const dates = this.kind === 'flows' ? [this.from, this.to] : [this.referenceDate];
    if (
      dates.some((d) => !validImportDate(d) || d > this.today) ||
      (this.kind === 'flows' &&
        (this.from > this.to || (Date.parse(this.to) - Date.parse(this.from)) / 86400000 >= 3650))
    ) {
      this.filterError.set(
        'Use datas válidas até hoje. O período deve ser crescente e ter até 3.650 dias.',
      );
      return;
    }
    this.filterError.set('');
    this.scope.reset();
    this.loading.set(true);
    this.error.set(null);
    switch (this.kind) {
      case 'current':
      case 'historical': {
        const kind = this.kind;
        this.read(this.api.ageSexBalance(this.referenceDate, kind === 'historical'), (data) => ({
          kind,
          data,
        }));
        break;
      }
      case 'flows':
        this.read(this.api.reconciliation(this.from, this.to), (data) => ({ kind: 'flows', data }));
        break;
      case 'coverage':
        this.read(this.api.coverage(this.procedure, this.referenceDate), (data) => ({
          kind: 'coverage',
          data,
        }));
        break;
      case 'milk': {
        const referenceDate = this.referenceDate;
        this.read(this.api.milkOverview(referenceDate), (data) => ({
          kind: 'milk',
          data,
          referenceDate,
        }));
        break;
      }
    }
  }
  private read<T>(request: Observable<T>, map: (value: T) => Statement) {
    this.scope.run(
      request,
      (data) => {
        this.result.set(map(data));
        this.loading.set(false);
      },
      (e) => {
        this.error.set(
          e instanceof AppError
            ? e
            : new AppError(
                'unavailable',
                'Não foi possível consultar o quadro.',
                503,
                'READ_FAILED',
              ),
        );
        this.loading.set(false);
      },
    );
  }
  balance() {
    const result = this.result();
    return result?.kind === 'current' || result?.kind === 'historical' ? result.data : null;
  }
  flows() {
    const result = this.result();
    return result?.kind === 'flows' ? result.data : null;
  }
  coverage() {
    const result = this.result();
    return result?.kind === 'coverage' ? result.data : null;
  }
  milk() {
    const result = this.result();
    return result?.kind === 'milk' ? result.data : null;
  }
  milkReference() {
    const value = this.result();
    return value?.kind === 'milk' ? value.referenceDate : '';
  }
  flowRows(data: PeriodReconciliation) {
    const b = data.balance;
    return [
      { label: 'Entradas por cadastro', value: b.registeredAnimals },
      { label: 'Nascimentos', value: b.births },
      { label: 'Transferências recebidas', value: b.transfersIn },
      { label: 'Vendas', value: b.sales },
      { label: 'Mortes', value: b.deaths },
      { label: 'Transferências enviadas', value: b.transfersOut },
    ];
  }
  noFlows(data: PeriodReconciliation) {
    return this.flowRows(data).every((x) => x.value === 0);
  }
  reference() {
    return errorReference(this.error()?.requestId);
  }
  liters(value: number | null) {
    return value === null
      ? 'Não disponível'
      : `${Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} L`;
  }
  semantics() {
    return (
      {
        current:
          'Estado atual do rebanho. A referência altera apenas a idade; não reconstrói uma posição anterior.',
        historical:
          'Fatos ocorridos até a referência com sexo e nascimento atualmente corrigidos. Não representa o conhecimento disponível naquela data.',
        flows:
          'Entradas e saídas por eventos registrados, com datas de ocorrência inclusivas. Não representa receita financeira ou declaração oficial.',
        coverage:
          'Animais ativos atuais e vacinações efetivas registradas. A referência altera apenas a idade. Ausência de registro não prova ausência de vacinação; presença não comprova imunidade ou conformidade. Aftosa é histórico, sem indicação automática de revacinação.',
        milk: 'Indicadores calculados pelo serviço a partir dos registros, com média por registro nos sete dias até a referência.',
      }[this.kind] + ' Quadro de apoio gerencial, sem declaração ou envio oficial GEDAVE.'
    );
  }
}
