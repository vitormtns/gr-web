import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { BrandContourComponent } from './brand-contour';
import { BrandGrowthBarsComponent } from '../primitives/brand-growth-bars';

/**
 * BrandedInsightSurface — superfície institucional verde para UM insight real.
 *
 * Fundo brand-primary, texto off-white, acento brand-live, motivos da marca
 * (contours + barras, decorativos). Renderizar somente quando houver insight
 * operacional apropriado; nunca como propaganda fixa ou card fake.
 */
@Component({
  selector: 'gr-branded-insight-surface',
  imports: [BrandContourComponent, BrandGrowthBarsComponent],
  template: `<section class="branded-insight" aria-label="Leitura da operação">
    <gr-brand-contour class="motif-contour" />
    <div class="copy">
      <span class="kicker">Leitura da operação</span>
      <strong>{{ title }}</strong>
      <p>{{ description }}</p>
    </div>
    <gr-brand-growth-bars class="motif-bars" />
  </section>`,
  styles: [`
    :host {
      display: block;
      min-width: 0;
    }
    .branded-insight {
      position: relative;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-5);
      overflow: hidden;
      border-radius: var(--radius-xl);
      color: #fafaf8;
      background: var(--brand-primary);
      box-shadow: var(--shadow-1);
    }
    .branded-insight::before {
      content: '';
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      width: 3px;
      background: var(--brand-live);
    }
    .copy {
      position: relative;
      z-index: 1;
      display: grid;
      gap: 0.35rem;
      min-width: 0;
    }
    .kicker {
      font-size: 0.6875rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--brand-live);
    }
    .copy strong {
      font-family: var(--font-display);
      font-size: 1.0625rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .copy p {
      margin: 0;
      font-size: 0.8125rem;
      line-height: 1.5;
      color: rgba(250, 250, 248, 0.82);
    }
    .motif-contour {
      position: absolute;
      right: -2rem;
      bottom: -1.5rem;
      width: 16rem;
      color: rgba(255, 255, 255, 0.5);
    }
    .motif-bars {
      position: relative;
      z-index: 1;
      width: 3.25rem;
      color: var(--brand-live);
    }
    @media (max-width: 40rem) {
      .motif-contour {
        width: 10rem;
      }
      .motif-bars {
        width: 2.5rem;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandedInsightSurfaceComponent {
  @Input({ required: true }) title = '';
  @Input({ required: true }) description = '';
}
