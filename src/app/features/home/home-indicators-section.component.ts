import { ChangeDetectionStrategy, Component, EventEmitter, Output, computed } from '@angular/core';
import { ErrorStateComponent, SkeletonComponent } from '../../design-system/feedback/feedback';
import { DashboardStore } from './dashboard.store';
import { HomeMiniSeriesComponent } from './home-mini-series.component';
import { DomainIconComponent, DomainIconName } from '../../design-system/primitives/domain-icon';
import type { HomeActivityKind, HomeDetailRequest } from './home-detail.models';

@Component({
  selector: 'app-home-indicators-section',
  imports: [ErrorStateComponent, SkeletonComponent, HomeMiniSeriesComponent, DomainIconComponent],
  template: `<section class="indicators-section" aria-labelledby="indicators-title">
    <header>
      <span class="mark" aria-hidden="true"><gr-domain-icon domain="movement" size="md" /></span>
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
            [attr.data-tone]="item.tone"
            (click)="inspect.emit({ kind: 'activity', activity: item.kind })"
          >
            <span class="indicator-icon"
              ><gr-domain-icon [domain]="icon(item.kind)" size="md" /></span
            ><span class="label">{{ item.label }}</span
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
        position: relative;
        overflow: hidden;
        min-width: 0;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        padding: 0.75rem;
        border: 1px solid #e0eaf0;
        border-radius: 0.7rem;
        background: linear-gradient(150deg, #fff 60%, #edf7f3);
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
      .indicator-icon {
        width: 2rem;
        height: 2rem;
        display: grid;
        place-items: center;
        margin-bottom: 0.35rem;
        border-radius: 0.55rem;
        background: #e2f2eb;
        color: #087259;
      }
      .indicator[data-tone='blue'] {
        background: linear-gradient(150deg, #fff 60%, #eaf4fb);
      }
      .indicator[data-tone='blue'] .indicator-icon {
        background: #e3f1fc;
        color: #176eaa;
      }
      .indicator[data-tone='violet'] {
        background: linear-gradient(150deg, #fff 60%, #f0edfb);
      }
      .indicator[data-tone='violet'] .indicator-icon {
        background: #ede8fa;
        color: #7655bd;
      }
      .indicator[data-tone='amber'] {
        background: linear-gradient(150deg, #fff 60%, #fbf4e8);
      }
      .indicator[data-tone='amber'] .indicator-icon {
        background: #fff0dc;
        color: #a56a19;
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
  icon(kind: HomeActivityKind): DomainIconName {
    return {
      movements: 'movement',
      weights: 'weight',
      treatments: 'health',
      breedings: 'reproduction',
      calvings: 'calving',
      births: 'herd',
    }[kind] as DomainIconName;
  }
  number(value: number): string {
    return new Intl.NumberFormat('pt-BR').format(value);
  }
}
