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
      <article [class]="metric.tone || 'neutral'">
        <span class="metric-icon" aria-hidden="true">{{ metric.icon }}</span>
        <div><span>{{ metric.label }}</span><strong>{{ metric.value }}</strong><small>{{ metric.detail }}</small></div>
      </article>
    }
  </section>`,
  styles: [`
    :host{display:block;min-width:0}.deck{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));overflow:hidden;border:1px solid var(--color-border-strong);border-radius:var(--radius-lg);background:var(--color-border);box-shadow:var(--shadow-raised),inset 0 1px #fff}article{position:relative;min-width:0;min-height:4.9rem;display:grid;grid-template-columns:1.75rem minmax(0,1fr);align-items:center;gap:.7rem;padding:.75rem .9rem;background:var(--color-surface)}article+article{border-left:1px solid var(--color-border)}article.attention{background:color-mix(in srgb,var(--color-warning-subtle) 44%,var(--color-surface))}.metric-icon{width:1.75rem;height:1.75rem;display:grid;place-items:center;border-radius:.55rem;color:var(--color-primary);background:var(--color-primary-subtle);font-size:.8rem;font-weight:780}.attention .metric-icon{color:var(--color-warning);background:var(--color-warning-subtle)}article>div{min-width:0;display:grid}.deck span:not(.metric-icon){overflow:hidden;color:var(--color-text-muted);font-size:.625rem;font-weight:680;letter-spacing:.035em;text-overflow:ellipsis;white-space:nowrap}.deck strong{font-size:1.28rem;line-height:1.05;letter-spacing:-.045em;font-variant-numeric:tabular-nums}.deck small{overflow:hidden;margin-top:.1rem;color:var(--color-text-secondary);font-size:.6rem;text-overflow:ellipsis;white-space:nowrap}@media(max-width:72rem){.deck{grid-template-columns:repeat(6,1fr)}article{grid-column:span 2}article:nth-child(4),article:nth-child(5){grid-column:span 3;border-top:1px solid var(--color-border)}article:nth-child(4){border-left:0}}@media(max-width:42rem){.deck{grid-template-columns:repeat(2,1fr)}article,article:nth-child(4){grid-column:span 1}article:nth-child(5){grid-column:span 2}article:nth-child(odd){border-left:0}article:nth-child(n+3){border-top:1px solid var(--color-border)}}
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricDeckComponent { @Input({ required: true }) metrics: OperationalMetric[] = []; }
