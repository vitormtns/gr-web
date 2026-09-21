import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * BrandGrowthBars — barras ascendentes da marca eBov.
 *
 * 4 barras verticais em `currentColor`, assumindo a cor do contexto
 * (brand-live, off-white, verde muted). Puramente decorativo.
 *
 * Uso permitido: branded insight, detalhe de header, empty state premium,
 * superfície institucional selecionada. Não animar continuamente e não
 * espalhar pelos cards operacionais.
 */
@Component({
  selector: 'gr-brand-growth-bars',
  template: `<svg viewBox="0 0 56 40" fill="none" aria-hidden="true">
    <rect x="2" y="26" width="9" height="12" rx="2.5" fill="currentColor" opacity="0.35" />
    <rect x="15" y="19" width="9" height="19" rx="2.5" fill="currentColor" opacity="0.55" />
    <rect x="28" y="11" width="9" height="27" rx="2.5" fill="currentColor" opacity="0.75" />
    <rect x="41" y="3" width="9" height="35" rx="2.5" fill="currentColor" />
  </svg>`,
  styles: [`
    :host {
      display: inline-block;
      pointer-events: none;
    }
    svg {
      display: block;
      width: 100%;
      height: auto;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
})
export class BrandGrowthBarsComponent {}
