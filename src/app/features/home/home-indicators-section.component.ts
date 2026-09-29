import { ChangeDetectionStrategy, Component, EventEmitter, Output, computed } from '@angular/core';
import { ErrorStateComponent, SkeletonComponent } from '../../design-system/feedback/feedback';
import { DashboardStore } from './dashboard.store';
import { HomeMiniSeriesComponent } from './home-mini-series.component';
import type { HomeActivityKind, HomeDetailRequest } from './home-detail.models';

@Component({
  selector: 'app-home-indicators-section',
  imports: [ErrorStateComponent, SkeletonComponent, HomeMiniSeriesComponent],
  template: `<section class="indicators-section" aria-labelledby="indicators-title">
    <header>
      <span class="mark" aria-hidden="true">▥</span>
      <div>
        <h2 id="indicators-title">Indicadores e leitura da fazenda</h2>
        <p>Atividade registrada no período selecionado.</p>
      </div>
    </header>
    @if (store.activity().status === 'ready') {
      <div class="cards">
        @for (item of cards(); track item.kind) {
          <button
            type="button"
            class="indicator"
            (click)="inspect.emit({ kind: 'activity', activity: item.kind })"
          >
            <span class="label">{{ item.label }}</span
            ><strong>{{ number(item.value) }}</strong
            ><small>no período</small>
            <app-home-mini-series [values]="item.values" [tone]="item.tone" />
            <span class="action">Ver detalhes →</span>
          </button>
        }
      </div>
    } @else if (store.activity().status === 'error') {
      <gr-error-state
        title="Não foi possível carregar os indicadores"
        (retry)="store.retry('activity')"
      />
    } @else {
      <div class="loading">
        <gr-skeleton /><gr-skeleton /><gr-skeleton /><gr-skeleton /><gr-skeleton /><gr-skeleton />
      </div>
    }
  </section>`,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }
      .indicators-section {
        padding: 1rem;
        border: 1px solid #d7e5ed;
        border-radius: 1.15rem;
        background: #f2f7fb;
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
        background: #0d647c;
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
      .cards,
      .loading {
        display: grid;
        grid-template-columns: repeat(6, minmax(0, 1fr));
        gap: 0.55rem;
      }
      .indicator {
        min-width: 0;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        padding: 0.75rem;
        border: 1px solid #e0eaf0;
        border-radius: 0.7rem;
        background: rgba(255, 255, 255, 0.94);
        text-align: left;
        color: #173237;
        cursor: pointer;
      }
      .indicator:hover,
      .indicator:focus-visible {
        border-color: #347c93;
        outline: none;
      }
      .label {
        font-size: 0.7rem;
        font-weight: 800;
      }
      .indicator strong {
        font-family: var(--font-display);
        font-size: 1.35rem;
        font-variant-numeric: tabular-nums;
      }
      .indicator small {
        color: #5b6e77;
        font-size: 0.68rem;
      }
      .indicator app-home-mini-series {
        width: 100%;
        margin-top: 0.6rem;
      }
      .action {
        width: 100%;
        margin-top: 0.35rem;
        border-top: 1px solid #e9eef0;
        padding-top: 0.35rem;
        color: #0d647c;
        font-size: 0.68rem;
        font-weight: 700;
      }
      .loading gr-skeleton {
        height: 7rem;
      }
      @media (max-width: 75rem) {
        .cards,
        .loading {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }
      @media (max-width: 40rem) {
        .cards,
        .loading {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeIndicatorsSectionComponent {
  @Output() inspect = new EventEmitter<HomeDetailRequest>();
  readonly cards = computed(() => {
    const data = this.store.activity().value;
    if (!data) return [];
    const specs: {
      kind: HomeActivityKind;
      label: string;
      value: number;
      field: keyof (typeof data.series)[number];
      tone: 'green' | 'blue' | 'violet' | 'amber' | 'red';
    }[] = [
      {
        kind: 'movements',
        label: 'Movimentações',
        value: data.totals.movements,
        field: 'movements',
        tone: 'green',
      },
      {
        kind: 'weights',
        label: 'Pesagens',
        value: data.totals.weightMeasurements,
        field: 'weights',
        tone: 'blue',
      },
      {
        kind: 'treatments',
        label: 'Tratamentos',
        value: data.totals.vaccinations + data.totals.dewormings,
        field: 'healthTreatments',
        tone: 'violet',
      },
      {
        kind: 'breedings',
        label: 'Reprodução',
        value: data.totals.breedings,
        field: 'breedings',
        tone: 'amber',
      },
      {
        kind: 'calvings',
        label: 'Partos',
        value: data.totals.calvings,
        field: 'calvings',
        tone: 'green',
      },
      {
        kind: 'births',
        label: 'Nascimentos',
        value: data.totals.births,
        field: 'births',
        tone: 'green',
      },
    ];
    return specs.map((spec) => ({
      ...spec,
      values: data.series.map((bucket) => Number(bucket[spec.field]) || 0),
    }));
  });
  constructor(readonly store: DashboardStore) {}
  number(value: number): string {
    return new Intl.NumberFormat('pt-BR').format(value);
  }
}
