import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowRight, LucideChevronDown, LucideDynamicIcon } from '@lucide/angular';
import { BadgeComponent } from '../../design-system/primitives/primitives';
import { DomainIconComponent, type DomainIconName } from '../../design-system/primitives/domain-icon';
import type { OperationalUrgency } from './operational-urgency';
import type { OperationalUrgencyLevel } from './operational-urgency';
import type { UrgencyDetailFact } from './operational-urgency';

/**
 * OperationalUrgencyObject — objeto de urgência expansível inline.
 *
 * O summary é um <button> real que ocupa toda a área collapsed; a expansão
 * usa grid-rows 0fr→1fr (sem max-height hack, sem modal, sem biblioteca).
 * O CTA é um link real; nunca há interativo aninhado.
 */
@Component({
  selector: 'app-urgency-object',
  imports: [RouterLink, BadgeComponent, DomainIconComponent, LucideDynamicIcon],
  template: `<article class="urgency-object" [class.urgency-object--hero]="variant === 'hero'" [class.urgency-object--group]="variant === 'group'" [class.expanded]="expanded" [attr.data-level]="level">
    <span class="urgency-rail" aria-hidden="true"></span>
    <button
      type="button"
      class="urgency-object__summary"
      [attr.aria-expanded]="expanded"
      [attr.aria-controls]="panelId"
      [id]="triggerId"
      (click)="toggled.emit()"
    >
      <gr-domain-icon [domain]="icon" [size]="iconSize" />
      <span class="urgency-object__copy">
        <span class="urgency-object__eyebrow">{{ eyebrow }}</span>
        <strong class="urgency-object__headline">{{ headline }}</strong>
        <span class="urgency-object__title">{{ title }}</span>
        @if (context) {
          <small>{{ context }}</small>
        }
      </span>
      <span class="urgency-object__side">
        @if (date) {
          <time [attr.datetime]="date">{{ dateLabel }}</time>
        }
        @if (badgeText) {
          <gr-badge [tone]="badgeTone">{{ badgeText }}</gr-badge>
        }
      </span>
      <svg [lucideIcon]="chevronIcon" class="urgency-object__chevron" aria-hidden="true"></svg>
    </button>
    <div class="urgency-object__expansion" [id]="panelId" role="region" [attr.aria-labelledby]="triggerId" [attr.inert]="!expanded ? '' : null">
      <div class="urgency-object__expansion-inner">
        @if (facts.length) {
          <dl class="urgency-detail-grid">
            @for (fact of facts; track fact.label) {
              <div>
                <dt>{{ fact.label }}</dt>
                <dd>{{ fact.value }}</dd>
              </div>
            }
          </dl>
        }
        @if (items.length) {
          <ul class="urgency-member-list">
            @for (entry of items; track entry.id) {
              <li>
                <strong>{{ entry.title }}</strong>
                @if (entry.context) {
                  <span>{{ entry.context }}</span>
                }
                @if (entry.date) {
                  <time [attr.datetime]="entry.date">{{ entry.dateLabel }}</time>
                }
              </li>
            }
          </ul>
        }
        <a class="urgency-object__cta" [routerLink]="ctaRoute">
          {{ ctaLabel }}
          <svg [lucideIcon]="arrowIcon" aria-hidden="true"></svg>
        </a>
      </div>
    </div>
  </article>`,
  styles: [`
    .urgency-object {
      position: relative;
      min-width: 0;
      overflow: hidden;
      border: 1px solid var(--border-soft);
      border-radius: var(--radius-lg);
      background: var(--canvas-elevated);
      box-shadow: var(--shadow-1);
      transition:
        transform var(--motion-base) var(--ease-standard),
        box-shadow var(--motion-base) var(--ease-standard),
        border-color var(--motion-base) var(--ease-standard);
    }
    .urgency-object--hero {
      border-radius: var(--radius-xl);
    }
    .urgency-object:not(.expanded):has(.urgency-object__summary:hover) {
      transform: translateY(-2px);
      border-color: var(--border-strong);
      box-shadow: var(--shadow-2);
    }
    .urgency-object.expanded {
      transform: translateY(-2px);
      border-color: var(--border-strong);
      background: var(--surface-subtle);
      box-shadow: var(--shadow-2);
    }
    .urgency-rail {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      width: 4px;
      background: var(--border-strong);
    }
    [data-level="overdue"] > .urgency-rail { background: var(--semantic-danger); }
    [data-level="today"] > .urgency-rail { background: var(--brand-amber); }
    [data-level="imminent"] > .urgency-rail { background: var(--brand-live); }
    [data-level="week"] > .urgency-rail { background: var(--color-info); }
    [data-level="month"] > .urgency-rail { background: var(--color-primary); }
    [data-level="future"] > .urgency-rail { background: var(--border-strong); }
    .urgency-object__summary {
      width: 100%;
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto auto;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-4) var(--space-4) var(--space-4) calc(var(--space-4) + 4px);
      border: 0;
      color: var(--text-primary);
      background: transparent;
      text-align: left;
      cursor: pointer;
    }
    .urgency-object--hero .urgency-object__summary {
      padding: var(--space-5) var(--space-5) var(--space-5) calc(var(--space-5) + 4px);
      gap: var(--space-4);
    }
    .urgency-object__summary:hover {
      background: rgba(255, 255, 255, 0.35);
    }
    .urgency-object__summary:focus-visible {
      outline: 2px solid var(--color-focus);
      outline-offset: -2px;
    }
    .urgency-object__copy {
      display: grid;
      gap: 2px;
      min-width: 0;
    }
    .urgency-object__eyebrow {
      color: var(--text-tertiary);
      font-size: 0.625rem;
      font-weight: 800;
      letter-spacing: 0.07em;
      text-transform: uppercase;
    }
    .urgency-object__headline {
      font-family: var(--font-display);
      font-size: 1.1rem;
      line-height: 1.1;
      letter-spacing: -0.03em;
      font-weight: 780;
      color: var(--text-primary);
    }
    .urgency-object--hero .urgency-object__headline {
      font-size: clamp(1.6rem, 2.4vw, 2.1rem);
      line-height: 1.05;
      letter-spacing: -0.04em;
    }
    .urgency-object__title {
      overflow: hidden;
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--text-primary);
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .urgency-object__copy small {
      overflow: hidden;
      color: var(--text-secondary);
      font-size: 0.75rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .urgency-object__side {
      display: grid;
      justify-items: end;
      gap: var(--space-2);
    }
    .urgency-object__side time {
      color: var(--text-secondary);
      font-size: 0.75rem;
      font-weight: 650;
      font-variant-numeric: tabular-nums;
    }
    .urgency-object__chevron {
      width: 1rem;
      height: 1rem;
      color: var(--text-tertiary);
      transition: transform var(--motion-fast) var(--ease-standard);
    }
    .expanded .urgency-object__chevron {
      transform: rotate(180deg);
      color: var(--text-secondary);
    }
    .urgency-object__expansion {
      display: grid;
      grid-template-rows: 0fr;
      opacity: 0;
      visibility: hidden;
      transition:
        grid-template-rows var(--motion-slow) var(--ease-emphasized),
        opacity var(--motion-base) var(--ease-standard),
        visibility var(--motion-base) var(--ease-standard);
    }
    .urgency-object__expansion-inner {
      min-height: 0;
      overflow: hidden;
    }
    .expanded .urgency-object__expansion {
      grid-template-rows: 1fr;
      opacity: 1;
      visibility: visible;
    }
    .expanded .urgency-object__expansion-inner > * {
      animation: urgency-content-in var(--motion-base) var(--ease-standard) 60ms backwards;
    }
    @keyframes urgency-content-in {
      from { opacity: 0; transform: translateY(-4px); }
    }
    .urgency-detail-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-2) var(--space-4);
      margin: 0;
      padding: var(--space-1) var(--space-4) 0 calc(var(--space-4) + 4px);
    }
    .urgency-detail-grid > div {
      display: grid;
      gap: 1px;
      min-width: 0;
    }
    .urgency-detail-grid dt {
      color: var(--text-tertiary);
      font-size: 0.625rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .urgency-detail-grid dd {
      margin: 0;
      color: var(--text-primary);
      font-size: 0.8125rem;
      font-weight: 650;
    }
    .urgency-member-list {
      display: grid;
      margin: var(--space-3) 0 0;
      padding: var(--space-1) var(--space-4) 0 calc(var(--space-4) + 4px);
      list-style: none;
    }
    .urgency-member-list li {
      display: grid;
      gap: 1px;
      padding: 0.55rem 0;
      border-top: 1px dashed var(--border-soft);
    }
    .urgency-member-list strong {
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--text-primary);
    }
    .urgency-member-list span {
      overflow: hidden;
      color: var(--text-tertiary);
      font-size: 0.6875rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .urgency-member-list time {
      color: var(--text-secondary);
      font-size: 0.6875rem;
      font-weight: 650;
      font-variant-numeric: tabular-nums;
    }
    .urgency-object__cta {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      margin: var(--space-3) var(--space-4) var(--space-4) calc(var(--space-4) + 4px);
      color: var(--color-primary);
      font-size: 0.8125rem;
      font-weight: 700;
      text-decoration: none;
    }
    .urgency-object__cta:hover {
      text-decoration: underline;
      color: var(--color-primary-hover);
    }
    .urgency-object__cta svg {
      width: 0.9rem;
      height: 0.9rem;
    }
    @media (max-width: 40rem) {
      .urgency-object__summary {
        grid-template-columns: auto minmax(0, 1fr) auto;
      }
      .urgency-object__side {
        grid-column: 2;
        justify-items: start;
      }
      .urgency-detail-grid {
        grid-template-columns: minmax(0, 1fr);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .urgency-object,
      .urgency-object__expansion,
      .urgency-object__chevron {
        transition: none;
      }
      .expanded .urgency-object__expansion-inner > * {
        animation: none;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationalUrgencyObjectComponent {
  @Input() objectId = '';
  @Input() level: OperationalUrgency['level'] = 'future';
  @Input() variant: 'hero' | 'group' = 'group';
  @Input() icon: DomainIconName = 'traceability';
  @Input() iconSize: 'md' | 'lg' = 'md';
  @Input() eyebrow = '';
  @Input() headline = '';
  @Input() title = '';
  @Input() context = '';
  @Input() date = '';
  @Input() dateLabel = '';
  @Input() badgeText = '';
  @Input() badgeTone: 'danger' | 'attention' | 'success' | 'neutral' = 'neutral';
  @Input() facts: UrgencyDetailFact[] = [];
  @Input() items: { id: string; title: string; context: string; date: string; dateLabel: string }[] = [];
  @Input() ctaRoute = '/rebanho/agenda';
  @Input() ctaLabel = 'Ver agenda';
  @Input() expanded = false;
  @Output() toggled = new EventEmitter<void>();

  protected readonly chevronIcon = LucideChevronDown;
  protected readonly arrowIcon = LucideArrowRight;

  get triggerId(): string {
    return `urgency-trigger-${sanitizeDomId(this.objectId)}`;
  }

  get panelId(): string {
    return `urgency-panel-${sanitizeDomId(this.objectId)}`;
  }
}

function sanitizeDomId(value: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9_-]/g, '-');
  return cleaned || 'object';
}
