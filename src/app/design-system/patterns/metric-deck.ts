import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { DomainIconComponent, DomainIconName } from '../primitives/domain-icon';

interface MetricLink {
  destination?: { path: string; label: string; queryParams?: Record<string, string> };
}
export interface HerdMetric extends MetricLink {
  kind: 'herd';
  animals: string;
}
export interface TerritoryMetric extends MetricLink {
  kind: 'territory';
  total: string;
  occupied: string;
  occupancyPercentage: number | null;
  occupancyLabel: string;
}
export interface LocationMetric extends MetricLink {
  kind: 'location';
  unlocated: string;
  hasPending: boolean;
  locatedPercentage?: number | null;
}
export interface AttentionMetric extends MetricLink {
  kind: 'attention';
  total: string;
  hasPending: boolean;
}
export type OperationalMetric = HerdMetric | TerritoryMetric | LocationMetric | AttentionMetric;
export type HomeMetricKind = OperationalMetric['kind'];

@Component({
  selector: 'gr-metric-deck',
  imports: [DomainIconComponent],
  template: `<div class="deck" aria-label="Estado atual da operação">
    @for (metric of metrics; track metric.kind) {
      <button
        type="button"
        class="object"
        [class]="'object obj-' + metric.kind"
        (click)="inspect.emit(metric.kind)"
      >
        <span class="icon"><gr-domain-icon [domain]="icon(metric.kind)" size="md" /></span>
        <span class="copy">
          <span class="label">{{ label(metric.kind) }}</span>
          @switch (metric.kind) {
            @case ('herd') {
              <strong>{{ metric.animals }}</strong
              ><small>animais ativos</small>
            }
            @case ('territory') {
              <strong>{{ metric.total }}</strong
              ><small>piquetes · {{ metric.occupied }} ocupados</small
              ><small>{{ metric.occupancyLabel }}</small>
            }
            @case ('location') {
              <strong>{{
                metric.locatedPercentage === null || metric.locatedPercentage === undefined
                  ? '—'
                  : percentage(metric.locatedPercentage)
              }}</strong
              ><small>dos animais vinculados a piquetes</small
              ><small>{{ metric.unlocated }} sem piquete</small>
            }
            @case ('attention') {
              <strong>{{ metric.total }}</strong
              ><small>{{
                metric.hasPending ? 'situações identificadas' : 'operação em dia'
              }}</small>
            }
          }
        </span>
        <span class="inspect">Ver detalhes <span aria-hidden="true">→</span></span>
      </button>
    }
  </div>`,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }
      .deck {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 0.7rem;
      }
      .object {
        min-width: 0;
        min-height: 9.3rem;
        display: grid;
        grid-template-columns: 2.6rem minmax(0, 1fr);
        grid-template-rows: 1fr auto;
        gap: 0.5rem 0.7rem;
        padding: 1rem;
        border: 1px solid #dbe8e2;
        border-radius: 0.9rem;
        background: rgba(255, 255, 255, 0.96);
        box-shadow: 0 7px 22px rgba(3, 42, 28, 0.12);
        text-align: left;
        cursor: pointer;
        color: #112a2d;
        transition:
          transform 0.18s,
          box-shadow 0.18s;
      }
      .object:hover {
        transform: translateY(-1px);
        box-shadow: 0 12px 28px rgba(3, 42, 28, 0.17);
      }
      .object:focus-visible {
        outline: 3px solid #6ed193;
        outline-offset: 2px;
      }
      .icon {
        width: 2.6rem;
        height: 2.6rem;
        display: grid;
        place-items: center;
        border-radius: 0.75rem;
        background: #e3f3e9;
        color: #075335;
      }
      .copy {
        min-width: 0;
        display: flex;
        flex-direction: column;
      }
      .label {
        font-size: 0.72rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.045em;
      }
      strong {
        font-family: var(--font-display);
        font-size: 1.75rem;
        line-height: 1.15;
        letter-spacing: -0.04em;
        font-variant-numeric: tabular-nums;
      }
      small {
        font-size: 0.73rem;
        color: #526772;
        line-height: 1.35;
      }
      .inspect {
        grid-column: 1/-1;
        display: flex;
        justify-content: space-between;
        padding-top: 0.55rem;
        border-top: 1px solid #e8efec;
        font-size: 0.72rem;
        font-weight: 750;
        color: #075335;
      }
      .obj-attention .icon {
        background: #ffebeb;
        color: #bf202e;
      }
      .obj-attention strong {
        color: #b71c2a;
      }
      @media (max-width: 76rem) {
        .deck {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (max-width: 40rem) {
        .deck {
          grid-template-columns: 1fr;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .object {
          transition: none;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricDeckComponent {
  @Input({ required: true }) metrics: OperationalMetric[] = [];
  @Output() inspect = new EventEmitter<HomeMetricKind>();
  icon(kind: HomeMetricKind): DomainIconName {
    return kind === 'herd'
      ? 'herd'
      : kind === 'territory'
        ? 'territory'
        : kind === 'location'
          ? 'location'
          : 'attention';
  }
  label(kind: HomeMetricKind): string {
    return {
      herd: 'Rebanho',
      territory: 'Território',
      location: 'Localização',
      attention: 'Atenção',
    }[kind];
  }
  percentage(value: number): string {
    return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)}%`;
  }
}
