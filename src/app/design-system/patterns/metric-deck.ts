import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export interface OperationalMetric {
  label: string;
  value: string;
  detail: string;
  icon: string;
  tone?: 'territory' | 'attention' | 'neutral';
}

@Component({
  selector: 'gr-metric-deck',
  template: `<section class="deck" aria-label="Estado atual da operação">
    @for (metric of metrics; track metric.label) {
      <article [class]="'metric-card ' + (metric.tone || 'neutral')" tabindex="0">
        <div class="card-accent-bar" aria-hidden="true"></div>
        <div class="card-body">
          <div class="card-top">
            <span class="metric-icon" aria-hidden="true">{{ metric.icon }}</span>
            <span class="metric-label">{{ metric.label }}</span>
          </div>
          <div class="metric-content">
            <strong class="metric-value">{{ metric.value }}</strong>
            <small class="metric-detail">{{ metric.detail }}</small>
          </div>
        </div>
      </article>
    }
  </section>`,
  styles: [`
    :host {
      display: block;
      min-width: 0;
    }
    .deck {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: var(--space-3);
    }
    .metric-card {
      position: relative;
      min-width: 0;
      min-height: 5.75rem;
      display: flex;
      flex-direction: column;
      padding: var(--space-4);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      box-shadow: var(--shadow-raised);
      overflow: hidden;
      cursor: default;
      transition:
        transform var(--duration-standard) var(--ease-standard),
        box-shadow var(--duration-standard) var(--ease-standard),
        border-color var(--duration-standard) var(--ease-standard);
    }
    .metric-card:hover, .metric-card:focus-visible {
      transform: translateY(-2px);
      box-shadow: var(--shadow-card-hover);
      border-color: var(--color-border-strong);
      outline: none;
    }
    .card-accent-bar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: transparent;
      transition: height var(--duration-fast);
    }
    .metric-card:hover .card-accent-bar {
      height: 4px;
    }
    .metric-card.territory .card-accent-bar {
      background: linear-gradient(90deg, var(--color-primary) 0%, #3ca06b 100%);
    }
    .metric-card.attention .card-accent-bar {
      background: linear-gradient(90deg, var(--color-warning) 0%, #f0a33a 100%);
    }
    .metric-card.neutral .card-accent-bar {
      background: linear-gradient(90deg, var(--color-border-strong) 0%, transparent 100%);
    }
    .card-body {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 100%;
      min-width: 0;
      gap: var(--space-2);
    }
    .card-top {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      min-width: 0;
    }
    .metric-icon {
      width: 1.75rem;
      height: 1.75rem;
      display: grid;
      place-items: center;
      flex: 0 0 auto;
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border-subtle);
      color: var(--color-primary);
      background: var(--color-primary-subtle);
      font-size: 0.825rem;
      font-weight: 780;
      box-shadow: 0 1px 2px rgba(18, 84, 52, 0.08);
    }
    .attention .metric-icon {
      border-color: rgba(179, 102, 5, 0.2);
      color: var(--color-warning);
      background: var(--color-warning-subtle);
      box-shadow: 0 1px 2px rgba(179, 102, 5, 0.08);
    }
    .neutral .metric-icon {
      border-color: var(--color-border);
      color: var(--color-text-secondary);
      background: var(--color-surface-soft);
      box-shadow: none;
    }
    .metric-label {
      overflow: hidden;
      color: var(--color-text-muted);
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .metric-content {
      min-width: 0;
      display: grid;
      gap: 2px;
    }
    .metric-value {
      font-size: 1.55rem;
      line-height: 1.1;
      letter-spacing: -0.045em;
      font-weight: 780;
      color: var(--color-text);
      font-variant-numeric: tabular-nums;
    }
    .metric-detail {
      overflow: hidden;
      color: var(--color-text-secondary);
      font-size: 0.6875rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .attention .metric-detail {
      color: #925304;
      font-weight: 550;
    }
    @media (max-width: 72rem) {
      .deck {
        grid-template-columns: repeat(6, 1fr);
      }
      .metric-card {
        grid-column: span 2;
      }
      .metric-card:nth-child(4), .metric-card:nth-child(5) {
        grid-column: span 3;
      }
    }
    @media (max-width: 42rem) {
      .deck {
        grid-template-columns: repeat(2, 1fr);
        gap: var(--space-2);
      }
      .metric-card, .metric-card:nth-child(4) {
        grid-column: span 1;
      }
      .metric-card:nth-child(5) {
        grid-column: span 2;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricDeckComponent {
  @Input({ required: true }) metrics: OperationalMetric[] = [];
}
