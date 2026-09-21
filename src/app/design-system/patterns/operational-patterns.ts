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
  template: `<section class="field" [class.compact]="compact" aria-label="Representação operacional do território">
    <div class="field-head">
      <div>
        <span class="eyebrow">Território sem escala</span>
        <strong>{{ title }}</strong>
      </div>
      <span class="scope">{{ scope }}</span>
    </div>
    <svg viewBox="0 0 720 380" role="img" [attr.aria-label]="label">
      <defs>
        <pattern id="field-grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(18,84,52,0.06)" stroke-width=".75" />
        </pattern>
        <pattern id="field-density" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="4" r="1.3" fill="rgba(18,84,52,0.35)" />
          <circle cx="12" cy="12" r="0.9" fill="rgba(18,84,52,0.25)" />
        </pattern>
        <linearGradient id="paddock-grad-normal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#d7edd9" />
          <stop offset="100%" stop-color="#b6dcc1" />
        </linearGradient>
        <linearGradient id="paddock-grad-attention" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fdf1dc" />
          <stop offset="100%" stop-color="#f4d498" />
        </linearGradient>
        <linearGradient id="paddock-grad-empty" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f8faf8" />
          <stop offset="100%" stop-color="#edf2ed" />
        </linearGradient>
        <filter id="field-shadow" x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#0b1910" flood-opacity=".10" />
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#0b1910" flood-opacity=".06" />
        </filter>
        <filter id="field-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="8" flood-color="#125434" flood-opacity=".32" />
          <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#0b1910" flood-opacity=".15" />
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
            <tspan class="count" dy="21" [attr.x]="labelPosition(region.id).x">
              {{ region.detail || (region.count ? region.count + (region.count === 1 ? ' animal' : ' animais') : 'Sem animais') }}
            </tspan>
          </text>
        </g>
      }
    </svg>
    <footer>
      <span><i class="legend normal" aria-hidden="true"></i>Ocupados</span>
      <span><i class="legend vacant" aria-hidden="true"></i>Sem animais</span>
      <span><i class="legend unlocated" aria-hidden="true"></i>Sem localização (fora do field)</span>
      <span><i class="legend warning" aria-hidden="true"></i>Atenção</span>
      <span class="hint">Selecione uma área para inspecionar</span>
    </footer>
  </section>`,
  styles: [`
    :host {
      display: block;
    }
    .field {
      overflow: hidden;
      border: 1px solid var(--border-soft);
      border-radius: var(--radius-xl);
      background: linear-gradient(155deg, var(--surface-territory) 0%, rgba(224, 238, 227, 0.95) 100%);
      box-shadow: var(--shadow-raised);
      position: relative;
    }
    .field-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-4);
      padding: var(--space-4) var(--space-5) 0;
    }
    .field-head > div {
      display: grid;
      gap: 2px;
    }
    .field-head strong {
      font-size: 1rem;
      font-weight: 750;
      letter-spacing: -0.015em;
      color: var(--color-text);
    }
    .eyebrow {
      color: var(--color-primary);
      font-size: 0.6875rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .scope {
      padding: 3px 9px;
      border: 1px solid var(--color-border-strong);
      border-radius: 999px;
      color: var(--color-text-secondary);
      background: rgba(255, 255, 255, 0.75);
      backdrop-filter: blur(8px);
      font-size: 0.6875rem;
      font-weight: 650;
    }
    svg {
      display: block;
      width: 100%;
      height: auto;
      max-height: 28rem;
    }
    .field.compact svg {
      max-height: 19.5rem;
    }
    .grid { pointer-events: none; }
    .contour {
      fill: none;
      stroke: rgba(18, 84, 52, 0.12);
      stroke-width: 1;
      stroke-dasharray: 4 4;
    }
    .region {
      cursor: pointer;
      outline: none;
      transition: opacity var(--duration-standard) var(--ease-standard);
    }
    .region .land {
      fill: url(#paddock-grad-normal);
      stroke: #5d936e;
      stroke-width: 2.25;
      stroke-linejoin: round;
      transition:
        fill var(--duration-standard) var(--ease-standard),
        stroke var(--duration-standard) var(--ease-standard),
        stroke-width var(--duration-standard) var(--ease-standard),
        transform var(--duration-standard) var(--ease-standard);
    }
    .region:hover .land,
    .region:focus .land,
    .region.selected .land {
      fill: #aed9b6;
      stroke: var(--color-primary);
      stroke-width: 3.25;
    }
    .region.selected .land {
      filter: url(#field-glow);
    }
    .region:focus-visible .land {
      stroke: var(--color-focus);
      stroke-width: 3.5;
    }
    .region.receded {
      opacity: 0.45;
    }
    .region.attention .land {
      fill: url(#paddock-grad-attention);
      stroke: #c27b1c;
    }
    .region.attention:hover .land,
    .region.attention:focus .land,
    .region.attention.selected .land {
      fill: #f5cf8c;
      stroke: #925304;
    }
    .region.empty .land {
      fill: url(#paddock-grad-empty);
      stroke: #a2b7a8;
      stroke-dasharray: 6 5;
    }
    .region text {
      pointer-events: none;
      fill: var(--color-text);
      font-family: inherit;
    }
    .region .name {
      font-size: 13.5px;
      font-weight: 780;
      letter-spacing: -0.015em;
      paint-order: stroke fill;
      stroke: rgba(255, 255, 255, 0.85);
      stroke-width: 3px;
      stroke-linejoin: round;
    }
    .region .count {
      fill: var(--color-text-secondary);
      font-size: 11.5px;
      font-weight: 650;
      font-variant-numeric: tabular-nums;
      paint-order: stroke fill;
      stroke: rgba(255, 255, 255, 0.85);
      stroke-width: 2.5px;
      stroke-linejoin: round;
    }
    .density {
      pointer-events: none;
      transition: opacity var(--duration-standard);
    }
    footer {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--space-4);
      padding: var(--space-3) var(--space-5);
      border-top: 1px solid var(--border-soft);
      color: var(--color-text-secondary);
      background: rgba(255, 255, 255, 0.75);
      backdrop-filter: blur(8px);
      font-size: 0.6875rem;
      font-weight: 550;
    }
    footer span {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
    }
    .legend {
      width: 0.65rem;
      height: 0.65rem;
      border-radius: 3px;
      background: #5d936e;
      box-shadow: 0 1px 2px rgba(11, 25, 16, 0.12);
    }
    .legend.warning {
      background: #c27b1c;
    }
    .legend.vacant {
      border: 1px dashed #8fa395;
      background: #edf2ed;
      box-shadow: none;
    }
    .legend.unlocated {
      border: 1.5px solid var(--color-warning);
      border-radius: 50%;
      background: transparent;
      box-shadow: none;
    }
    .hint {
      margin-left: auto;
      color: var(--color-text-muted);
      font-weight: 500;
    }
    @media (max-width: 42rem) {
      .field-head { padding: var(--space-3) var(--space-4) 0; }
      .scope { display: none; }
      footer { gap: var(--space-2) var(--space-3); }
      .hint { width: 100%; margin-left: 0; }
    }
  `],
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
          <strong>{{ step.label }}</strong>
          <small>{{ step.detail }}</small>
        </div>
      </li>
    }
  </ol>`,
  styles: [`
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
      grid-template-columns: 2rem 1fr;
      gap: var(--space-2);
      padding-right: var(--space-3);
      color: var(--color-text-muted);
    }
    li:not(:last-child)::after {
      position: absolute;
      z-index: 0;
      top: 1rem;
      left: 2rem;
      width: calc(100% - 2rem);
      height: 2px;
      background: var(--color-border);
      content: '';
    }
    li > span {
      position: relative;
      z-index: 1;
      width: 2rem;
      height: 2rem;
      display: grid;
      place-items: center;
      border: 1.5px solid var(--color-border-strong);
      border-radius: 50%;
      background: var(--color-surface);
      font-size: 0.75rem;
      font-weight: 750;
      transition: all var(--duration-fast);
    }
    li > div {
      display: grid;
      gap: 2px;
      padding-top: 3px;
    }
    strong {
      color: var(--color-text-secondary);
      font-size: 0.78rem;
      font-weight: 680;
    }
    small {
      font-size: 0.6875rem;
      color: var(--color-text-muted);
    }
    .complete > span {
      border-color: var(--color-primary);
      color: white;
      background: var(--color-primary);
      box-shadow: 0 0 8px rgba(18, 84, 52, 0.3);
    }
    .complete::after {
      background: var(--color-primary);
    }
    .active > span {
      border: 2px solid var(--color-primary);
      color: var(--color-primary);
      background: var(--color-primary-subtle);
      box-shadow: 0 0 0 3px rgba(18, 84, 52, 0.15);
    }
    .active strong {
      color: var(--color-primary);
      font-weight: 750;
    }
    @media (max-width: 42rem) {
      ol {
        grid-template-columns: 1fr;
        gap: var(--space-3);
      }
      li { min-height: 3rem; }
      li:not(:last-child)::after {
        top: 2rem;
        left: 0.95rem;
        width: 2px;
        height: calc(100% + var(--space-3) - 2rem);
      }
    }
  `],
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
        <time>{{ item.time }}</time>
        <span class="marker" aria-hidden="true"></span>
        <div>
          <strong>{{ item.title }}</strong>
          <p>{{ item.description }}</p>
          <small>{{ item.meta }}</small>
        </div>
      </li>
    }
  </ol>`,
  styles: [`
    ol {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    li {
      position: relative;
      display: grid;
      grid-template-columns: 4.75rem 1.25rem 1fr;
      gap: var(--space-3);
      min-height: 4.85rem;
    }
    li:not(:last-child)::after {
      position: absolute;
      top: 1.25rem;
      bottom: 0;
      left: 5.31rem;
      width: 1.5px;
      background: var(--color-border);
      content: '';
    }
    time {
      padding-top: 2px;
      color: var(--color-text-muted);
      font-size: 0.6875rem;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    .marker {
      z-index: 1;
      width: 0.6875rem;
      height: 0.6875rem;
      margin-top: 0.25rem;
      border: 2px solid var(--color-surface);
      border-radius: 50%;
      background: var(--color-border-strong);
      box-shadow: 0 0 0 1px var(--color-border);
    }
    .current .marker {
      background: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(18, 84, 52, 0.2);
    }
    li > div {
      display: grid;
      align-content: start;
      gap: 2px;
      padding-bottom: var(--space-4);
    }
    strong {
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--color-text);
    }
    p {
      margin: 0;
      font-size: 0.75rem;
      color: var(--color-text-secondary);
    }
    small {
      color: var(--color-text-muted);
      font-size: 0.6875rem;
      font-weight: 550;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelineComponent {
  @Input() items: { time: string; title: string; description: string; meta: string }[] = [];
}
