import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-home-mini-series',
  template: `<svg viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 31.5H100" class="baseline" />
    @for (bar of bars(); track $index) {
      <rect
        [attr.x]="bar.x"
        [attr.y]="bar.y"
        [attr.width]="bar.width"
        [attr.height]="bar.height"
        rx="1"
      />
    }
  </svg>`,
  styles: [
    `
      :host {
        display: block;
        height: 2rem;
        color: #148552;
      }
      svg {
        display: block;
        width: 100%;
        height: 100%;
        fill: currentColor;
      }
      .baseline {
        fill: none;
        stroke: currentColor;
        stroke-width: 0.6;
        opacity: 0.3;
      }
      :host([data-tone='blue']) {
        color: #228dc2;
      }
      :host([data-tone='violet']) {
        color: #9358ce;
      }
      :host([data-tone='amber']) {
        color: #cb8a15;
      }
      :host([data-tone='red']) {
        color: #ce3941;
      }
    `,
  ],
  host: { '[attr.data-tone]': 'tone' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeMiniSeriesComponent {
  @Input() values: readonly number[] = [];
  @Input() tone: 'green' | 'blue' | 'violet' | 'amber' | 'red' = 'green';
  bars() {
    const values = this.values.slice(-12);
    const max = Math.max(1, ...values);
    const slot = 100 / Math.max(1, values.length);
    return values.map((value, index) => {
      const height = value <= 0 ? 0 : Math.max(2, (value / max) * 30);
      return { x: index * slot + 1, y: 32 - height, width: Math.max(1, slot - 2), height };
    });
  }
}
