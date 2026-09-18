import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DEMO_ANIMALS, LiveFarmState, PADDOCKS } from './live-farm.state';

@Component({
  selector: 'gr-live-metric-deck',
  template: `<div class="deck" aria-label="Leitura operacional demonstrativa">
    @for (metric of metrics(); track metric.label) {
      <article [class]="metric.tone">
        <span class="icon" aria-hidden="true">{{ metric.icon }}</span>
        <div>
          <small>{{ metric.label }}</small
          ><strong>{{ metric.value }}</strong
          ><span>{{ metric.detail }}</span>
        </div>
        <svg viewBox="0 0 72 24" role="img" [attr.aria-label]="metric.summary">
          <path [attr.d]="metric.path" />
        </svg>
      </article>
    }
  </div>`,
  styles: [
    `
      :host {
        display: block;
      }
      .deck {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 5px;
        padding: 6px;
        border: 1px solid #244f39;
        border-radius: 15px;
        background: linear-gradient(115deg, #103b29, #173f30 64%, #183a35);
        box-shadow: 0 9px 24px rgb(10 43 27/0.15);
      }
      article {
        position: relative;
        min-height: 74px;
        display: grid;
        grid-template-columns: 28px 1fr 64px;
        align-items: center;
        gap: 9px;
        overflow: hidden;
        padding: 10px 12px;
        border: 1px solid rgb(255 255 255/0.11);
        border-radius: 12px;
        color: #eaf3ec;
        background: rgb(255 255 255/0.045);
        transition:
          transform var(--duration-fast),
          background var(--duration-fast),
          border-color var(--duration-fast);
      }
      article:hover {
        transform: translateY(-1px);
        border-color: rgb(255 255 255/0.24);
        background: rgb(255 255 255/0.08);
      }
      .icon {
        width: 28px;
        height: 28px;
        display: grid;
        place-items: center;
        border-radius: 9px;
        color: #a9cfb5;
        background: rgb(139 194 155/0.12);
        font-size: 14px;
      }
      article > div {
        display: grid;
      }
      small {
        color: #9db0a3;
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      strong {
        font-size: 22px;
        line-height: 1.05;
        letter-spacing: -0.045em;
        font-variant-numeric: tabular-nums;
      }
      div > span {
        color: #9db0a3;
        font-size: 9px;
      }
      svg {
        width: 64px;
        height: 24px;
      }
      path {
        fill: none;
        stroke: #79ad8a;
        stroke-width: 2;
      }
      .attention .icon {
        color: #f0bd72;
        background: rgb(182 106 8/0.16);
      }
      .attention path {
        stroke: #d79231;
      }
      .movement .icon {
        color: #77b5c9;
      }
      .movement path {
        stroke: #4f91aa;
      }
      @media (max-width: 64rem) {
        .deck {
          grid-template-columns: repeat(2, 1fr);
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiveMetricDeckComponent {
  readonly state = inject(LiveFarmState);
  readonly metrics = computed(() => {
    const [animals, paddocks, , movements] = this.state.periodMetrics();
    return [
      {
        label: 'Animais ativos',
        value: animals,
        detail: '6 áreas em operação',
        icon: '◒',
        tone: 'territory',
        summary: `${animals} animais ativos`,
        path: 'M1 18L13 16L25 17L37 10L49 12L61 7L71 9',
      },
      {
        label: 'Piquetes',
        value: paddocks,
        detail: '428 animais associados',
        icon: '⌗',
        tone: 'territory',
        summary: `${paddocks} piquetes`,
        path: 'M1 16L13 14L25 15L37 13L49 9L61 10L71 6',
      },
      {
        label: 'Atenções',
        value: this.state.attentionCount(),
        detail: this.state.scenario() === 'empty' ? 'nenhuma ação agora' : '1 vence hoje',
        icon: '!',
        tone: 'attention',
        summary: `${this.state.attentionCount()} atenções`,
        path: 'M1 19L13 18L25 12L37 16L49 8L61 11L71 5',
      },
      {
        label: 'Movimentos',
        value: movements,
        detail: this.periodLabel(),
        icon: '↝',
        tone: 'movement',
        summary: `${movements} movimentações`,
        path: 'M1 20L13 13L25 17L37 8L49 14L61 6L71 10',
      },
    ];
  });
  periodLabel(): string {
    return (
      {
        today: 'hoje',
        '7d': 'nos últimos 7 dias',
        '30d': 'nos últimos 30 dias',
        '90d': 'nos últimos 90 dias',
      } as const
    )[this.state.selectedPeriod()];
  }
}

@Component({
  selector: 'gr-live-territory',
  template: `<section
    class="territory"
    [class.focused]="state.focusedDomain() === 'territory'"
    aria-labelledby="territory-title"
  >
    <header>
      <div>
        <span>Território ativo</span>
        <h2 id="territory-title">Distribuição do rebanho</h2>
      </div>
      <div class="territory-readout">
        <strong>{{ activePaddock().count }}</strong
        ><span>animais<br />na área</span>
      </div>
    </header>
    <svg
      viewBox="0 0 720 390"
      role="img"
      aria-label="Seis piquetes abstratos da Fazenda Norte; representação operacional sem escala"
    >
      <defs>
        <pattern id="live-grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M24 0H0V24" />
        </pattern>
        <pattern id="density" width="13" height="13" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="4" r="1.25" />
          <circle cx="10" cy="9" r=".8" />
        </pattern>
        <filter id="region-depth">
          <feDropShadow dx="0" dy="4" stdDeviation="5" flood-opacity=".12" />
        </filter>
      </defs>
      <rect class="field-grid" width="720" height="390" fill="url(#live-grid)" />
      <path
        class="contours"
        d="M-20 70c116-55 188 15 278-18s170-31 261 4 153-1 222-43M-15 330c98-62 171 19 282-23s166-47 264-4 142 4 209-36"
      />
      @for (p of paddocks; track p.id) {
        <g
          class="region"
          [class.active]="state.activePaddockId() === p.id"
          [class.related]="animalIds(p.id).length"
          [class.receded]="state.hoveredPaddockId() && state.hoveredPaddockId() !== p.id"
          tabindex="0"
          role="button"
          [attr.aria-label]="p.name + ', ' + p.count + ' animais'"
          (mouseenter)="state.hoveredPaddockId.set(p.id)"
          (mouseleave)="state.hoveredPaddockId.set(null)"
          (focus)="state.hoveredPaddockId.set(p.id)"
          (blur)="state.hoveredPaddockId.set(null)"
          (click)="state.selectPaddock(p.id)"
          (keydown.enter)="state.selectPaddock(p.id)"
          (keydown.space)="$event.preventDefault(); state.selectPaddock(p.id)"
        >
          <path class="land" [attr.d]="path(p.id)" filter="url(#region-depth)" />
          <path
            class="grain"
            [attr.d]="path(p.id)"
            fill="url(#density)"
            [style.opacity]="p.level * 0.72"
          />
          <text [attr.x]="position(p.id)[0]" [attr.y]="position(p.id)[1]">
            <tspan class="name">{{ p.name }}</tspan>
            <tspan class="count" [attr.x]="position(p.id)[0]" dy="20">{{ p.count }} animais</tspan>
          </text>
          @for (animalId of animalIds(p.id); track animalId; let i = $index) {
            <circle
              class="animal-node"
              [class.selected]="state.selectedAnimalId() === animalId"
              [attr.cx]="position(p.id)[0] + i * 13"
              [attr.cy]="position(p.id)[1] + 39"
              r="4"
            />
          }
        </g>
      }
      <path
        class="movement-line"
        [class.drawing]="state.movementState() === 'moving'"
        d="M166 101C256 62 335 189 438 242S559 296 625 270"
      />
      <circle class="unlocated" cx="665" cy="46" r="10" />
      <text class="unlocated-label" x="645" y="72">18 sem localização</text>
    </svg>
    <footer>
      <span><i></i>Área selecionada</span><span><i></i>Animal no contexto</span
      ><span class="scale">Instrumento abstrato · sem escala</span>
    </footer>
  </section>`,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }
      .territory {
        height: 100%;
        display: grid;
        grid-template-rows: auto 1fr auto;
        overflow: hidden;
        border: 1px solid #b9cec0;
        border-radius: 18px;
        background: linear-gradient(145deg, #dce9df, #c7dacb 62%, #b9d0c0);
        box-shadow:
          0 16px 40px rgb(11 43 26/0.12),
          inset 0 1px rgb(255 255 255/0.7);
        transition:
          border-color var(--duration-standard),
          box-shadow var(--duration-standard);
      }
      .territory.focused {
        border-color: #56876a;
        box-shadow:
          0 18px 46px rgb(11 43 26/0.17),
          0 0 0 2px rgb(21 91 59/0.09);
      }
      header {
        position: relative;
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 13px 16px;
        border-bottom: 1px solid rgb(21 91 59/0.14);
        background: rgb(244 249 245/0.7);
      }
      header span {
        color: #50705d;
        font-size: 9px;
        font-weight: 750;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      h2 {
        margin: 2px 0 0;
        font-size: 15px;
        letter-spacing: -0.02em;
      }
      .territory-readout {
        display: flex;
        align-items: center;
        gap: 7px;
      }
      .territory-readout strong {
        font-size: 25px;
        line-height: 1;
        font-variant-numeric: tabular-nums;
      }
      .territory-readout span {
        line-height: 1.25;
      }
      svg {
        width: 100%;
        height: 100%;
        min-height: 270px;
      }
      .field-grid {
        color: rgb(21 91 59/0.08);
      }
      defs path {
        fill: none;
        stroke: currentColor;
        stroke-width: 0.6;
      }
      .contours {
        fill: none;
        stroke: rgb(21 91 59/0.16);
      }
      .region {
        outline: none;
        cursor: pointer;
        transition: opacity var(--duration-standard);
      }
      .land {
        fill: rgb(242 247 243/0.6);
        stroke: #8ca994;
        stroke-width: 1.4;
        transition:
          fill var(--duration-standard),
          stroke var(--duration-standard),
          stroke-width var(--duration-standard);
      }
      .grain {
        color: #4a8060;
        pointer-events: none;
      }
      .region:hover .land,
      .region:focus .land,
      .region.active .land {
        fill: rgb(225 240 229/0.92);
        stroke: #155b3b;
        stroke-width: 3;
      }
      .region.active .grain {
        opacity: 0.9 !important;
      }
      .region:focus-visible .land {
        filter: drop-shadow(0 0 4px rgb(21 91 59/0.4));
      }
      .region.receded {
        opacity: 0.64;
      }
      .region text {
        pointer-events: none;
        fill: #183322;
      }
      .name {
        font-size: 12px;
        font-weight: 750;
      }
      .count {
        fill: #557060;
        font-size: 9px;
      }
      .animal-node {
        fill: #2b6e4a;
        stroke: white;
        stroke-width: 2;
      }
      .animal-node.selected {
        r: 6;
        fill: #0d402a;
        stroke-width: 3;
      }
      .movement-line {
        fill: none;
        stroke: #397e75;
        stroke-width: 2.5;
        stroke-dasharray: 6 7;
        opacity: 0.55;
      }
      .movement-line.drawing {
        animation: draw-path 0.62s var(--ease-emphasized);
      }
      @keyframes draw-path {
        from {
          stroke-dashoffset: 180;
        }
        to {
          stroke-dashoffset: 0;
        }
      }
      .unlocated {
        fill: #d58a22;
        stroke: #fff4df;
        stroke-width: 5;
      }
      .unlocated-label {
        fill: #80500e;
        font-size: 8px;
        font-weight: 700;
      }
      footer {
        display: flex;
        gap: 16px;
        padding: 9px 14px;
        border-top: 1px solid rgb(21 91 59/0.14);
        color: #557060;
        background: rgb(244 249 245/0.66);
        font-size: 9px;
      }
      footer span {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      footer i {
        width: 7px;
        height: 7px;
        border: 2px solid #155b3b;
        border-radius: 50%;
      }
      footer span:nth-child(2) i {
        border-color: white;
        background: #155b3b;
      }
      .scale {
        margin-left: auto;
      }
      @media (prefers-reduced-motion: reduce) {
        .movement-line.drawing {
          animation: none;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiveTerritoryComponent {
  readonly state = inject(LiveFarmState);
  readonly paddocks = PADDOCKS;
  readonly activePaddock = computed(
    () => PADDOCKS.find((p) => p.id === this.state.activePaddockId()) ?? PADDOCKS[0],
  );
  path(id: string): string {
    return (
      {
        'norte-1': 'M35 40L220 30L263 126L190 180L27 150Z',
        'norte-2': 'M228 28L420 41L424 147L271 127Z',
        sul: 'M30 158L190 187L286 348L36 356Z',
        leste: 'M432 43L681 37L692 171L532 201L430 145Z',
        maternidade: 'M278 137L425 155L520 207L472 344L298 348L199 185Z',
        recria: 'M531 209L694 177L680 350L481 345Z',
      } as Record<string, string>
    )[id];
  }
  position(id: string): [number, number] {
    return (
      {
        'norte-1': [75, 85],
        'norte-2': [283, 82],
        sul: [73, 244],
        leste: [501, 92],
        maternidade: [320, 226],
        recria: [552, 270],
      } as Record<string, [number, number]>
    )[id];
  }
  animalIds(id: string): string[] {
    return DEMO_ANIMALS.filter(
      (a) => (this.state.animalLocations()[a.id] ?? a.paddockId) === id,
    ).map((a) => a.id);
  }
}

@Component({
  selector: 'gr-animal-signal',
  template: `<article
    class="animal"
    [class.expanded]="state.expandedAnimal()"
    [class.related]="state.focusedDomain() === 'animal'"
  >
    <header>
      <div class="identity">
        <span class="ear-tag">{{ animal().id.slice(-2) }}</span>
        <div>
          <small>Animal no contexto</small>
          <h2>{{ animal().name }}</h2>
          <code>{{ animal().id }}</code>
        </div>
      </div>
      <span class="active"><i></i>Ativa</span>
    </header>
    <div class="selectors" role="group" aria-label="Selecionar animal">
      @for (item of animals; track item.id) {
        <button
          type="button"
          [class.selected]="item.id === animal().id"
          (click)="state.selectAnimal(item.id)"
        >
          {{ item.name }}
        </button>
      }
    </div>
    <button
      type="button"
      class="signal-body"
      [attr.aria-expanded]="state.expandedAnimal()"
      (mouseenter)="state.focusedDomain.set('animal')"
      (mouseleave)="state.focusedDomain.set(null)"
      (focus)="state.focusedDomain.set('animal')"
      (click)="state.expandedAnimal.set(!state.expandedAnimal())"
    >
      <span class="location">⌖ {{ paddockName() }}</span>
      <div class="weight">
        <strong>{{ animal().weight }}</strong
        ><span
          >kg<br /><small>em {{ animal().lastWeight }}</small></span
        >
      </div>
      <div class="signal-line">
        <span>Saúde</span><strong>{{ animal().health }}</strong>
      </div>
      <div class="signal-line">
        <span>Reprodução</span><strong>{{ animal().reproduction }}</strong>
      </div>
      <span class="expand-label"
        >{{ state.expandedAnimal() ? 'Recolher contexto' : 'Abrir contexto' }} <b>↗</b></span
      >
    </button>
    @if (state.expandedAnimal()) {
      <div class="expanded-detail">
        <span>Próxima operação</span><strong>{{ animal().nextEvent }}</strong>
        <p>A identidade permanece enquanto o contexto se expande.</p>
      </div>
    }
  </article>`,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }
      .animal {
        height: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border: 1px solid #d2ddd4;
        border-radius: 16px;
        background: linear-gradient(160deg, #fff 0%, #f7faf7 68%, #edf4ef);
        box-shadow: 0 10px 28px rgb(13 41 25/0.08);
        transition:
          transform var(--duration-standard),
          border-color var(--duration-standard);
      }
      .animal.related {
        border-color: #6d987b;
        transform: translateY(-1px);
      }
      header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        padding: 14px 14px 8px;
      }
      .identity {
        display: flex;
        gap: 10px;
      }
      .ear-tag {
        width: 38px;
        height: 43px;
        display: grid;
        place-items: center;
        clip-path: polygon(12% 0, 88% 0, 100% 80%, 50% 100%, 0 80%);
        color: #fff;
        background: #155b3b;
        font-size: 13px;
        font-weight: 800;
      }
      .identity small {
        display: block;
        color: #6b7d71;
        font-size: 8px;
        font-weight: 750;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      h2 {
        margin: 0;
        font-size: 21px;
        line-height: 1;
        letter-spacing: -0.04em;
      }
      code {
        color: #718178;
        font-size: 9px;
      }
      .active {
        display: flex;
        align-items: center;
        gap: 5px;
        color: #276746;
        font-size: 9px;
        font-weight: 700;
      }
      .active i {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #2a8756;
      }
      .selectors {
        display: flex;
        gap: 4px;
        padding: 0 14px 9px;
      }
      .selectors button {
        min-height: 25px;
        padding: 0 8px;
        border: 1px solid transparent;
        border-radius: 7px;
        color: #6b7d71;
        background: #edf3ee;
        font-size: 9px;
        cursor: pointer;
      }
      .selectors button.selected {
        border-color: #8db29a;
        color: #155b3b;
        background: #e2efe6;
        font-weight: 700;
      }
      .signal-body {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 7px 10px;
        flex: 1;
        padding: 11px 14px;
        border: 0;
        border-top: 1px solid #e0e8e2;
        color: inherit;
        background: transparent;
        text-align: left;
        cursor: pointer;
      }
      .location {
        grid-column: 1/-1;
        color: #2c6446;
        font-size: 10px;
        font-weight: 700;
      }
      .weight {
        display: flex;
        align-items: end;
        gap: 5px;
      }
      .weight strong {
        font-size: 34px;
        line-height: 0.85;
        letter-spacing: -0.06em;
      }
      .weight > span {
        color: #53675a;
        font-size: 10px;
        line-height: 1.15;
      }
      .weight small {
        font-size: 8px;
      }
      .signal-line {
        grid-column: 1/-1;
        display: flex;
        justify-content: space-between;
        padding-top: 6px;
        border-top: 1px solid #e2e9e4;
        font-size: 9px;
      }
      .signal-line span {
        color: #718178;
      }
      .signal-line strong {
        font-size: 9px;
      }
      .expand-label {
        grid-column: 1/-1;
        align-self: end;
        color: #155b3b;
        font-size: 9px;
        font-weight: 700;
      }
      .expand-label b {
        display: inline-block;
        transition: transform var(--duration-fast);
      }
      .signal-body:hover .expand-label b {
        transform: translate(2px, -2px);
      }
      .expanded-detail {
        padding: 10px 14px;
        border-top: 1px solid #d6e3d9;
        background: #e9f2eb;
        animation: detail-in var(--duration-standard) var(--ease-emphasized);
      }
      .expanded-detail span {
        color: #65786b;
        font-size: 8px;
        text-transform: uppercase;
      }
      .expanded-detail strong {
        display: block;
        font-size: 11px;
      }
      .expanded-detail p {
        margin: 2px 0 0;
        font-size: 9px;
      }
      @keyframes detail-in {
        from {
          opacity: 0;
          transform: translateY(-4px);
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnimalSignalComponent {
  readonly state = inject(LiveFarmState);
  readonly animals = DEMO_ANIMALS;
  readonly animal = this.state.selectedAnimal;
  readonly paddockName = computed(
    () => PADDOCKS.find((p) => p.id === this.animal().paddockId)?.name ?? 'Sem localização',
  );
}

@Component({
  selector: 'gr-attention-stack',
  template: `<section class="attention">
    <header>
      <div>
        <small>Prioridade agora</small
        ><strong>{{ state.scenario() === 'empty' ? 'Operação tranquila' : 'Atenções' }}</strong>
      </div>
      <span>{{ state.attentionCount() }}</span>
    </header>
    @if (state.scenario() === 'empty') {
      <div class="empty">
        <i>✓</i><strong>Nenhuma ação imediata</strong>
        <p>O fluxo recente continua disponível abaixo.</p>
      </div>
    } @else {
      <button type="button" class="urgent" (focus)="state.focusedDomain.set('attention')">
        <span>Hoje</span>
        <div>
          <strong>{{ state.selectedAnimal().nextEvent }}</strong
          ><small>{{ state.selectedAnimal().name }} · {{ state.selectedAnimal().id }}</small>
        </div>
        <b>→</b>
      </button>
      @if (state.scenario() === 'attention') {
        <button type="button">
          <span>22<br />set.</span>
          <div>
            <strong>Conferir lote para pesagem</strong><small>Crescimento A · 18 animais</small>
          </div>
          <b>→</b></button
        ><button type="button">
          <span>24<br />set.</span>
          <div><strong>Rotação de piquete</strong><small>Pasto Norte 2</small></div>
          <b>→</b>
        </button>
      }
    }
  </section>`,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }
      .attention {
        height: 100%;
        overflow: hidden;
        border: 1px solid #e3d8c5;
        border-radius: 16px;
        background: linear-gradient(155deg, #fffdf9, #f8f3e9);
        box-shadow: 0 10px 28px rgb(77 48 10/0.07);
      }
      header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 14px;
        border-bottom: 1px solid #eadfcd;
      }
      header div {
        display: grid;
      }
      header small {
        color: #a1600d;
        font-size: 8px;
        font-weight: 750;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      header strong {
        font-size: 14px;
      }
      header > span {
        width: 25px;
        height: 25px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        color: #9a5b09;
        background: #fff0d5;
        font-size: 11px;
        font-weight: 800;
      }
      .attention button {
        width: 100%;
        display: grid;
        grid-template-columns: 28px 1fr auto;
        align-items: center;
        gap: 9px;
        padding: 10px 12px;
        border: 0;
        border-bottom: 1px solid #eee6d8;
        color: inherit;
        background: transparent;
        text-align: left;
        cursor: pointer;
        transition: background var(--duration-fast);
      }
      .attention button:hover,
      .attention button:focus-visible {
        background: #fff6e7;
      }
      .attention button > span {
        color: #8b7860;
        font-size: 8px;
        font-weight: 750;
        text-align: center;
        text-transform: uppercase;
      }
      .attention button div {
        display: grid;
      }
      .attention button strong {
        overflow: hidden;
        font-size: 10px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .attention button small {
        color: #7c746a;
        font-size: 8px;
      }
      .attention button b {
        color: #a1600d;
      }
      .urgent {
        box-shadow: inset 3px 0 #c47a17;
      }
      .empty {
        height: calc(100% - 52px);
        display: grid;
        place-items: center;
        align-content: center;
        padding: 20px;
        text-align: center;
      }
      .empty i {
        width: 30px;
        height: 30px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        color: #267249;
        background: #e3f1e7;
      }
      .empty strong {
        margin-top: 8px;
        font-size: 11px;
      }
      .empty p {
        margin: 2px 0;
        font-size: 9px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttentionStackComponent {
  readonly state = inject(LiveFarmState);
}

@Component({
  selector: 'gr-movement-path',
  template: `<section class="movement" [class.moving]="state.movementState() === 'moving'">
    <header><span>Movimentação</span><small>Operação simulada</small></header>
    <div
      class="path"
      role="img"
      [attr.aria-label]="origin() + ' para ' + destination() + ', 18 animais'"
    >
      <div class="node origin">
        <i></i><span>Origem</span><strong>{{ origin() }}</strong>
      </div>
      <svg viewBox="0 0 260 48" aria-hidden="true">
        <path d="M4 26C66 4 104 43 160 20S222 15 256 8" />
        <circle cx="4" cy="26" r="4" />
        <circle cx="256" cy="8" r="4" />
      </svg>
      <div class="quantity"><strong>18</strong><span>animais</span></div>
      <div class="node destination">
        <i></i><span>Destino</span><strong>{{ destination() }}</strong>
      </div>
    </div>
    <button
      type="button"
      [disabled]="state.movementState() === 'moving'"
      (click)="state.simulateMovement()"
    >
      {{
        state.movementState() === 'moving'
          ? 'Movendo rebanho…'
          : state.movementState() === 'complete'
            ? 'Movimentação concluída'
            : 'Simular movimentação'
      }}
      <span>→</span>
    </button>
  </section>`,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }
      .movement {
        height: 100%;
        display: grid;
        grid-template-rows: auto 1fr auto;
        overflow: hidden;
        border: 1px solid #c9dde0;
        border-radius: 16px;
        background: linear-gradient(145deg, #f8fcfc, #eaf4f4);
        box-shadow: 0 9px 24px rgb(24 72 79/0.07);
      }
      header {
        display: flex;
        justify-content: space-between;
        padding: 10px 13px;
        border-bottom: 1px solid #d5e4e5;
      }
      header span {
        color: #2f7180;
        font-size: 9px;
        font-weight: 750;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      header small {
        color: #70858a;
        font-size: 8px;
      }
      .path {
        position: relative;
        display: grid;
        grid-template-columns: 1fr 70px 1fr;
        align-items: center;
        gap: 4px;
        padding: 8px 13px;
      }
      .path svg {
        position: absolute;
        inset: 12px 26% auto;
        width: 48%;
        height: 40px;
      }
      .path path {
        fill: none;
        stroke: #3a8790;
        stroke-width: 2;
        stroke-dasharray: 5 5;
      }
      .moving .path path {
        animation: path-travel 0.62s var(--ease-emphasized);
      }
      .path circle {
        fill: #3a8790;
      }
      .node {
        position: relative;
        z-index: 1;
        display: grid;
      }
      .node.destination {
        text-align: right;
      }
      .node span {
        color: #76878a;
        font-size: 7px;
        text-transform: uppercase;
      }
      .node strong {
        max-width: 90px;
        font-size: 9px;
      }
      .quantity {
        position: relative;
        z-index: 2;
        display: grid;
        justify-items: center;
        padding: 4px;
        border: 1px solid #c8dcde;
        border-radius: 9px;
        background: #fff;
      }
      .quantity strong {
        font-size: 14px;
      }
      .quantity span {
        color: #718588;
        font-size: 7px;
      }
      .movement > button {
        min-height: 31px;
        border: 0;
        border-top: 1px solid #d5e4e5;
        color: #256875;
        background: rgb(255 255 255/0.55);
        font-size: 9px;
        font-weight: 750;
        cursor: pointer;
      }
      .movement > button:disabled {
        opacity: 0.7;
      }
      .movement > button span {
        display: inline-block;
        transition: transform var(--duration-fast);
      }
      .movement > button:hover span {
        transform: translateX(3px);
      }
      @keyframes path-travel {
        from {
          stroke-dashoffset: 120;
        }
        to {
          stroke-dashoffset: 0;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .moving .path path {
          animation: none;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovementPathComponent {
  readonly state = inject(LiveFarmState);
  readonly origin = computed(
    () => PADDOCKS.find((p) => p.id === this.state.selectedAnimal().paddockId)?.name ?? 'Origem',
  );
  readonly destination = computed(() =>
    this.state.selectedAnimal().paddockId === 'sul' ? 'Pasto Norte 1' : 'Pasto Sul',
  );
}

@Component({
  selector: 'gr-animal-lenses',
  template: `<section class="lenses">
    <article
      class="weight"
      [class.dimmed]="state.focusedDomain() && state.focusedDomain() !== 'weight'"
    >
      <header>
        <span>Peso</span><small>{{ animal().lastWeight }}</small>
      </header>
      <div>
        <strong>{{ animal().weight }}<b> kg</b></strong
        ><span>anterior {{ animal().previousWeight }} kg</span>
      </div>
      <svg
        viewBox="0 0 150 35"
        role="img"
        [attr.aria-label]="
          'Peso atual ' + animal().weight + ' kg; anterior ' + animal().previousWeight + ' kg'
        "
      >
        <path d="M2 29C25 28 33 20 54 23S89 11 106 15 127 7 148 5" />
      </svg>
    </article>
    <article class="health" [class.attention]="animal().name === 'Mimosa'">
      <header><span>Saúde</span><i></i></header>
      <strong>{{ animal().health }}</strong
      ><small>{{ animal().healthDetail }}</small>
    </article>
    <article class="reproduction">
      <header>
        <span>Reprodução</span><small>{{ animal().reproduction }}</small>
      </header>
      <ol aria-label="Etapas reprodutivas">
        @for (
          stage of ['Serviço', 'Diagnóstico', 'Confirmação', 'Parto'];
          track stage;
          let i = $index
        ) {
          <li
            [class.done]="i < animal().reproductionStage"
            [class.current]="i === animal().reproductionStage && animal().reproductionStage > 0"
          >
            <i></i><span>{{ stage }}</span>
          </li>
        }
      </ol>
      <p>{{ animal().reproductionStage > 0 ? animal().nextEvent : 'Nenhum processo ativo' }}</p>
    </article>
  </section>`,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }
      .lenses {
        height: 100%;
        display: grid;
        grid-template-columns: 0.9fr 0.85fr 1.5fr;
        gap: 8px;
      }
      .lenses article {
        min-width: 0;
        padding: 10px 12px;
        border: 1px solid #d7dfd8;
        border-radius: 14px;
        background: #fff;
        box-shadow: 0 7px 20px rgb(14 38 23/0.055);
        transition:
          opacity var(--duration-standard),
          transform var(--duration-standard);
      }
      article.dimmed {
        opacity: 0.68;
      }
      .lenses header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        color: #65766b;
        font-size: 8px;
        font-weight: 750;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
      .weight > div {
        display: grid;
        margin-top: 6px;
      }
      .weight > div strong {
        font-size: 22px;
        line-height: 1;
        letter-spacing: -0.05em;
      }
      .weight > div b {
        font-size: 8px;
      }
      .weight > div span,
      .health small {
        color: #758279;
        font-size: 7px;
      }
      .weight svg {
        width: 100%;
        height: 24px;
        margin-top: 3px;
      }
      .weight path {
        fill: none;
        stroke: #7057a8;
        stroke-width: 2;
      }
      .health {
        background: linear-gradient(155deg, #fff, #eff7f1) !important;
      }
      .health header i {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #2b8655;
      }
      .health.attention header i {
        background: #bd7211;
      }
      .health > strong {
        display: block;
        margin-top: 11px;
        font-size: 10px;
      }
      .health > small {
        display: block;
        margin-top: 3px;
      }
      .reproduction {
        background: linear-gradient(155deg, #fff, #f4f0f8) !important;
      }
      .reproduction ol {
        display: flex;
        margin: 13px 0 7px;
        padding: 0;
        list-style: none;
      }
      .reproduction li {
        position: relative;
        display: grid;
        justify-items: center;
        flex: 1;
        color: #8b8390;
        font-size: 6px;
      }
      .reproduction li:not(:last-child):after {
        position: absolute;
        top: 4px;
        left: 55%;
        width: 90%;
        height: 1px;
        background: #d8cedf;
        content: '';
      }
      .reproduction li i {
        z-index: 1;
        width: 9px;
        height: 9px;
        border: 2px solid #d8cedf;
        border-radius: 50%;
        background: #fff;
      }
      .reproduction li.done i {
        border-color: #7057a8;
        background: #7057a8;
      }
      .reproduction li.done:after {
        background: #7057a8;
      }
      .reproduction li.current i {
        border-color: #7057a8;
        box-shadow: 0 0 0 3px #eee8f4;
      }
      .reproduction li span {
        margin-top: 4px;
      }
      .reproduction p {
        margin: 0;
        color: #65556d;
        font-size: 7px;
        font-weight: 650;
      }
      @media (max-width: 64rem) {
        .lenses {
          grid-template-columns: 1fr 1fr;
        }
        .reproduction {
          grid-column: 1/-1;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnimalLensesComponent {
  readonly state = inject(LiveFarmState);
  readonly animal = this.state.selectedAnimal;
}

@Component({
  selector: 'gr-operation-stream',
  template: `<section class="stream">
    <header>
      <div>
        <span>Fluxo da operação</span
        ><strong>{{ state.selectedPeriod() === 'today' ? 'Hoje' : state.selectedPeriod() }}</strong>
      </div>
      <div class="density" aria-label="Densidade temporal demonstrativa">
        @for (bar of density; track $index) {
          <i [style.height.px]="bar"></i>
        }
      </div>
    </header>
    <div class="events" [class.empty]="!state.visibleEvents().length">
      @for (event of state.visibleEvents(); track event.id) {
        <button
          type="button"
          [class.related]="event.animalId === state.selectedAnimalId()"
          (mouseenter)="focus(event.animalId, event.paddockId)"
          (mouseleave)="state.focusedDomain.set(null)"
          (focus)="focus(event.animalId, event.paddockId)"
        >
          <time>{{ event.time }}</time
          ><i [class]="event.type"></i
          ><span
            ><strong>{{ event.title }}</strong
            ><small>{{ event.detail }}</small></span
          >
        </button>
      } @empty {
        <div>
          <strong>Sem eventos neste cenário</strong
          ><span>Altere o período ou o cenário demonstrativo.</span>
        </div>
      }
    </div>
  </section>`,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }
      .stream {
        height: 100%;
        display: grid;
        grid-template-columns: 145px 1fr;
        overflow: hidden;
        border: 1px solid #d2dcd4;
        border-radius: 16px;
        background: #fbfdfb;
        box-shadow: 0 9px 26px rgb(13 40 23/0.07);
      }
      header {
        display: grid;
        align-content: space-between;
        padding: 12px 14px;
        border-right: 1px solid #dce5de;
        background: #eef4ef;
      }
      header > div:first-child {
        display: grid;
      }
      header span {
        color: #58705f;
        font-size: 8px;
        font-weight: 750;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      header strong {
        font-size: 13px;
      }
      .density {
        height: 25px;
        display: flex;
        align-items: end;
        gap: 3px;
      }
      .density i {
        width: 4px;
        border-radius: 2px 2px 0 0;
        background: #6f9b7c;
      }
      .events {
        display: flex;
        overflow-x: auto;
      }
      .events button {
        position: relative;
        min-width: 185px;
        display: grid;
        grid-template-columns: 42px 8px 1fr;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        border: 0;
        border-right: 1px solid #e0e6e1;
        color: inherit;
        background: transparent;
        text-align: left;
        cursor: pointer;
        transition: background var(--duration-fast);
      }
      .events button:hover,
      .events button:focus-visible,
      .events button.related {
        background: #eff6f1;
      }
      .events time {
        color: #63756a;
        font-size: 8px;
        font-weight: 700;
      }
      .events button > i {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #3b8375;
        box-shadow: 0 0 0 3px #e1efeb;
      }
      .events button > i.weight {
        background: #7057a8;
        box-shadow: 0 0 0 3px #eee9f3;
      }
      .events button > i.health {
        background: #b66a08;
        box-shadow: 0 0 0 3px #fff1da;
      }
      .events button > i.reproduction {
        background: #8c68af;
        box-shadow: 0 0 0 3px #f0ebf5;
      }
      .events button span {
        display: grid;
      }
      .events button strong {
        font-size: 9px;
      }
      .events button small {
        color: #738078;
        font-size: 8px;
      }
      .events.empty {
        display: grid;
        place-items: center;
      }
      .events.empty > div {
        display: grid;
        text-align: center;
      }
      .events.empty span {
        font-size: 8px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationStreamComponent {
  readonly state = inject(LiveFarmState);
  readonly density = [8, 14, 10, 21, 17, 24, 12, 20, 16, 25, 18, 11, 22, 15, 19, 9, 16, 23];
  focus(animalId: string, paddockId?: string): void {
    this.state.selectedAnimalId.set(animalId);
    if (paddockId) this.state.hoveredPaddockId.set(paddockId);
    this.state.focusedDomain.set('stream');
  }
}
