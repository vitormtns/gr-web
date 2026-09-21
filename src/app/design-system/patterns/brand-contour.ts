import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * BrandContour — motivo gráfico decorativo da identidade eBov.
 *
 * Arcos orgânicos + barras ascendentes (crescimento), em `currentColor`.
 * Uso opcional e restrito a superfícies institucionais, empty states,
 * painéis de contexto selecionado ou superfícies de marca.
 *
 * Não usar em cards operacionais nem espalhar pela interface.
 * Puramente decorativo: `aria-hidden` no host.
 */
@Component({
  selector: 'gr-brand-contour',
  template: `<svg viewBox="0 0 200 120" fill="none" aria-hidden="true">
    <path d="M-8 96C48 72 72 88 118 54s62-22 90-34" stroke="currentColor" stroke-width="1.5" opacity="0.45" />
    <path d="M-8 108C52 88 80 102 124 72s64-24 84-38" stroke="currentColor" stroke-width="1.5" opacity="0.22" />
    <rect x="140" y="78" width="10" height="26" rx="3" fill="currentColor" opacity="0.2" />
    <rect x="154" y="66" width="10" height="38" rx="3" fill="currentColor" opacity="0.32" />
    <rect x="168" y="52" width="10" height="52" rx="3" fill="currentColor" opacity="0.45" />
  </svg>`,
  styles: [`
    :host {
      display: block;
      overflow: hidden;
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
export class BrandContourComponent {}
