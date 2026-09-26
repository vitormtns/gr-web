import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { BrandGrowthBarsComponent } from '../primitives/brand-growth-bars';
import { DomainIconComponent } from '../primitives/domain-icon';

export interface HerdMetric {
  kind: 'herd';
  animals: string;
}

export interface TerritoryMetric {
  kind: 'territory';
  total: string;
  occupied: string;
  occupancyPercentage: number;
  occupancyLabel: string;
}

export interface LocationMetric {
  kind: 'location';
  unlocated: string;
  hasPending: boolean;
}

export interface AttentionMetric {
  kind: 'attention';
  total: string;
  hasPending: boolean;
}

export type OperationalMetric = HerdMetric | TerritoryMetric | LocationMetric | AttentionMetric;

@Component({
  selector: 'gr-metric-deck',
  imports: [DomainIconComponent, BrandGrowthBarsComponent],
  template: `<section class="deck" aria-label="Estado atual da operação">
    @for (metric of metrics; track metric.kind) {
      @switch (metric.kind) {
        @case ('herd') {
          <article class="object obj-herd">
            <span class="obj-label">Rebanho</span>
            <gr-domain-icon class="herd-icon" domain="herd" size="lg" />
            <strong class="obj-value">{{ metric.animals }}</strong>
            <span class="obj-sub">animais ativos</span>
            <gr-brand-growth-bars class="herd-bars" />
          </article>
        }
        @case ('territory') {
          <article class="object obj-territory" role="progressbar" [attr.aria-valuenow]="metric.occupancyPercentage" aria-valuemin="0" aria-valuemax="100" [attr.aria-label]="metric.total + ' piquetes, ' + metric.occupied + ' ocupados'">
            <div class="obj-head">
              <span class="obj-label">Território</span>
              <gr-domain-icon class="obj-icon" domain="territory" size="sm" />
            </div>
            <strong class="obj-value">{{ metric.total }} <span>piquetes</span></strong>
            <span class="obj-sub">{{ metric.occupied }} ocupados · {{ metric.occupancyLabel }}</span>
            <span class="occupancy-track" aria-hidden="true"><b [style.width.%]="metric.occupancyPercentage"></b></span>
            <span class="territory-blocks" aria-hidden="true"><i></i><i></i><i></i></span>
          </article>
        }
        @case ('location') {
          <article class="object obj-location" [class.is-clear]="!metric.hasPending">
            <div class="obj-head">
              <span class="obj-label">Localização</span>
              <gr-domain-icon class="obj-icon" domain="location" size="sm" />
            </div>
            <strong class="obj-value">{{ metric.unlocated }}</strong>
            @if (metric.hasPending) {
              <span class="obj-sub">fora do território</span>
              <span class="location-motif" aria-hidden="true"><i class="ring"></i><i class="trail"></i><i class="dot"></i></span>
            } @else {
              <span class="obj-sub">localização em dia</span>
            }
          </article>
        }
        @case ('attention') {
          <article class="object obj-attention" [class.is-clear]="!metric.hasPending">
            <div class="obj-head">
              <span class="obj-label">Atenção</span>
              <gr-domain-icon class="obj-icon" domain="attention" size="sm" />
            </div>
            <strong class="obj-value">{{ metric.total }}</strong>
            @if (metric.hasPending) {
              <span class="obj-sub"><i class="priority-bars" aria-hidden="true"><i></i><i></i><i></i></i>situações identificadas</span>
            } @else {
              <span class="obj-sub">operação em dia</span>
            }
          </article>
        }
      }
    }
  </section>`,
  styles: [`
    :host {
      display: block;
      min-width: 0;
    }
    .deck {
      display: grid;
      grid-template-columns: 1.2fr 1.25fr 1fr 1.1fr;
      gap: var(--space-3);
    }
    .object {
      position: relative;
      min-width: 0;
      min-height: 7rem;
      display: grid;
      align-content: start;
      gap: 2px;
      padding: var(--space-4);
      border: 1px solid var(--border-soft);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-1);
      overflow: hidden;
    }
    .obj-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
      margin-bottom: var(--space-1);
    }
    .obj-label {
      color: var(--text-tertiary);
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .obj-icon {
      width: 1.75rem;
      height: 1.75rem;
      display: grid;
      place-items: center;
      flex: 0 0 auto;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-soft);
      background: rgba(255, 255, 255, 0.6);
      color: var(--text-accent);
    }
    .obj-value {
      font-family: var(--font-display);
      font-size: 1.55rem;
      line-height: 1.1;
      letter-spacing: -0.045em;
      font-weight: 780;
      color: var(--text-primary);
      font-variant-numeric: tabular-nums;
    }
    .obj-value span {
      font-size: 0.8125rem;
      font-weight: 600;
      letter-spacing: -0.01em;
      color: var(--text-secondary);
    }
    .obj-sub {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      color: var(--text-secondary);
      font-size: 0.6875rem;
      font-weight: 550;
    }
    .obj-herd {
      background: linear-gradient(160deg, #e3efe5 0%, #eef4ee 70%);
      border-color: #c9d8cc;
    }
    .herd-icon {
      margin: var(--space-1) 0;
      color: var(--brand-primary);
    }
    .herd-bars {
      position: absolute;
      right: var(--space-4);
      bottom: var(--space-3);
      width: 2.5rem;
      color: var(--brand-live);
    }
    .obj-territory {
      background: linear-gradient(160deg, #dfece4 0%, #e9f1ea 70%);
      border-color: #bcd2c1;
    }
    .obj-territory .obj-icon {
      color: var(--brand-primary);
      border-color: rgba(15, 81, 50, 0.22);
    }
    .occupancy-track {
      height: 5px;
      margin-top: var(--space-2);
      overflow: hidden;
      border-radius: var(--radius-pill);
      background: rgba(15, 81, 50, 0.14);
    }
    .occupancy-track b {
      display: block;
      height: 100%;
      border-radius: var(--radius-pill);
      background: var(--brand-primary);
    }
    .territory-blocks {
      position: absolute;
      right: var(--space-4);
      bottom: var(--space-3);
      display: flex;
      align-items: flex-end;
      gap: 3px;
    }
    .territory-blocks i {
      border-radius: 2px;
      background: var(--brand-primary);
    }
    .territory-blocks i:nth-child(1) { width: 0.55rem; height: 0.55rem; opacity: 0.3; }
    .territory-blocks i:nth-child(2) { width: 0.55rem; height: 0.85rem; opacity: 0.5; }
    .territory-blocks i:nth-child(3) { width: 0.55rem; height: 0.65rem; opacity: 0.4; }
    .obj-location {
      background: #faf3e3;
      border-color: #e4cf9e;
    }
    .obj-location .obj-icon {
      color: #925304;
      border-color: rgba(179, 102, 5, 0.3);
      background: rgba(255, 255, 255, 0.65);
    }
    .obj-location .obj-sub {
      color: #925304;
      font-weight: 650;
    }
    .obj-location.is-clear {
      background: var(--surface-subtle);
      border-color: var(--border-soft);
    }
    .obj-location.is-clear .obj-icon {
      color: var(--semantic-success);
      border-color: rgba(21, 121, 69, 0.22);
    }
    .obj-location.is-clear .obj-sub {
      color: var(--text-secondary);
      font-weight: 550;
    }
    .location-motif {
      position: absolute;
      right: var(--space-4);
      bottom: var(--space-3);
      width: 2.75rem;
      height: 1.5rem;
    }
    .location-motif .ring {
      position: absolute;
      top: 0;
      right: 0;
      width: 1.5rem;
      height: 1.5rem;
      border: 1.5px dashed rgba(179, 102, 5, 0.6);
      border-radius: 50%;
    }
    .location-motif .trail {
      position: absolute;
      bottom: 0.35rem;
      left: 0;
      width: 1.1rem;
      border-top: 1.5px dashed rgba(179, 102, 5, 0.45);
    }
    .location-motif .dot {
      position: absolute;
      bottom: 0.2rem;
      left: 0;
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: rgba(179, 102, 5, 0.6);
    }
    .obj-attention {
      background: #faf1e2;
      border-color: #e6c795;
    }
    .obj-attention .obj-icon {
      color: #925304;
      border-color: rgba(179, 102, 5, 0.3);
      background: rgba(255, 255, 255, 0.65);
    }
    .obj-attention .obj-value {
      color: #6e3f02;
    }
    .obj-attention .obj-sub {
      color: #925304;
      font-weight: 650;
    }
    .priority-bars {
      display: inline-flex;
      align-items: flex-end;
      gap: 2px;
    }
    .priority-bars i {
      width: 3px;
      border-radius: var(--radius-pill);
      background: var(--brand-amber);
    }
    .priority-bars i:nth-child(1) { height: 0.4rem; opacity: 0.55; }
    .priority-bars i:nth-child(2) { height: 0.65rem; opacity: 0.8; }
    .priority-bars i:nth-child(3) { height: 0.9rem; }
    .obj-attention.is-clear {
      background: var(--surface-subtle);
      border-color: var(--border-soft);
    }
    .obj-attention.is-clear .obj-icon {
      color: var(--semantic-success);
      border-color: rgba(21, 121, 69, 0.22);
    }
    .obj-attention.is-clear .obj-value {
      color: var(--text-primary);
    }
    .obj-attention.is-clear .obj-sub {
      color: var(--text-secondary);
      font-weight: 550;
    }
    @media (max-width: 76rem) {
      .deck {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (max-width: 40rem) {
      .deck {
        grid-template-columns: minmax(0, 1fr);
      }
      .herd-bars, .territory-blocks, .location-motif {
        display: none;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricDeckComponent {
  @Input({ required: true }) metrics: OperationalMetric[] = [];
}
