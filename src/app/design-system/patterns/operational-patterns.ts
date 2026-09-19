import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

export interface TerritoryRegion {
  id: string;
  name: string;
  count: number;
  status: 'normal' | 'attention' | 'empty';
  path: string;
  labelX?: number;
  labelY?: number;
  detail?: string;
  density?: number;
}

@Component({
  selector: 'gr-territory-field',
  template: ` <section class="field" [class.compact]="compact" aria-label="Representação operacional do território">
    <div class="field-head">
      <div>
        <span class="eyebrow">Território sem escala</span><strong>{{ title }}</strong>
      </div>
      <span class="scope">{{ scope }}</span>
    </div>
    <svg viewBox="0 0 720 380" role="img" [attr.aria-label]="label">
      <defs>
        <pattern id="field-grid" width="28" height="28" patternUnits="userSpaceOnUse">
          <path d="M 28 0 L 0 0 0 28" fill="none" stroke="currentColor" stroke-width=".6" />
        </pattern>
        <pattern id="field-density" width="17" height="17" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="5" r="1.15"/><circle cx="13" cy="11" r=".7"/>
        </pattern>
        <filter id="field-shadow">
          <feDropShadow dx="0" dy="5" stdDeviation="7" flood-opacity=".08" />
        </filter>
      </defs>
      <rect class="grid" width="720" height="380" fill="url(#field-grid)" />
      <path
        class="contour"
        d="M-20 76C104 19 137 116 252 67s188-25 279 20 145-8 218-54M-12 319c116-68 189 24 294-30s173-61 281-5 148-7 193-53"
      />
      @for (region of regions; track region.id) {
        <g
          class="region"
          [class.selected]="region.id === selected"
          [class.receded]="selected && region.id !== selected"
          [class.attention]="region.status === 'attention'"
          [class.empty]="region.status === 'empty'"
          tabindex="0"
          role="button"
          [attr.aria-label]="regionLabel(region)"
          [attr.aria-pressed]="region.id === selected"
          (click)="selectedChange.emit(region.id)"
          (keydown.enter)="selectedChange.emit(region.id)"
          (keydown.space)="$event.preventDefault(); selectedChange.emit(region.id)"
        >
          <path class="land" [attr.d]="region.path" filter="url(#field-shadow)" />
          <path class="density" [attr.d]="region.path" fill="url(#field-density)" [style.opacity]="region.density || 0" />
          <text
            [attr.x]="labelPosition(region.id).x"
            [attr.y]="labelPosition(region.id).y"
            text-anchor="middle"
          >
            <tspan class="name">{{ region.name }}</tspan>
            <tspan class="count" dy="22" [attr.x]="labelPosition(region.id).x">
              {{ region.detail || (region.count ? region.count + (region.count === 1 ? ' animal' : ' animais') : 'Sem animais') }}
            </tspan>
          </text>
        </g>
      }
    </svg>
    <footer>
      <span><i class="legend normal"></i>Com animais</span
      ><span><i class="legend vacant"></i>Sem animais</span
      ><span class="hint">Selecione uma região para destacar</span>
    </footer>
  </section>`,
  styles: [
    `
      :host {
        display: block;
      }
      .field {
        overflow: hidden;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-xl);
        background: var(--color-canvas);
        box-shadow: var(--shadow-raised);
      }
      .field-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--space-4);
        padding: var(--space-5) var(--space-6) 0;
      }
      .field-head > div {
        display: grid;
        gap: 2px;
      }
      .field-head strong {
        font-size: 1rem;
      }
      .eyebrow {
        color: var(--color-primary);
        font-size: 0.6875rem;
        font-weight: 700;
        letter-spacing: 0.075em;
        text-transform: uppercase;
      }
      .scope {
        padding: var(--space-1) var(--space-2);
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
        color: var(--color-text-secondary);
        background: rgb(255 255 255/0.58);
        font-size: 0.6875rem;
      }
      svg {
        display: block;
        width: 100%;
        height: auto;
        max-height: 28rem;
        color: rgb(19 86 58/0.09);
      }
      .field.compact svg { max-height: 19rem; }
      .grid {
        pointer-events: none;
      }
      .contour {
        fill: none;
        stroke: rgb(19 86 58/0.13);
        stroke-width: 1;
      }
      .region {
        cursor: pointer;
        outline: none;
        transition: opacity var(--duration-standard) var(--ease-standard);
      }
      .region .land {
        fill: #dce9df;
        stroke: #7fa58a;
        stroke-width: 2;
        transition:
          fill var(--duration-standard) var(--ease-standard),
          stroke var(--duration-standard) var(--ease-standard),
          stroke-width var(--duration-standard) var(--ease-standard);
      }
      .region:hover .land,
      .region:focus .land,
      .region.selected .land {
        fill: #c8dfcf;
        stroke: var(--color-primary);
        stroke-width: 3;
      }
      .region:focus-visible .land {
        filter: drop-shadow(0 0 5px rgb(19 86 58/0.35));
      }
      .region.receded {
        opacity: 0.52;
      }
      .region.attention .land {
        fill: #f1dfbc;
        stroke: #bc7a25;
      }
      .region.attention:hover .land,
      .region.attention:focus .land,
      .region.attention.selected .land {
        fill: #ead09e;
        stroke: #985706;
      }
      .region.empty .land {
        fill: #f4f7f4;
        stroke: #aebdb2;
        stroke-dasharray: 7 6;
      }
      .region text {
        pointer-events: none;
        fill: var(--color-text);
      }
      .region .name {
        font-size: 14px;
        font-weight: 700;
      }
      .region .count {
        fill: var(--color-text-secondary);
        font-size: 12px;
        font-weight: 500;
      }
      .density{pointer-events:none;fill:#315f40;transition:opacity var(--duration-standard)}
      footer {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: var(--space-4);
        padding: var(--space-3) var(--space-5);
        border-top: 1px solid var(--color-border);
        color: var(--color-text-secondary);
        background: rgb(255 255 255/0.55);
        font-size: 0.6875rem;
      }
      footer span {
        display: inline-flex;
        align-items: center;
        gap: var(--space-2);
      }
      .legend {
        width: 0.5rem;
        height: 0.5rem;
        border-radius: 2px;
        background: #7fa58a;
      }
      .legend.warning {
        background: #bc7a25;
      }
      .legend.vacant {
        border: 1px dashed #91a395;
        background: #f4f7f4;
      }
      .hint {
        margin-left: auto;
      }
      @media (max-width: 42rem) {
        .field-head {
          padding: var(--space-4) var(--space-4) 0;
        }
        .scope {
          display: none;
        }
        footer {
          gap: var(--space-2) var(--space-4);
        }
        .hint {
          width: 100%;
          margin-left: 0;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TerritoryFieldComponent {
  @Input() title = 'Campo territorial';
  @Input() scope = 'Fazenda Norte';
  @Input() label = 'Distribuição demonstrativa do rebanho por área';
  @Input() regions: TerritoryRegion[] = [];
  @Input() selected = '';
  @Input() compact = false;
  @Output() selectedChange = new EventEmitter<string>();
  labelPosition(id: string): { x: number; y: number } {
    const region = this.regions.find(item => item.id === id);
    if (region?.labelX !== undefined && region.labelY !== undefined) return { x: region.labelX, y: region.labelY };
    return (
      (
        {
          norte: { x: 200, y: 120 },
          leste: { x: 487, y: 115 },
          sul: { x: 260, y: 280 },
          retiro: { x: 545, y: 276 },
        } as Record<string, { x: number; y: number }>
      )[id] ?? { x: 360, y: 190 }
    );
  }
  regionLabel(region: TerritoryRegion): string {
    const count = `${region.count} ${region.count === 1 ? 'animal' : 'animais'}`;
    return [region.name, count, region.detail].filter(Boolean).join(', ');
  }
}

@Component({
  selector: 'gr-process-rail',
  template: `<ol aria-label="Etapas do processo">
    @for (step of steps; track step.label; let index = $index) {
      <li [class.complete]="index < active" [class.active]="index === active">
        <span>{{ index < active ? '✓' : index + 1 }}</span>
        <div>
          <strong>{{ step.label }}</strong
          ><small>{{ step.detail }}</small>
        </div>
      </li>
    }
  </ol>`,
  styles: [
    `
      ol {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        margin: 0;
        padding: 0;
        list-style: none;
      }
      li {
        position: relative;
        display: grid;
        grid-template-columns: 1.75rem 1fr;
        gap: var(--space-2);
        padding-right: var(--space-3);
        color: var(--color-text-muted);
      }
      li:not(:last-child):after {
        position: absolute;
        z-index: 0;
        top: 0.85rem;
        left: 1.75rem;
        width: calc(100% - 1.75rem);
        height: 1px;
        background: var(--color-border-strong);
        content: '';
      }
      li > span {
        position: relative;
        z-index: 1;
        width: 1.75rem;
        height: 1.75rem;
        display: grid;
        place-items: center;
        border: 1px solid var(--color-border-strong);
        border-radius: 50%;
        background: var(--color-surface);
        font-size: 0.6875rem;
        font-weight: 700;
      }
      li > div {
        display: grid;
        gap: 2px;
        padding-top: 3px;
      }
      strong {
        color: var(--color-text-secondary);
        font-size: 0.75rem;
      }
      small {
        font-size: 0.6875rem;
      }
      .complete > span {
        border-color: var(--color-primary);
        color: white;
        background: var(--color-primary);
      }
      .complete:after {
        background: var(--color-primary);
      }
      .active > span {
        border: 2px solid var(--color-primary);
        color: var(--color-primary);
        background: var(--color-primary-subtle);
      }
      .active strong {
        color: var(--color-primary);
      }
      @media (max-width: 42rem) {
        ol {
          grid-template-columns: 1fr;
          gap: var(--space-3);
        }
        li {
          min-height: 3rem;
        }
        li:not(:last-child):after {
          top: 1.75rem;
          left: 0.85rem;
          width: 1px;
          height: calc(100% + var(--space-3) - 1.75rem);
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProcessRailComponent {
  @Input() active = 1;
  @Input() steps: { label: string; detail: string }[] = [];
}

@Component({
  selector: 'gr-timeline',
  template: `<ol>
    @for (item of items; track item.title; let first = $first) {
      <li [class.current]="first">
        <time>{{ item.time }}</time
        ><span class="marker" aria-hidden="true"></span>
        <div>
          <strong>{{ item.title }}</strong>
          <p>{{ item.description }}</p>
          <small>{{ item.meta }}</small>
        </div>
      </li>
    }
  </ol>`,
  styles: [
    `
      ol {
        margin: 0;
        padding: 0;
        list-style: none;
      }
      li {
        position: relative;
        display: grid;
        grid-template-columns: 4.5rem 1.25rem 1fr;
        gap: var(--space-3);
        min-height: 4.75rem;
      }
      li:not(:last-child):after {
        position: absolute;
        top: 1.25rem;
        bottom: 0;
        left: 5.06rem;
        width: 1px;
        background: var(--color-border);
        content: '';
      }
      time {
        padding-top: 2px;
        color: var(--color-text-muted);
        font-size: 0.6875rem;
        font-variant-numeric: tabular-nums;
      }
      .marker {
        z-index: 1;
        width: 0.625rem;
        height: 0.625rem;
        margin-top: 0.25rem;
        border: 2px solid var(--color-surface);
        border-radius: 50%;
        background: var(--color-border-strong);
        box-shadow: 0 0 0 1px var(--color-border-strong);
      }
      .current .marker {
        background: var(--color-primary);
        box-shadow: 0 0 0 1px var(--color-primary);
      }
      li > div {
        display: grid;
        align-content: start;
        gap: 2px;
        padding-bottom: var(--space-4);
      }
      strong {
        font-size: 0.8125rem;
      }
      p {
        margin: 0;
        font-size: 0.75rem;
      }
      small {
        color: var(--color-text-muted);
        font-size: 0.6875rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelineComponent {
  @Input() items: { time: string; title: string; description: string; meta: string }[] = [];
}
