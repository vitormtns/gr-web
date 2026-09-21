import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

/* ======================================================================
   1. MetricCardComponent
   ====================================================================== */
export type MetricTone = 'neutral' | 'success' | 'warning' | 'danger' | 'territory';
export type MetricEmphasis = 'normal' | 'strong';

@Component({
  selector: 'gr-metric-card',
  imports: [CommonModule],
  template: `
    <article
      class="metric-card"
      [class]="'metric-card ' + tone + ' ' + emphasis"
      [class.compact]="compact"
      tabindex="0"
    >
      <div class="card-accent" aria-hidden="true"></div>
      <div class="card-inner">
        <header class="card-header">
          @if (icon) {
            <span class="icon-badge" aria-hidden="true">{{ icon }}</span>
          }
          <span class="card-title">{{ title }}</span>
          @if (meta) {
            <span class="card-meta">{{ meta }}</span>
          }
        </header>
        <div class="card-body">
          <strong class="card-value">{{ value }}</strong>
          @if (hint) {
            <small class="card-hint">{{ hint }}</small>
          }
        </div>
        <ng-content />
      </div>
    </article>
  `,
  styles: [`
    :host { display: block; min-width: 0; }
    .metric-card {
      position: relative;
      min-width: 0;
      height: 100%;
      display: flex;
      flex-direction: column;
      padding: var(--space-4);
      border: 1px solid var(--border-soft);
      border-radius: var(--radius-lg);
      background: var(--canvas-elevated);
      box-shadow: var(--shadow-2);
      overflow: hidden;
      cursor: default;
      transition:
        transform var(--motion-base) var(--ease-standard),
        box-shadow var(--motion-base) var(--ease-standard),
        border-color var(--motion-base) var(--ease-standard);
    }
    .metric-card:hover, .metric-card:focus-visible {
      transform: translateY(-2px);
      box-shadow: var(--shadow-3);
      border-color: var(--border-strong);
      outline: none;
    }
    .card-accent {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: var(--border-soft);
      transition: height var(--motion-fast);
    }
    .metric-card:hover .card-accent { height: 4px; }
    .territory .card-accent { background: linear-gradient(90deg, var(--territory-green), #38a169); }
    .success .card-accent { background: linear-gradient(90deg, var(--semantic-success), #38a169); }
    .warning .card-accent { background: linear-gradient(90deg, var(--semantic-warning), #e08b1a); }
    .danger .card-accent { background: linear-gradient(90deg, var(--semantic-danger), #df6459); }
    .neutral .card-accent { background: linear-gradient(90deg, var(--border-strong), transparent); }

    .card-inner {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 100%;
      min-width: 0;
      gap: var(--space-2);
    }
    .card-header {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      min-width: 0;
    }
    .icon-badge {
      width: 1.75rem;
      height: 1.75rem;
      display: grid;
      place-items: center;
      flex: 0 0 auto;
      border-radius: var(--radius-sm);
      font-size: 0.85rem;
      font-weight: 800;
      border: 1px solid var(--border-soft);
      background: var(--surface-subtle);
      color: var(--text-secondary);
    }
    .territory .icon-badge, .success .icon-badge {
      background: var(--territory-green-soft);
      color: var(--territory-green);
      border-color: rgba(21, 121, 69, 0.2);
    }
    .warning .icon-badge {
      background: var(--color-warning-subtle);
      color: var(--semantic-warning);
      border-color: rgba(179, 102, 5, 0.2);
    }
    .danger .icon-badge {
      background: var(--color-danger-subtle);
      color: var(--semantic-danger);
      border-color: rgba(193, 60, 49, 0.2);
    }

    .card-title {
      overflow: hidden;
      color: var(--text-tertiary);
      font-size: 0.6875rem;
      font-weight: 750;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .card-meta {
      margin-left: auto;
      font-size: 0.6875rem;
      color: var(--text-tertiary);
      font-weight: 600;
    }
    .card-body {
      display: grid;
      gap: 2px;
      min-width: 0;
    }
    .card-value {
      font-size: 1.55rem;
      line-height: 1.08;
      letter-spacing: -0.045em;
      font-weight: 800;
      color: var(--text-primary);
      font-variant-numeric: tabular-nums;
    }
    .card-hint {
      overflow: hidden;
      color: var(--text-secondary);
      font-size: 0.6875rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Modifiers */
    .strong .card-value {
      font-size: 1.95rem;
      color: var(--text-accent);
    }
    .compact {
      padding: var(--space-3);
    }
    .compact .card-value {
      font-size: 1.3rem;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricCardComponent {
  @Input({ required: true }) title = '';
  @Input({ required: true }) value = '';
  @Input() hint = '';
  @Input() tone: MetricTone = 'neutral';
  @Input() icon = '';
  @Input() compact = false;
  @Input() emphasis: MetricEmphasis = 'normal';
  @Input() meta = '';
}

/* ======================================================================
   2. InsightCardComponent
   ====================================================================== */
export type InsightTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'territory';

@Component({
  selector: 'gr-insight-card',
  imports: [CommonModule],
  template: `
    <article
      class="insight-card"
      [class]="'insight-card ' + tone"
      [class.interactive]="interactive"
      [class.compact]="compact"
      (click)="interactive ? actionClicked.emit() : null"
      [attr.tabindex]="interactive ? 0 : null"
    >
      <div class="insight-bar" aria-hidden="true"></div>
      <div class="insight-content">
        <header class="insight-header">
          @if (icon) {
            <span class="insight-icon" aria-hidden="true">{{ icon }}</span>
          }
          <strong class="insight-title">{{ title }}</strong>
        </header>
        <p class="insight-desc">{{ description }}</p>
        @if (actionLabel) {
          <footer class="insight-footer">
            <button type="button" class="insight-cta" (click)="actionClicked.emit()">
              {{ actionLabel }} <span aria-hidden="true">→</span>
            </button>
          </footer>
        }
      </div>
    </article>
  `,
  styles: [`
    :host { display: block; }
    .insight-card {
      position: relative;
      padding: var(--space-4);
      border: 1px solid var(--border-soft);
      border-radius: var(--radius-lg);
      background: var(--surface-insight);
      box-shadow: var(--shadow-1);
      overflow: hidden;
      transition: transform var(--motion-fast), box-shadow var(--motion-fast);
    }
    .interactive { cursor: pointer; }
    .interactive:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-2);
      border-color: var(--border-strong);
    }
    .insight-bar {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      width: 4px;
      background: var(--border-strong);
    }
    .territory .insight-bar { background: var(--territory-green); }
    .success .insight-bar { background: var(--semantic-success); }
    .warning .insight-bar { background: var(--semantic-warning); }
    .danger .insight-bar { background: var(--semantic-danger); }
    .info .insight-bar { background: var(--semantic-info); }

    .insight-content {
      padding-left: var(--space-2);
      display: grid;
      gap: var(--space-2);
    }
    .insight-header {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }
    .insight-icon {
      font-size: 1rem;
      line-height: 1;
    }
    .insight-title {
      font-size: 0.875rem;
      font-weight: 750;
      color: var(--text-primary);
    }
    .insight-desc {
      margin: 0;
      font-size: 0.78rem;
      color: var(--text-secondary);
      line-height: 1.4;
    }
    .insight-cta {
      border: 0;
      background: transparent;
      padding: 0;
      color: var(--text-accent);
      font-size: 0.75rem;
      font-weight: 750;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .insight-cta:hover { text-decoration: underline; }
    .compact { padding: var(--space-3); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InsightCardComponent {
  @Input({ required: true }) title = '';
  @Input({ required: true }) description = '';
  @Input() tone: InsightTone = 'neutral';
  @Input() icon = '';
  @Input() actionLabel = '';
  @Input() interactive = false;
  @Input() compact = false;
  @Output() actionClicked = new EventEmitter<void>();
}

/* ======================================================================
   3. SectionFrameComponent
   ====================================================================== */
export type FrameDensity = 'comfortable' | 'compact';
export type FrameTone = 'default' | 'territory' | 'insight' | 'neutral';

@Component({
  selector: 'gr-section-frame',
  imports: [CommonModule],
  template: `
    <section
      class="section-frame"
      [class]="'section-frame ' + density + ' ' + tone"
      [attr.aria-label]="title || eyebrow"
    >
      @if (eyebrow || title || subtitle) {
        <header class="frame-header">
          <div class="frame-titles">
            @if (eyebrow) {
              <span class="frame-eyebrow">{{ eyebrow }}</span>
            }
            @if (title) {
              <h2 class="frame-title">{{ title }}</h2>
            }
            @if (subtitle) {
              <p class="frame-subtitle">{{ subtitle }}</p>
            }
          </div>
          <div class="frame-actions">
            <ng-content select="[frame-actions]" />
          </div>
        </header>
      }
      <div class="frame-content">
        <ng-content />
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; min-width: 0; height: 100%; }
    .section-frame {
      min-width: 0;
      height: 100%;
      display: flex;
      flex-direction: column;
      border: 1px solid var(--border-soft);
      border-radius: var(--radius-xl);
      background: var(--canvas-elevated);
      box-shadow: var(--shadow-2);
      overflow: hidden;
    }
    .territory {
      border-color: rgba(21, 121, 69, 0.2);
      background: linear-gradient(180deg, var(--canvas-elevated) 0%, var(--surface-territory) 100%);
    }
    .frame-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-4);
      padding: var(--space-5) var(--space-5) var(--space-3);
      border-bottom: 1px solid var(--divider-subtle);
    }
    .frame-titles { display: grid; gap: 2px; min-width: 0; }
    .frame-eyebrow {
      font-size: 0.6875rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text-accent);
    }
    .frame-title {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 780;
      letter-spacing: -0.025em;
      color: var(--text-primary);
    }
    .frame-subtitle {
      margin: 0;
      font-size: 0.75rem;
      color: var(--text-secondary);
    }
    .frame-actions { flex: 0 0 auto; }
    .frame-content {
      padding: var(--space-5);
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .compact .frame-header { padding: var(--space-3) var(--space-4); }
    .compact .frame-content { padding: var(--space-3) var(--space-4); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionFrameComponent {
  @Input() eyebrow = '';
  @Input() title = '';
  @Input() subtitle = '';
  @Input() density: FrameDensity = 'comfortable';
  @Input() tone: FrameTone = 'default';
}

/* ======================================================================
   4. ContextRailComponent
   ====================================================================== */
export interface ContextRailItem {
  id: string;
  label: string;
  value: string;
  tone: 'territory' | 'health' | 'warning' | 'reproduction' | 'planner' | 'movement' | 'neutral';
  description?: string;
  progress?: number;
  icon?: string;
}

@Component({
  selector: 'gr-context-rail',
  imports: [CommonModule],
  template: `
    <div class="rail-container" role="region" aria-label="Sinais e contexto da operação">
      @for (item of items; track item.id) {
        <article class="rail-item" [class]="'rail-item ' + item.tone" tabindex="0">
          <div class="item-accent" aria-hidden="true"></div>
          <div class="item-top">
            <span class="item-label">{{ item.label }}</span>
            @if (item.icon) {
              <span class="item-icon" aria-hidden="true">{{ item.icon }}</span>
            }
          </div>
          <strong class="item-value">{{ item.value }}</strong>
          @if (item.description) {
            <small class="item-desc">{{ item.description }}</small>
          }
          @if (item.progress !== undefined) {
            <div class="item-progress" role="progressbar" [attr.aria-valuenow]="item.progress" aria-valuemin="0" aria-valuemax="100">
              <span class="progress-bar" [style.width.%]="item.progress"></span>
            </div>
          }
        </article>
      }
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; min-width: 0; }
    .rail-container {
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: var(--space-3);
    }
    .rail-item {
      position: relative;
      min-width: 0;
      min-height: 6.85rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: var(--space-4);
      border: 1px solid var(--border-soft);
      border-radius: var(--radius-lg);
      background: var(--canvas-elevated);
      box-shadow: var(--shadow-1);
      overflow: hidden;
      transition:
        transform var(--motion-base) var(--ease-standard),
        box-shadow var(--motion-base) var(--ease-standard);
    }
    .rail-item:hover, .rail-item:focus-visible {
      transform: translateY(-2px);
      box-shadow: var(--shadow-2);
      outline: none;
    }
    .item-accent {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: var(--border-strong);
    }
    .rail-item.weight .item-accent, .rail-item.health .item-accent {
      background: linear-gradient(90deg, #6b52a5, #9b7fd8);
    }
    .rail-item.warning .item-accent {
      background: linear-gradient(90deg, var(--semantic-warning), #e08b1a);
    }
    .rail-item.reproduction .item-accent {
      background: linear-gradient(90deg, #8a58a6, #b886d3);
    }
    .rail-item.planner .item-accent, .rail-item.territory .item-accent {
      background: linear-gradient(90deg, var(--territory-green), #38a169);
    }
    .rail-item.movement .item-accent {
      background: linear-gradient(90deg, var(--semantic-info), #4ba5ce);
    }

    .item-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
    }
    .item-label {
      color: var(--text-tertiary);
      font-size: 0.6875rem;
      font-weight: 750;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .item-icon { font-size: 0.8rem; }
    .item-value {
      margin-top: 0.25rem;
      font-size: 1.45rem;
      line-height: 1;
      letter-spacing: -0.04em;
      font-weight: 800;
      color: var(--text-primary);
      font-variant-numeric: tabular-nums;
    }
    .item-desc {
      margin-top: 0.35rem;
      color: var(--text-secondary);
      font-size: 0.6875rem;
      line-height: 1.35;
    }
    .item-progress {
      height: 4px;
      margin-top: 0.6rem;
      overflow: hidden;
      border-radius: var(--radius-pill);
      background: var(--border-soft);
    }
    .progress-bar {
      display: block;
      height: 100%;
      border-radius: var(--radius-pill);
      background: linear-gradient(90deg, #6b52a5, #9b7fd8);
    }
    @media (max-width: 80rem) {
      .rail-container { grid-template-columns: repeat(3, 1fr); }
    }
    @media (max-width: 52rem) {
      .rail-container { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 36rem) {
      .rail-container { grid-template-columns: 1fr; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContextRailComponent {
  @Input({ required: true }) items: ContextRailItem[] = [];
}

/* ======================================================================
   5. OperationalListCardComponent
   ====================================================================== */
export interface OperationalListItem {
  id: string;
  title: string;
  context: string;
  date: string;
  formattedDate?: string;
  kind?: string;
  tone?: 'normal' | 'attention' | 'critical' | 'info';
  statusLabel?: string;
  meta?: string;
}

@Component({
  selector: 'gr-operational-list-card',
  imports: [CommonModule, RouterLink],
  template: `
    <section class="operational-list-card" [attr.aria-label]="title">
      <header class="card-head">
        <div>
          @if (kicker) {
            <span class="kicker">{{ kicker }}</span>
          }
          <h2 class="title">{{ title }}</h2>
        </div>
        @if (count !== undefined) {
          <span class="count-pill" [class]="countTone || 'neutral'">{{ count }}</span>
        }
      </header>
      <div class="list-body" [style.max-height]="maxHeight || '14rem'">
        <ng-content />
      </div>
      @if (footerLink && footerLabel) {
        <footer class="card-footer">
          <a [routerLink]="footerLink" class="footer-link">
            {{ footerLabel }} <span aria-hidden="true">→</span>
          </a>
        </footer>
      }
    </section>
  `,
  styles: [`
    :host { display: block; min-width: 0; height: 100%; }
    .operational-list-card {
      min-width: 0;
      height: 100%;
      display: flex;
      flex-direction: column;
      padding: var(--space-5);
      border: 1px solid var(--border-soft);
      border-radius: var(--radius-xl);
      background: var(--canvas-elevated);
      box-shadow: var(--shadow-2);
    }
    .card-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-3);
      margin-bottom: var(--space-3);
    }
    .kicker {
      display: block;
      color: var(--text-accent);
      font-size: 0.6875rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .title {
      margin: 0.15rem 0 0;
      font-size: 1.05rem;
      font-weight: 780;
      letter-spacing: -0.025em;
      color: var(--text-primary);
    }
    .count-pill {
      width: 1.85rem;
      height: 1.85rem;
      display: grid;
      place-items: center;
      border-radius: 50%;
      font-size: 0.75rem;
      font-weight: 800;
      border: 1px solid var(--border-soft);
    }
    .count-pill.attention {
      color: #925304;
      background: var(--color-warning-subtle);
      border-color: rgba(179, 102, 5, 0.25);
    }
    .count-pill.clear {
      color: var(--semantic-success);
      background: var(--territory-green-soft);
      border-color: rgba(21, 121, 69, 0.2);
    }
    .count-pill.neutral {
      color: var(--text-secondary);
      background: var(--surface-subtle);
    }
    .list-body {
      overflow-y: auto;
      overscroll-behavior: contain;
      flex: 1;
    }
    .card-footer {
      padding-top: var(--space-3);
      margin-top: auto;
    }
    .footer-link {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      color: var(--text-accent);
      font-size: 0.75rem;
      font-weight: 750;
      text-decoration: none;
    }
    .footer-link:hover { text-decoration: underline; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationalListCardComponent {
  @Input({ required: true }) title = '';
  @Input() kicker = '';
  @Input() count?: number;
  @Input() countTone?: 'neutral' | 'attention' | 'clear' = 'neutral';
  @Input() maxHeight?: string;
  @Input() footerLink?: string;
  @Input() footerLabel?: string;
}

/* ======================================================================
   6. DataVizFrameComponent
   ====================================================================== */
@Component({
  selector: 'gr-dataviz-frame',
  imports: [CommonModule],
  template: `
    <section class="dataviz-frame" [attr.aria-label]="title">
      <header class="viz-header">
        <div class="viz-titles">
          @if (kicker) {
            <span class="viz-kicker">{{ kicker }}</span>
          }
          <h2 class="viz-title">{{ title }}</h2>
          @if (subtitle) {
            <p class="viz-subtitle">{{ subtitle }}</p>
          }
        </div>
        <div class="viz-actions">
          @if (periodLabel) {
            <span class="period-badge">{{ periodLabel }}</span>
          }
          <ng-content select="[frame-actions]" />
        </div>
      </header>
      <div class="viz-body">
        <ng-content />
      </div>
      @if (footerText) {
        <footer class="viz-footer">
          <small>{{ footerText }}</small>
        </footer>
      }
    </section>
  `,
  styles: [`
    :host { display: block; min-width: 0; }
    .dataviz-frame {
      min-width: 0;
      padding: var(--space-5);
      border: 1px solid var(--border-soft);
      border-radius: var(--radius-xl);
      background: var(--canvas-elevated);
      box-shadow: var(--shadow-2);
    }
    .viz-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-4);
      margin-bottom: var(--space-3);
    }
    .viz-titles { display: grid; gap: 2px; }
    .viz-kicker {
      display: block;
      color: var(--semantic-info);
      font-size: 0.6875rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .viz-title {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 780;
      letter-spacing: -0.025em;
      color: var(--text-primary);
    }
    .viz-subtitle {
      margin: 0;
      font-size: 0.75rem;
      color: var(--text-secondary);
    }
    .viz-actions {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }
    .period-badge {
      color: var(--text-tertiary);
      font-size: 0.6875rem;
      font-weight: 600;
      padding: 3px 9px;
      border-radius: var(--radius-pill);
      background: var(--surface-subtle);
      border: 1px solid var(--border-soft);
    }
    .viz-body { min-width: 0; }
    .viz-footer {
      margin-top: var(--space-3);
      padding-top: var(--space-2);
      border-top: 1px solid var(--divider-subtle);
      color: var(--text-tertiary);
      font-size: 0.6875rem;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataVizFrameComponent {
  @Input({ required: true }) title = '';
  @Input() subtitle = '';
  @Input() kicker = '';
  @Input() periodLabel = '';
  @Input() footerText = '';
  @Input() emptyState = false;
}
