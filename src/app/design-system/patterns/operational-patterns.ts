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
          <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(18,84,52,0.045)" stroke-width=".75" />
        </pattern>
        <pattern id="field-density" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="4" r="1.3" fill="rgba(18,84,52,0.34)" />
          <circle cx="12" cy="12" r="0.9" fill="rgba(18,84,52,0.22)" />
        </pattern>
        <pattern id="territory-material" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="5" cy="6" r="1" fill="rgba(43,66,50,0.5)" />
          <path d="M11 14h5" stroke="rgba(43,66,50,0.45)" stroke-width="1" stroke-linecap="round" />
          <circle cx="15" cy="5" r="0.6" fill="rgba(43,66,50,0.4)" />
        </pattern>
        <!-- Normal state gradients -->
        <linearGradient id="paddock-grad-normal-top" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#D3E8D7" />
          <stop offset="52%" stop-color="#B9D7C0" />
          <stop offset="100%" stop-color="#96BEA0" />
        </linearGradient>
        <linearGradient id="paddock-grad-normal-depth" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#6F9577" />
          <stop offset="100%" stop-color="#587D61" />
        </linearGradient>
        <linearGradient id="paddock-grad-normal-selected-top" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#C6DDCC" />
          <stop offset="52%" stop-color="#A6C9B1" />
          <stop offset="100%" stop-color="#84AE90" />
        </linearGradient>
        <linearGradient id="paddock-grad-normal-selected-depth" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#658A6D" />
          <stop offset="100%" stop-color="#4A6E56" />
        </linearGradient>
        <!-- Attention state gradients -->
        <linearGradient id="paddock-grad-attention-top" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FBF3E2" />
          <stop offset="52%" stop-color="#F3E2BC" />
          <stop offset="100%" stop-color="#E3C893" />
        </linearGradient>
        <linearGradient id="paddock-grad-attention-depth" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#A7783D" />
          <stop offset="100%" stop-color="#875F2D" />
        </linearGradient>
        <linearGradient id="paddock-grad-attention-selected-top" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#F8ECD2" />
          <stop offset="52%" stop-color="#EDD3A0" />
          <stop offset="100%" stop-color="#D9B478" />
        </linearGradient>
        <linearGradient id="paddock-grad-attention-selected-depth" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#93682E" />
          <stop offset="100%" stop-color="#744F22" />
        </linearGradient>
        <!-- Empty state gradients -->
        <linearGradient id="paddock-grad-empty-top" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#E3EDE3" />
          <stop offset="52%" stop-color="#D0DFD1" />
          <stop offset="100%" stop-color="#B9CCBB" />
        </linearGradient>
        <linearGradient id="paddock-grad-empty-depth" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#879B8B" />
          <stop offset="100%" stop-color="#728675" />
        </linearGradient>
        <linearGradient id="paddock-grad-empty-selected-top" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#D8E3D8" />
          <stop offset="52%" stop-color="#C2D2C3" />
          <stop offset="100%" stop-color="#A9BCAC" />
        </linearGradient>
        <linearGradient id="paddock-grad-empty-selected-depth" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#7B8E80" />
          <stop offset="100%" stop-color="#647763" />
        </linearGradient>
        <!-- Diffuse light from top/left over the top surface -->
        <linearGradient id="territory-surface-light" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.42)" />
          <stop offset="48%" stop-color="rgba(255,255,255,0.10)" />
          <stop offset="72%" stop-color="rgba(255,255,255,0)" />
        </linearGradient>
        <!-- Soft shade toward bottom/right over the top surface -->
        <linearGradient id="territory-surface-shade" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="rgba(11,25,16,0)" />
          <stop offset="55%" stop-color="rgba(11,25,16,0)" />
          <stop offset="85%" stop-color="rgba(11,25,16,0.08)" />
          <stop offset="100%" stop-color="rgba(11,25,16,0.14)" />
        </linearGradient>
        <!-- Subtle inner bevel stroke, light on top fading to shade at bottom -->
        <linearGradient id="territory-inner-edge" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="rgba(255,255,255,0)" />
          <stop offset="62%" stop-color="rgba(255,255,255,0)" />
          <stop offset="82%" stop-color="rgba(255,255,255,0.38)" />
          <stop offset="100%" stop-color="rgba(11,25,16,0.16)" />
        </linearGradient>
        <!-- Shadow filters -->
        <filter id="field-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#0b1910" flood-opacity=".12" />
          <feDropShadow dx="0" dy="1.5" stdDeviation="2" flood-color="#0b1910" flood-opacity=".07" />
        </filter>
        <filter id="field-shadow-selected" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="6" stdDeviation="7" flood-color="#0b1910" flood-opacity=".16" />
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#0b1910" flood-opacity=".09" />
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
          <!-- Depth face (bottom) -->
          <path
            class="land-depth"
            [attr.d]="region.path"
            [attr.transform]="depthTransform(region.id)"
            aria-hidden="true"
          />
          <!-- Shadow layer -->
          <path
            class="land-shadow"
            [attr.d]="region.path"
            [attr.transform]="depthTransform(region.id)"
            aria-hidden="true"
          />
          <!-- Top surface -->
          <path
            class="land"
            [attr.d]="region.path"
            [attr.filter]="region.id === selected ? 'url(#field-shadow-selected)' : 'url(#field-shadow)'"
          />
          <!-- Highlight on top surface -->
          <path
            class="land-highlight"
            [attr.d]="region.path"
            fill="url(#territory-surface-light)"
            aria-hidden="true"
          />
          <!-- Soft shade toward bottom/right on top surface -->
          <path
            class="land-shade"
            [attr.d]="region.path"
            fill="url(#territory-surface-shade)"
            aria-hidden="true"
          />
          <!-- Micro material grain breaking the flat digital fill -->
          <path
            class="land-material"
            [attr.d]="region.path"
            fill="url(#territory-material)"
            aria-hidden="true"
          />
          <!-- Density pattern -->
          <path
            class="density"
            [attr.d]="region.path"
            fill="url(#field-density)"
            [style.opacity]="region.density || 0"
            aria-hidden="true"
          />
          <!-- Discreet inner bevel on the lower part of the top surface -->
          <path
            class="land-bevel"
            [attr.d]="region.path"
            fill="none"
            stroke="url(#territory-inner-edge)"
            aria-hidden="true"
          />
          <!-- Labels -->
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
      background:
        radial-gradient(120% 90% at 50% 0%, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0) 55%),
        linear-gradient(155deg, #e7eee8 0%, #dce6de 100%);
      box-shadow: var(--shadow-raised), inset 0 0 60px rgba(11, 25, 16, 0.05);
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
      stroke: rgba(18, 84, 52, 0.1);
      stroke-width: 1;
      stroke-dasharray: 3 5;
    }
    .region {
      cursor: pointer;
      outline: none;
      transform-box: fill-box;
      transform-origin: center;
      transform: translateY(0);
      transition:
        transform var(--motion-base) var(--ease-emphasized),
        opacity var(--motion-base) var(--ease-standard);
    }
    .region:hover,
    .region:focus {
      transform: translateY(-2px);
    }
    .region.selected {
      transform: translateY(-5px);
    }
    .region .land-depth {
      pointer-events: none;
      fill: url(#paddock-grad-normal-depth);
      stroke: #4e7360;
      stroke-width: 1.25;
      stroke-linejoin: round;
    }
    .region .land-shadow {
      pointer-events: none;
      fill: rgba(11, 25, 16, 0.14);
      stroke: none;
      opacity: 0.55;
    }
    .region.selected .land-shadow {
      fill: rgba(11, 25, 16, 0.18);
      opacity: 0.7;
    }
    .region .land {
      fill: url(#paddock-grad-normal-top);
      stroke: #4e7a5d;
      stroke-width: 1.25;
      stroke-linejoin: round;
      transition:
        fill var(--motion-base) var(--ease-standard),
        stroke var(--motion-base) var(--ease-standard),
        stroke-width var(--motion-base) var(--ease-standard);
    }
    .region:hover .land {
      stroke: #2f6b4a;
      stroke-width: 1.5;
    }
    .region:focus .land {
      stroke: #2f6b4a;
      stroke-width: 1.5;
    }
    .region.selected .land {
      fill: url(#paddock-grad-normal-selected-top);
      stroke: var(--color-primary);
      stroke-width: 2;
    }
    .region.selected .land-depth {
      fill: url(#paddock-grad-normal-selected-depth);
      stroke: #435f4e;
    }
    .region:focus-visible {
      outline: none;
    }
    .region:focus-visible .land {
      stroke: var(--color-focus);
      stroke-width: 2.5;
    }
    .region.attention.selected:focus-visible .land,
    .region.empty.selected:focus-visible .land {
      stroke: var(--color-focus);
      stroke-width: 2.5;
    }
    .region.receded {
      opacity: 0.74;
    }
    .region.attention .land {
      fill: url(#paddock-grad-attention-top);
      stroke: #a5712c;
    }
    .region.attention .land-depth {
      fill: url(#paddock-grad-attention-depth);
      stroke: #6e4e24;
      stroke-width: 1.25;
    }
    .region.attention:hover .land,
    .region.attention:focus .land {
      stroke: #7c4a0a;
      stroke-width: 1.5;
    }
    .region.attention.selected .land {
      fill: url(#paddock-grad-attention-selected-top);
      stroke: #7c4a0a;
      stroke-width: 2;
    }
    .region.attention.selected .land-depth {
      fill: url(#paddock-grad-attention-selected-depth);
    }
    .region.empty .land {
      fill: url(#paddock-grad-empty-top);
      stroke: #8ca094;
      stroke-dasharray: 4 5;
    }
    .region.empty .land-depth {
      fill: url(#paddock-grad-empty-depth);
      stroke: #677a6e;
      stroke-width: 1.25;
    }
    .region.empty:hover .land,
    .region.empty:focus .land {
      stroke: #6b7f73;
      stroke-width: 1.5;
    }
    .region.empty.selected .land {
      fill: url(#paddock-grad-empty-selected-top);
      stroke: var(--color-primary);
      stroke-width: 2;
    }
    .region.empty.selected .land-depth {
      fill: url(#paddock-grad-empty-selected-depth);
    }
    .region .land-highlight {
      pointer-events: none;
      opacity: 0.75;
    }
    .region .land-shade {
      pointer-events: none;
      opacity: 0.9;
    }
    .region .land-bevel {
      pointer-events: none;
      stroke-width: 1;
      stroke-linejoin: round;
      opacity: 0.7;
    }
    .region .land-material {
      pointer-events: none;
      opacity: 0.2;
    }
    .region text {
      pointer-events: none;
      fill: var(--color-text);
      font-family: inherit;
    }
    .region .name {
      font-size: 13.5px;
      font-weight: 800;
      letter-spacing: -0.015em;
      paint-order: stroke fill;
      stroke: rgba(255, 255, 255, 0.9);
      stroke-width: 3px;
      stroke-linejoin: round;
    }
    .region .count {
      fill: var(--color-text-secondary);
      font-size: 11.5px;
      font-weight: 650;
      font-variant-numeric: tabular-nums;
      paint-order: stroke fill;
      stroke: rgba(255, 255, 255, 0.9);
      stroke-width: 2.5px;
      stroke-linejoin: round;
    }
    .density {
      pointer-events: none;
      transition: opacity var(--motion-base) var(--ease-standard);
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
      background: #7fa88b;
      box-shadow: 0 1px 2px rgba(11, 25, 16, 0.12);
    }
    .legend.warning {
      background: #c08a3e;
    }
    .legend.vacant {
      border: 1px dashed #8ca094;
      background: #d0dfd1;
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

  depthTransform(_id?: string): string {
    // Fixed 6px depth offset reusing the same region.path; only ~6px stay visible.
    return `translate(0, 6)`;
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
