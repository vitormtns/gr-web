import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  effect,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ContextStore } from '../../core/context/context.store';
import { ErrorStateComponent, SkeletonComponent } from '../../design-system/feedback/feedback';
import { ParityApi } from '../herd/parity-api.service';
import { ProcedureCoverage } from '../herd/parity.models';
import { DashboardStore } from './dashboard.store';
import { DomainIconComponent } from '../../design-system/primitives/domain-icon';
import type { HomeDetailRequest } from './home-detail.models';

@Component({
  selector: 'app-home-health-section',
  imports: [RouterLink, ErrorStateComponent, SkeletonComponent, DomainIconComponent],
  template: `<section class="health-section" aria-labelledby="health-title">
    <header>
      <span class="mark" aria-hidden="true"><gr-domain-icon domain="health" size="md" /></span>
      <div>
        <h2 id="health-title">Sanitário / Vacinas / Saúde</h2>
        <p>Registros e necessidades sanitárias do rebanho.</p>
      </div>
    </header>
    @if (store.overview().status === 'ready' && store.overview().value; as overview) {
      <div class="health-grid">
        <button
          type="button"
          class="health-card vaccination"
          (click)="pending('VACCINATION_DUE', 'Vacinação pendente')"
        >
          <span class="health-icon"><gr-domain-icon domain="health" size="md" /></span
          ><span class="tag">Vacinação</span
          ><strong>{{ number(overview.insights.healthDue.vaccinationDue) }}</strong
          ><small>pendências identificadas</small><span class="action">Ver detalhes →</span>
        </button>
        <button
          type="button"
          class="health-card brucellosis"
          (click)="
            pending(
              overview.attention.brucellosisWindowMissed > 0
                ? 'BRUCELLOSIS_WINDOW_MISSED'
                : 'BRUCELLOSIS_DUE',
              'Brucelose'
            )
          "
        >
          <span class="health-icon"><gr-domain-icon domain="attention" size="md" /></span
          ><span class="tag">Brucelose</span
          ><strong>{{ number(overview.attention.brucellosisWindowMissed) }}</strong
          ><small>janelas primárias perdidas</small
          ><small>{{ number(overview.attention.brucellosisDue) }} na janela</small
          ><span class="action">Ver detalhes →</span>
        </button>
        <button
          type="button"
          class="health-card deworming"
          (click)="pending('DEWORMING_DUE', 'Vermifugação pendente')"
        >
          <span class="health-icon"><gr-domain-icon domain="health" size="md" /></span
          ><span class="tag">Vermifugação</span
          ><strong>{{ number(overview.insights.healthDue.dewormingDue) }}</strong
          ><small>pendências identificadas</small><span class="action">Ver detalhes →</span>
        </button>
        <div class="health-card coverage">
          <span class="health-icon"><gr-domain-icon domain="health" size="md" /></span>
          <span class="tag">Aftosa · histórico</span>
          @if (coverageStatus() === 'ready' && coverage(); as data) {
            @if (denominator(data) > 0) {
              <div
                class="radial"
                role="progressbar"
                aria-label="Animais com registro histórico de aftosa"
                aria-valuemin="0"
                aria-valuemax="100"
                [attr.aria-valuenow]="ratio(data)"
                [style.--value]="ratio(data)"
              >
                <span>{{ percentage(ratio(data)) }}</span>
              </div>
              <small>com registro histórico</small>
            } @else {
              <strong>—</strong><small>Sem base para percentual</small>
            }
          } @else if (coverageStatus() === 'error') {
            <small>Consulta indisponível</small
            ><button type="button" class="retry" (click)="loadCoverage()">Tentar novamente</button>
          } @else {
            <gr-skeleton />
          }
          <a routerLink="/relatorios" [queryParams]="{ report: 'health' }">Ver relatório →</a>
        </div>
        <div class="health-card reading">
          <span class="health-icon"><gr-domain-icon domain="health" size="md" /></span>
          <span class="tag">Leitura sanitária no período</span>
          <div>
            <span>Vacinações</span
            ><strong>{{ number(overview.periodActivity.vaccinations) }}</strong>
          </div>
          <div>
            <span>Vermifugações</span
            ><strong>{{ number(overview.periodActivity.dewormings) }}</strong>
          </div>
          <div>
            <span>Pendências sanitárias</span
            ><strong>{{
              number(
                overview.attention.vaccinationDue +
                  overview.attention.dewormingDue +
                  overview.attention.brucellosisDue +
                  overview.attention.brucellosisWindowMissed
              )
            }}</strong>
          </div>
        </div>
      </div>
    } @else if (store.overview().status === 'error') {
      <gr-error-state
        title="Não foi possível carregar a leitura sanitária"
        (retry)="store.retry('overview')"
      />
    } @else {
      <div class="loading"><gr-skeleton /><gr-skeleton /><gr-skeleton /><gr-skeleton /></div>
    }
  </section>`,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }
      .health-section {
        padding: 1rem;
        border: 1px solid #c8e5df;
        border-radius: 1.15rem;
        background: #edf8f7;
      }
      header {
        display: flex;
        align-items: center;
        gap: 0.7rem;
        margin-bottom: 0.8rem;
      }
      .mark {
        display: grid;
        place-items: center;
        width: 2.25rem;
        height: 2.25rem;
        border-radius: 0.65rem;
        background: #086a59;
        color: white;
        font-size: 1.2rem;
      }
      h2 {
        margin: 0;
        font-family: var(--font-display);
        font-size: 1.15rem;
      }
      p {
        margin: 0.1rem 0 0;
        color: #50646a;
        font-size: 0.76rem;
      }
      .health-grid {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 0.55rem;
      }
      .health-card {
        position: relative;
        overflow: hidden;
        min-width: 0;
        min-height: 9.5rem;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 0.15rem;
        padding: 0.85rem;
        border: 1px solid #dbece9;
        border-radius: 0.72rem;
        background: linear-gradient(155deg, #fff 65%, #f2f8f6);
        text-align: left;
        color: #173237;
      }
      .health-card:is(button) {
        cursor: pointer;
      }
      .health-card:is(button):hover,
      .health-card:is(button):focus-visible {
        border-color: #098868;
        outline: none;
      }
      .tag {
        font-size: 0.73rem;
        font-weight: 800;
      }
      .health-icon {
        width: 2.05rem;
        height: 2.05rem;
        display: grid;
        place-items: center;
        border-radius: 0.58rem;
        background: #e1f1e8;
        color: #087259;
        margin-bottom: 0.2rem;
      }
      .vaccination {
        background: linear-gradient(155deg, #fff 55%, #e9f6ef);
      }
      .brucellosis {
        background: linear-gradient(155deg, #fff 55%, #fff0f0);
        border-color: #f1d9d9;
      }
      .brucellosis .health-icon {
        background: #ffe5e5;
        color: #be2938;
      }
      .brucellosis > strong {
        color: #b82231;
      }
      .deworming {
        background: linear-gradient(155deg, #fff 55%, #fff6e8);
        border-color: #f0e3d0;
      }
      .deworming .health-icon {
        background: #fff0d9;
        color: #ae6d16;
      }
      .coverage {
        background: linear-gradient(155deg, #fff 55%, #eaf8f1);
      }
      .reading .health-icon {
        background: #d1e9df;
      }
      .health-card > strong {
        font-family: var(--font-display);
        font-size: 1.8rem;
        line-height: 1.2;
      }
      .health-card small {
        font-size: 0.7rem;
        color: #536b70;
      }
      .action {
        margin-top: auto;
        padding-top: 0.4rem;
        font-size: 0.7rem;
        font-weight: 700;
        color: #087259;
      }
      .coverage a {
        margin-top: auto;
        font-size: 0.7rem;
        color: #087259;
      }
      .retry {
        border: 0;
        background: none;
        color: #087259;
        text-decoration: underline;
        cursor: pointer;
      }
      .radial {
        width: 3.8rem;
        height: 3.8rem;
        display: grid;
        place-items: center;
        margin: 0.25rem 0;
        border-radius: 50%;
        background: conic-gradient(#087259 calc(var(--value) * 1%), #dceae5 0);
        position: relative;
      }
      .radial:before {
        content: '';
        position: absolute;
        inset: 0.42rem;
        border-radius: 50%;
        background: white;
      }
      .radial span {
        z-index: 1;
        font-size: 0.83rem;
        font-weight: 800;
      }
      .reading {
        background: #e4f3ef;
      }
      .reading > div {
        width: 100%;
        display: flex;
        justify-content: space-between;
        gap: 0.3rem;
        padding: 0.2rem 0;
        border-bottom: 1px solid #cfe5dd;
        font-size: 0.69rem;
      }
      .reading > div strong {
        font-variant-numeric: tabular-nums;
      }
      .loading {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 0.5rem;
      }
      .loading gr-skeleton {
        height: 9rem;
      }
      @media (max-width: 75rem) {
        .health-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .reading {
          grid-column: span 2;
        }
      }
      @media (max-width: 38rem) {
        .health-grid {
          grid-template-columns: 1fr;
        }
        .reading {
          grid-column: auto;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeHealthSectionComponent {
  @Output() inspect = new EventEmitter<HomeDetailRequest>();
  readonly coverage = signal<ProcedureCoverage | null>(null);
  readonly coverageStatus = signal<'idle' | 'loading' | 'ready' | 'error'>('idle');
  private subscription?: Subscription;
  constructor(
    readonly store: DashboardStore,
    private readonly parity: ParityApi,
    context: ContextStore,
  ) {
    effect((onCleanup) => {
      context.contextVersion();
      const reference = store.overview().value?.period.referenceDate;
      this.subscription?.unsubscribe();
      this.coverage.set(null);
      this.coverageStatus.set('idle');
      if (reference) this.loadCoverage(reference);
      onCleanup(() => this.subscription?.unsubscribe());
    });
  }
  loadCoverage(reference = this.store.overview().value?.period.referenceDate): void {
    if (!reference) return;
    this.subscription?.unsubscribe();
    this.coverageStatus.set('loading');
    this.subscription = this.parity.coverage('FOOT_AND_MOUTH_DISEASE', reference).subscribe({
      next: (value) => {
        this.coverage.set(value);
        this.coverageStatus.set('ready');
      },
      error: () => this.coverageStatus.set('error'),
    });
  }
  pending(
    pendingType: Extract<HomeDetailRequest, { kind: 'pending' }>['pendingType'],
    title: string,
  ): void {
    this.inspect.emit({ kind: 'pending', pendingType, title });
  }
  denominator(data: ProcedureCoverage): number {
    return data.totalActiveAnimals - data.unknownBirthDate;
  }
  ratio(data: ProcedureCoverage): number {
    return Math.min(100, Math.max(0, (data.withRecordedTreatment / this.denominator(data)) * 100));
  }
  percentage(value: number): string {
    return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)}%`;
  }
  number(value: number): string {
    return new Intl.NumberFormat('pt-BR').format(value);
  }
}
