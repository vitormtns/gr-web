import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';
import { ActivityBucket } from './dashboard.models';

type SeriesKey = 'births' | 'deaths' | 'sales' | 'movements' | 'weights' | 'healthTreatments' | 'breedings' | 'calvings';
interface SeriesDefinition { key: SeriesKey; label: string; color: string; dash: string }

@Component({
  selector: 'app-activity-chart',
  template: `<div class="legend" role="group" aria-label="Séries da atividade">
    @for(series of definitions; track series.key){<button type="button" [class.selected]="selected().includes(series.key)" [attr.aria-pressed]="selected().includes(series.key)" (click)="toggle(series.key)"><i [style.background]="series.color" aria-hidden="true"></i>{{series.label}}</button>}
  </div>
  <div class="chart-wrap">
    <svg viewBox="0 0 800 210" preserveAspectRatio="none" role="img" tabindex="0" [attr.aria-label]="description()" (keydown)="onKey($event)" (mousemove)="onPointer($event)" (mouseleave)="focused.set(null)" (focus)="focused.set(focused() ?? 0)">
      <line x1="0" y1="180" x2="800" y2="180" class="baseline" />
      <line x1="0" y1="94" x2="800" y2="94" class="guide" />
      @for(series of visible(); track series.key){<path [attr.d]="path(series.key)" fill="none" [attr.stroke]="series.color" [attr.stroke-dasharray]="series.dash" stroke-width="2.5" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" />}
      @if(focused() !== null && buckets[focused()!]){<line [attr.x1]="x(focused()!)" y1="12" [attr.x2]="x(focused()!)" y2="180" class="cursor" />
        @for(series of visible(); track series.key){<circle [attr.cx]="x(focused()!)" [attr.cy]="y(buckets[focused()!][series.key])" r="4" [attr.fill]="series.color" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />}}
    </svg>
    @if(focused() !== null && buckets[focused()!]){<div class="chart-tooltip" role="status"><strong>{{formatDate(buckets[focused()!].date)}}</strong>@for(series of visible(); track series.key){<span><i [style.background]="series.color"></i>{{series.label}} <b>{{buckets[focused()!][series.key]}}</b></span>}</div>}
  </div>
  <div class="axis"><span>{{formatDate(buckets[0]?.date)}}</span><span>{{formatDate(buckets[buckets.length-1]?.date)}}</span></div>
  @if(noActivity()){<p class="zero-note">Nenhuma atividade registrada neste período.</p>}
  <table class="sr-only"><caption>Atividade diária da fazenda no período</caption><thead><tr><th scope="col">Data</th>@for(series of definitions; track series.key){<th scope="col">{{series.label}}</th>}</tr></thead><tbody>@for(bucket of buckets; track bucket.date){<tr><th scope="row">{{formatDate(bucket.date)}}</th>@for(series of definitions; track series.key){<td>{{bucket[series.key]}}</td>}</tr>}</tbody></table>`,
  styles: [`:host{display:block;min-width:0}.legend{display:flex;flex-wrap:wrap;gap:.375rem;margin-bottom:var(--space-5)}.legend button{display:flex;align-items:center;gap:.5rem;min-height:2rem;padding:.25rem .625rem;border:1px solid transparent;border-radius:var(--radius-sm);color:var(--color-text-muted);background:transparent;font-size:.75rem;cursor:pointer;transition:background var(--duration-fast),border var(--duration-fast)}.legend button:hover{background:var(--color-surface-soft)}.legend button.selected{border-color:var(--color-border);color:var(--color-text);background:var(--color-surface-soft)}.legend i,.chart-tooltip i{width:.5rem;height:.5rem;display:inline-block;border-radius:50%}.legend button:not(.selected) i{opacity:.4}.chart-wrap{position:relative;height:13rem;min-width:0}.chart-wrap svg{width:100%;height:100%;overflow:visible;cursor:crosshair}.baseline{stroke:var(--color-border-strong);stroke-width:1}.guide{stroke:var(--color-border);stroke-width:1;stroke-dasharray:3 5}.cursor{stroke:var(--color-text-muted);stroke-width:1;stroke-dasharray:3 4}.chart-tooltip{position:absolute;right:var(--space-3);top:var(--space-2);z-index:2;display:grid;gap:.25rem;min-width:8rem;padding:.5rem .75rem;border:1px solid var(--color-border);border-radius:var(--radius-sm);background:var(--color-surface-elevated);box-shadow:var(--shadow-floating);pointer-events:none;font-size:.75rem}.chart-tooltip strong{font-size:.75rem}.chart-tooltip span{display:flex;align-items:center;gap:.375rem;color:var(--color-text-secondary)}.chart-tooltip b{margin-left:auto;color:var(--color-text);font-variant-numeric:tabular-nums}.axis{display:flex;justify-content:space-between;margin-top:.25rem;color:var(--color-text-muted);font-size:.6875rem}@media(max-width:38rem){.chart-wrap{height:10rem}.legend{gap:.125rem}.legend button{padding-inline:.375rem}}`],
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
  readonly selected = signal<SeriesKey[]>(['births', 'movements', 'healthTreatments']);
  readonly focused = signal<number | null>(null);
  readonly visible = computed(() => this.definitions.filter(item => this.selected().includes(item.key)));
  readonly description = computed(() => `Gráfico de atividade. Séries visíveis: ${this.visible().map(item => item.label).join(', ') || 'nenhuma'}. Use as setas para percorrer as datas; a tabela acessível contém todos os valores.`);
  noActivity(): boolean { return this.buckets.every(bucket => this.definitions.every(series => bucket[series.key] === 0)); }
  toggle(key: SeriesKey): void { this.selected.update(items => items.includes(key) ? items.filter(item => item !== key) : [...items, key]); }
  x(index: number): number { return this.buckets.length < 2 ? 400 : index * 800 / (this.buckets.length - 1); }
  maximum(): number { return Math.max(1, ...this.buckets.flatMap(bucket => this.visible().map(item => bucket[item.key]))); }
  y(value: number, maximum = this.maximum()): number { return 180 - value * 155 / maximum; }
  path(key: SeriesKey): string { const maximum = this.maximum(); return this.buckets.map((bucket, index) => `${index ? 'L' : 'M'}${this.x(index).toFixed(2)},${this.y(bucket[key], maximum).toFixed(2)}`).join(' '); }
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
