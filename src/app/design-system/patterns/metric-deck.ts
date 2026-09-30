import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { DomainIconComponent, DomainIconName } from '../primitives/domain-icon';

interface MetricLink {
  destination?: { path: string; label: string; queryParams?: Record<string, string> };
}
export interface HerdMetric extends MetricLink {
  kind: 'herd';
  animals: string;
  segments: { label: string; value: number; share: number }[];
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
  groups: { label: string; value: number; share: number }[];
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
        <span class="visual" aria-hidden="true">
          @switch (metric.kind) {
            @case ('herd') {
              <span class="herd-bars">
                @for (segment of metric.segments; track segment.label) {
                  <span [style.height.%]="Math.max(14, segment.share)"></span>
                }
              </span>
            }
            @case ('territory') {
              @if (metric.occupancyPercentage !== null) {
                <span class="occupancy"
                  ><span [style.width.%]="metric.occupancyPercentage"></span
                ></span>
              }
            }
            @case ('location') {
              @if (metric.locatedPercentage !== null && metric.locatedPercentage !== undefined) {
                <span class="location-ring" [style.--value]="metric.locatedPercentage"></span>
              }
            }
            @case ('attention') {
              <span class="attention-bars">
                @for (group of metric.groups; track group.label) {
                  <span [style.height.%]="group.value > 0 ? Math.max(14, group.share) : 0"></span>
                }
              </span>
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
        min-height: 9.55rem;
        display: grid;
        grid-template-columns: 2.6rem minmax(0, 1fr) 3.4rem;
        grid-template-rows: 1fr auto;
        gap: 0.5rem 0.7rem;
        padding: 1rem;
        border: 1px solid #dbe8e2;
        border-radius: 0.9rem;
        background: linear-gradient(145deg, #fff 58%, #ecf7f0);
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
      .visual {
        align-self: end;
        justify-self: stretch;
        height: 3.25rem;
        display: grid;
        align-items: end;
      }
      .herd-bars,
      .attention-bars {
        height: 100%;
        display: flex;
        align-items: end;
        gap: 0.24rem;
      }
      .herd-bars span,
      .attention-bars span {
        flex: 1;
        min-height: 0;
        border-radius: 0.2rem 0.2rem 0 0;
        background: linear-gradient(#50b87b, #0a7b4e);
      }
      .herd-bars span:nth-child(2) {
        background: linear-gradient(#a6dcb2, #4cab6c);
      }
      .herd-bars span:nth-child(3) {
        background: linear-gradient(#d4e9a5, #86ba55);
      }
      .occupancy {
        display: block;
        height: 0.55rem;
        margin-bottom: 0.2rem;
        border-radius: 1rem;
        background: #dceee6;
        overflow: hidden;
      }
      .occupancy span {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, #41ab78, #0c7658);
      }
      .location-ring {
        width: 3.2rem;
        height: 3.2rem;
        justify-self: end;
        border-radius: 50%;
        background: conic-gradient(#178d66 calc(var(--value) * 1%), #dceee5 0);
        position: relative;
      }
      .location-ring::after {
        content: '';
        position: absolute;
        inset: 0.48rem;
        border-radius: 50%;
        background: #f8fdf9;
      }
      .attention-bars span {
        background: linear-gradient(#fa9a92, #d73c49);
      }
      .attention-bars span:nth-child(2) {
        background: linear-gradient(#f4ba74, #d78526);
      }
      .attention-bars span:nth-child(3) {
        background: linear-gradient(#b3a4e5, #7561bd);
      }
      .attention-bars span:nth-child(4) {
        background: linear-gradient(#7cc8a9, #298b68);
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
      .obj-territory {
        background: linear-gradient(145deg, #fff 58%, #edf8f0);
      }
      .obj-location {
        background: linear-gradient(145deg, #fff 58%, #eaf6f3);
      }
      .obj-attention {
        background: linear-gradient(145deg, #fff 58%, #fff0ef);
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
  readonly Math = Math;
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
