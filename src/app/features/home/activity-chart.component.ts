import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';
import { ActivityBucket } from './dashboard.models';

type SeriesKey = 'births' | 'deaths' | 'sales' | 'movements' | 'weights' | 'healthTreatments' | 'breedings' | 'calvings';
interface SeriesDefinition { key: SeriesKey; label: string; color: string; dash: string }

@Component({
  selector: 'app-activity-chart',
  template: `<div class="legend" role="group" aria-label="Séries da atividade">
    @for(series of definitions; track series.key){
      <button type="button" [class.selected]="selected().includes(series.key)" [attr.aria-pressed]="selected().includes(series.key)" (click)="toggle(series.key)"><i [style.background]="series.color" aria-hidden="true"></i>{{series.label}}</button>
    }
  </div>

  <div class="chart-wrap" [class.empty]="noActivity()">
    <svg viewBox="0 0 800 176" preserveAspectRatio="none" role="img" tabindex="0" [attr.aria-label]="description()" (keydown)="onKey($event)" (mousemove)="onPointer($event)" (mouseleave)="focused.set(null)" (focus)="focused.set(focused() ?? 0)">
      <line x1="0" y1="154" x2="800" y2="154" class="baseline" />
      <line x1="200" y1="14" x2="200" y2="154" class="date-guide" />
      <line x1="400" y1="14" x2="400" y2="154" class="date-guide" />
      <line x1="600" y1="14" x2="600" y2="154" class="date-guide" />

      @for(series of visible(); track series.key; let seriesIndex = $index){
        <line x1="0" [attr.y1]="laneY(seriesIndex)" x2="800" [attr.y2]="laneY(seriesIndex)" class="lane" />
        @for(bucket of buckets; track bucket.date; let bucketIndex = $index){
          @if(bucket[series.key] > 0){
            <line [attr.x1]="x(bucketIndex)" [attr.y1]="laneY(seriesIndex)" [attr.x2]="x(bucketIndex)" [attr.y2]="laneY(seriesIndex) - pulseHeight(bucket[series.key])" [attr.stroke]="series.color" class="pulse-stem" />
            <circle [attr.cx]="x(bucketIndex)" [attr.cy]="laneY(seriesIndex) - pulseHeight(bucket[series.key])" r="3.5" [attr.fill]="series.color" class="pulse-dot" />
          }
        }
      }

      @if(focused() !== null && buckets[focused()!]){
        <line [attr.x1]="x(focused()!)" y1="10" [attr.x2]="x(focused()!)" y2="154" class="cursor" />
      }
    </svg>

    @if(noActivity()){
      <div class="empty-pulse"><span aria-hidden="true"></span><div><strong>Nenhuma atividade registrada neste período.</strong><small>O pulso da operação aparecerá aqui conforme novos fatos forem registrados.</small></div></div>
    }

    @if(focused() !== null && buckets[focused()!]){
      <div class="chart-tooltip" role="status">
        <strong>{{formatDate(buckets[focused()!].date)}}</strong>
        @for(series of visible(); track series.key){<span><i [style.background]="series.color"></i>{{series.label}} <b>{{buckets[focused()!][series.key]}}</b></span>}
      </div>
    }
  </div>

  <div class="axis"><span>{{formatDate(buckets[0]?.date)}}</span><span>linha do tempo operacional</span><span>{{formatDate(buckets[buckets.length-1]?.date)}}</span></div>

  <table class="sr-only"><caption>Atividade diária da fazenda no período</caption><thead><tr><th scope="col">Data</th>@for(series of definitions; track series.key){<th scope="col">{{series.label}}</th>}</tr></thead><tbody>@for(bucket of buckets; track bucket.date){<tr><th scope="row">{{formatDate(bucket.date)}}</th>@for(series of definitions; track series.key){<td>{{bucket[series.key]}}</td>}</tr>}</tbody></table>`,
  styles: [`
    :host{display:block;min-width:0}
    .legend{display:flex;flex-wrap:wrap;gap:.3rem;margin-bottom:var(--space-4)}
    .legend button{display:flex;align-items:center;gap:.45rem;min-height:1.9rem;padding:.2rem .55rem;border:1px solid transparent;border-radius:999px;color:var(--color-text-muted);background:transparent;font-size:.6875rem;cursor:pointer;transition:background var(--duration-fast),border var(--duration-fast),color var(--duration-fast),transform var(--duration-fast)}
    .legend button:hover{color:var(--color-text);background:var(--color-surface-soft)}
    .legend button:active{transform:translateY(1px)}
    .legend button.selected{border-color:var(--color-border);color:var(--color-text);background:var(--color-surface)}
    .legend i,.chart-tooltip i{width:.45rem;height:.45rem;display:inline-block;border-radius:50%}
    .legend button:not(.selected) i{opacity:.35}
    .chart-wrap{position:relative;height:9.5rem;min-width:0;overflow:hidden;border-radius:.75rem;background:linear-gradient(180deg,color-mix(in srgb,var(--color-surface-soft) 72%,transparent),transparent)}
    .chart-wrap.empty{height:7rem}
    .chart-wrap svg{width:100%;height:100%;overflow:visible;cursor:crosshair}
    .baseline{stroke:var(--color-border-strong);stroke-width:1}
    .lane{stroke:var(--color-border);stroke-width:.8;stroke-dasharray:2 7}
    .date-guide{stroke:var(--color-border);stroke-width:.6;stroke-dasharray:2 8}
    .pulse-stem{stroke-width:3;stroke-linecap:round;opacity:.72;vector-effect:non-scaling-stroke}
    .pulse-dot{stroke:var(--color-surface);stroke-width:2;vector-effect:non-scaling-stroke}
    .cursor{stroke:var(--color-text-muted);stroke-width:1;stroke-dasharray:3 4}
    .empty-pulse{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:.75rem;padding:1rem;pointer-events:none}
    .empty-pulse>span{width:.65rem;height:.65rem;border:2px solid var(--color-border-strong);border-radius:50%;box-shadow:0 0 0 .4rem rgb(82 97 88 / 5%)}
    .empty-pulse strong,.empty-pulse small{display:block}.empty-pulse strong{font-size:.75rem}.empty-pulse small{margin-top:.2rem;color:var(--color-text-muted);font-size:.6875rem}
    .chart-tooltip{position:absolute;right:var(--space-3);top:var(--space-2);z-index:2;display:grid;gap:.25rem;min-width:8.5rem;padding:.55rem .75rem;border:1px solid var(--color-border);border-radius:.65rem;background:rgb(255 255 255 / 92%);box-shadow:var(--shadow-floating);backdrop-filter:blur(8px);pointer-events:none;font-size:.6875rem}
    .chart-tooltip strong{font-size:.75rem}.chart-tooltip span{display:flex;align-items:center;gap:.375rem;color:var(--color-text-secondary)}.chart-tooltip b{margin-left:auto;color:var(--color-text);font-variant-numeric:tabular-nums}
    .axis{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;margin-top:.35rem;color:var(--color-text-muted);font-size:.625rem;text-transform:uppercase;letter-spacing:.055em}.axis span:last-child{text-align:right}.axis span:nth-child(2){opacity:.66}
    @media(max-width:38rem){.chart-wrap{height:8rem}.legend{gap:.125rem}.legend button{padding-inline:.4rem}.axis span:nth-child(2){display:none}.axis{grid-template-columns:1fr 1fr}}
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityChartComponent {
  @Input({ required: true }) buckets: ActivityBucket[] = [];
  readonly definitions: SeriesDefinition[] = [
    { key: 'births', label: 'Nascimentos', color: '#287d50', dash: '' },
    { key: 'movements', label: 'Movimentações', color: '#326b86', dash: '' },
    { key: 'healthTreatments', label: 'Tratamentos', color: '#a15f0b', dash: '5 4' },
    { key: 'weights', label: 'Pesagens', color: '#6c668c', dash: '2 4' },
    { key: 'sales', label: 'Vendas', color: '#816147', dash: '7 3' },
    { key: 'deaths', label: 'Mortes', color: '#b23a3a', dash: '2 5' },
    { key: 'breedings', label: 'Coberturas', color: '#637a49', dash: '6 5' },
    { key: 'calvings', label: 'Partos', color: '#547c80', dash: '3 4' },
  ];
  readonly selected = signal<SeriesKey[]>(['births', 'movements', 'healthTreatments', 'weights']);
  readonly focused = signal<number | null>(null);
  readonly visible = computed(() => this.definitions.filter(item => this.selected().includes(item.key)));
  readonly description = computed(() => `Gráfico de atividade. Séries visíveis: ${this.visible().map(item => item.label).join(', ') || 'nenhuma'}. Use as setas para percorrer as datas; a tabela acessível contém todos os valores.`);

  noActivity(): boolean { return this.buckets.every(bucket => this.definitions.every(series => bucket[series.key] === 0)); }
  toggle(key: SeriesKey): void { this.selected.update(items => items.includes(key) ? items.filter(item => item !== key) : [...items, key]); }
  x(index: number): number { return this.buckets.length < 2 ? 400 : index * 800 / (this.buckets.length - 1); }
  maximum(): number { return Math.max(1, ...this.buckets.flatMap(bucket => this.visible().map(item => bucket[item.key]))); }
  y(value: number, maximum = this.maximum()): number { return 180 - value * 155 / maximum; }
  path(key: SeriesKey): string { const maximum = this.maximum(); return this.buckets.map((bucket, index) => `${index ? 'L' : 'M'}${this.x(index).toFixed(2)},${this.y(bucket[key], maximum).toFixed(2)}`).join(' '); }
  laneY(index: number): number { const count = Math.max(1, this.visible().length); return 30 + index * (112 / Math.max(1, count - 1)); }
  pulseHeight(value: number): number { return 8 + Math.min(30, value / this.maximum() * 30); }

  onKey(event: KeyboardEvent): void {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? this.buckets.length - 1 : (this.focused() ?? 0) + (event.key === 'ArrowRight' ? 1 : -1);
    this.focused.set(Math.max(0, Math.min(this.buckets.length - 1, next)));
  }

  onPointer(event: MouseEvent): void {
    if (!this.buckets.length) return;
    const box = (event.currentTarget as SVGElement).getBoundingClientRect();
    this.focused.set(Math.max(0, Math.min(this.buckets.length - 1, Math.round((event.clientX - box.left) / box.width * (this.buckets.length - 1)))));
  }

  formatDate(value?: string): string { if (!value) return '—'; const [year, month, day] = value.split('-'); return `${day}/${month}/${year}`; }
}