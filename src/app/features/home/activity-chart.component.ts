import { ChangeDetectionStrategy, Component, Input, signal } from '@angular/core';
import { ActivityBucket } from './dashboard.models';

type SeriesKey = 'births' | 'deaths' | 'sales' | 'movements' | 'weights' | 'healthTreatments' | 'breedings' | 'calvings';
interface SeriesDefinition { key: SeriesKey; label: string; color: string }
interface ActivityEvent { date: string; label: string; value: number; color: string }

@Component({
  selector: 'app-activity-chart',
  template: `@if(mode()==='empty'){
    <div class="empty-pulse" role="status"><span aria-hidden="true"></span><div><strong>Nenhuma atividade registrada neste período</strong><small>Novos fatos operacionais aparecerão aqui.</small></div></div>
  } @else if(mode()==='sparse'){
    <ol class="sparse-events" aria-label="Eventos no período">
      @for(event of events(); track event.date + event.label){<li><time [attr.datetime]="event.date">{{formatDate(event.date)}}</time><i [style.background]="event.color" aria-hidden="true"></i><div><strong>{{event.label}}</strong><span>{{event.value}} {{event.value===1?'registro':'registros'}}</span></div></li>}
    </ol>
    <p class="sparse-note">Leitura por eventos · período com baixa atividade</p>
  } @else {
    <div class="legend" role="group" aria-label="Séries da atividade">
      @for(series of definitions; track series.key){<button type="button" [class.selected]="selected().includes(series.key)" [attr.aria-pressed]="selected().includes(series.key)" (click)="toggle(series.key)"><i [style.background]="series.color" aria-hidden="true"></i>{{series.label}}</button>}
    </div>
    <div class="chart-wrap">
      <svg viewBox="0 0 800 176" preserveAspectRatio="none" role="img" tabindex="0" [attr.aria-label]="description()" (keydown)="onKey($event)" (mousemove)="onPointer($event)" (mouseleave)="focused.set(null)" (focus)="focused.set(focused() ?? 0)">
        <line x1="0" y1="154" x2="800" y2="154" class="baseline"/><line x1="200" y1="14" x2="200" y2="154" class="date-guide"/><line x1="400" y1="14" x2="400" y2="154" class="date-guide"/><line x1="600" y1="14" x2="600" y2="154" class="date-guide"/>
        @for(series of visible(); track series.key; let seriesIndex=$index){
          <line x1="0" [attr.y1]="laneY(seriesIndex)" x2="800" [attr.y2]="laneY(seriesIndex)" class="lane"/>
          @for(bucket of buckets; track bucket.date; let bucketIndex=$index){@if(bucket[series.key]>0){<line [attr.x1]="x(bucketIndex)" [attr.y1]="laneY(seriesIndex)" [attr.x2]="x(bucketIndex)" [attr.y2]="laneY(seriesIndex)-pulseHeight(bucket[series.key])" [attr.stroke]="series.color" class="pulse-stem"/><circle [attr.cx]="x(bucketIndex)" [attr.cy]="laneY(seriesIndex)-pulseHeight(bucket[series.key])" r="3.5" [attr.fill]="series.color" class="pulse-dot"/>}}
        }
        @if(focused()!==null && buckets[focused()!]){<line [attr.x1]="x(focused()!)" y1="10" [attr.x2]="x(focused()!)" y2="154" class="cursor"/>}
      </svg>
      @if(focused()!==null && buckets[focused()!]){<div class="chart-tooltip" role="status"><strong>{{formatDate(buckets[focused()!].date)}}</strong>@for(series of visible();track series.key){<span><i [style.background]="series.color"></i>{{series.label}}<b>{{buckets[focused()!][series.key]}}</b></span>}</div>}
    </div>
    <div class="axis"><span>{{formatDate(buckets[0]?.date)}}</span><span>linha do tempo operacional</span><span>{{formatDate(buckets[buckets.length-1]?.date)}}</span></div>
  }
  <table class="sr-only"><caption>Atividade diária da fazenda no período</caption><thead><tr><th scope="col">Data</th>@for(series of definitions;track series.key){<th scope="col">{{series.label}}</th>}</tr></thead><tbody>@for(bucket of buckets;track bucket.date){<tr><th scope="row">{{formatDate(bucket.date)}}</th>@for(series of definitions;track series.key){<td>{{bucket[series.key]}}</td>}</tr>}</tbody></table>`,
  styles: [`
    :host{display:block;min-width:0}.legend{display:flex;flex-wrap:wrap;gap:.25rem;margin-bottom:.7rem}.legend button{min-height:1.8rem;display:flex;align-items:center;gap:.4rem;padding:.15rem .5rem;border:1px solid transparent;border-radius:999px;color:var(--color-text-muted);background:transparent;font-size:.65rem;cursor:pointer;transition:background var(--duration-fast),border-color var(--duration-fast),color var(--duration-fast)}.legend button:hover{color:var(--color-text);background:var(--color-surface-soft)}.legend button.selected{border-color:var(--color-border);color:var(--color-text);background:var(--color-surface)}.legend i,.chart-tooltip i{width:.42rem;height:.42rem;display:inline-block;border-radius:50%}.legend button:not(.selected) i{opacity:.32}.chart-wrap{position:relative;height:8.5rem;overflow:hidden;border-radius:.7rem;background:linear-gradient(180deg,color-mix(in srgb,var(--color-surface-soft) 74%,transparent),transparent)}.chart-wrap svg{width:100%;height:100%;cursor:crosshair}.baseline{stroke:var(--color-border-strong)}.lane{stroke:var(--color-border);stroke-width:.8;stroke-dasharray:2 7}.date-guide{stroke:var(--color-border);stroke-width:.6;stroke-dasharray:2 8}.pulse-stem{stroke-width:3;stroke-linecap:round;opacity:.72;vector-effect:non-scaling-stroke}.pulse-dot{stroke:var(--color-surface);stroke-width:2;vector-effect:non-scaling-stroke}.cursor{stroke:var(--color-text-muted);stroke-dasharray:3 4}.chart-tooltip{position:absolute;top:.5rem;right:.75rem;display:grid;gap:.2rem;min-width:8rem;padding:.5rem .65rem;border:1px solid var(--color-border);border-radius:.6rem;background:rgb(255 255 255/94%);box-shadow:var(--shadow-floating);font-size:.65rem;pointer-events:none}.chart-tooltip strong{font-size:.7rem}.chart-tooltip span{display:flex;align-items:center;gap:.35rem;color:var(--color-text-secondary)}.chart-tooltip b{margin-left:auto;color:var(--color-text);font-variant-numeric:tabular-nums}.axis{display:grid;grid-template-columns:1fr auto 1fr;margin-top:.3rem;color:var(--color-text-muted);font-size:.58rem;letter-spacing:.05em;text-transform:uppercase}.axis span:last-child{text-align:right}.empty-pulse{min-height:5.5rem;display:flex;align-items:center;justify-content:center;gap:.75rem;padding:1rem;border-block:1px solid var(--color-border)}.empty-pulse>span{width:.65rem;height:.65rem;border:2px solid var(--color-border-strong);border-radius:50%;box-shadow:0 0 0 .4rem rgb(82 97 88/5%)}.empty-pulse strong,.empty-pulse small{display:block}.empty-pulse strong{font-size:.75rem}.empty-pulse small{margin-top:.15rem;color:var(--color-text-muted);font-size:.675rem}.sparse-events{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));margin:0;padding:0;border-block:1px solid var(--color-border);list-style:none}.sparse-events li{min-height:5.2rem;display:grid;grid-template-columns:auto .5rem 1fr;align-items:center;gap:.65rem;padding:.75rem}.sparse-events li+li{border-left:1px solid var(--color-border)}.sparse-events time{color:var(--color-text-muted);font-size:.65rem;font-variant-numeric:tabular-nums}.sparse-events i{width:.5rem;height:.5rem;border-radius:50%}.sparse-events strong,.sparse-events span{display:block}.sparse-events strong{font-size:.75rem}.sparse-events span{color:var(--color-text-secondary);font-size:.65rem}.sparse-note{margin:.4rem 0 0;color:var(--color-text-muted);font-size:.6rem}@media(max-width:42rem){.sparse-events{grid-template-columns:1fr}.sparse-events li+li{border-top:1px solid var(--color-border);border-left:0}.axis span:nth-child(2){display:none}.axis{grid-template-columns:1fr 1fr}}
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityChartComponent {
  @Input({ required: true }) buckets: ActivityBucket[] = [];
  readonly definitions: SeriesDefinition[] = [
    { key: 'births', label: 'Nascimentos', color: '#287d50' }, { key: 'movements', label: 'Movimentações', color: '#326b86' },
    { key: 'healthTreatments', label: 'Tratamentos', color: '#a15f0b' }, { key: 'weights', label: 'Pesagens', color: '#7057a8' },
    { key: 'sales', label: 'Vendas', color: '#816147' }, { key: 'deaths', label: 'Mortes', color: '#b23a3a' },
    { key: 'breedings', label: 'Coberturas', color: '#637a49' }, { key: 'calvings', label: 'Partos', color: '#547c80' },
  ];
  readonly selected = signal<SeriesKey[]>(['births', 'movements', 'healthTreatments', 'weights']);
  readonly focused = signal<number | null>(null);
  visible(): SeriesDefinition[] { return this.definitions.filter(item => this.selected().includes(item.key)); }
  events(): ActivityEvent[] { return this.buckets.flatMap(bucket => this.definitions.filter(series => bucket[series.key] > 0).map(series => ({ date: bucket.date, label: series.label, value: bucket[series.key], color: series.color }))); }
  mode(): 'empty'|'sparse'|'pulse' { const count = this.events().length; return count === 0 ? 'empty' : count <= 3 ? 'sparse' : 'pulse'; }
  description(): string { return `Gráfico de atividade. Séries visíveis: ${this.visible().map(item => item.label).join(', ') || 'nenhuma'}. Use as setas para percorrer as datas; a tabela acessível contém todos os valores.`; }
  toggle(key: SeriesKey): void { this.selected.update(items => items.includes(key) ? items.filter(item => item !== key) : [...items, key]); }
  x(index: number): number { return this.buckets.length < 2 ? 400 : index * 800 / (this.buckets.length - 1); }
  maximum(): number { return Math.max(1, ...this.buckets.flatMap(bucket => this.visible().map(item => bucket[item.key]))); }
  laneY(index: number): number { return 30 + index * (112 / Math.max(1, this.visible().length - 1)); }
  pulseHeight(value: number): number { return 8 + Math.min(30, value / this.maximum() * 30); }
  onKey(event: KeyboardEvent): void { if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key) || !this.buckets.length) return; event.preventDefault(); const next = event.key==='Home'?0:event.key==='End'?this.buckets.length-1:(this.focused()??0)+(event.key==='ArrowRight'?1:-1); this.focused.set(Math.max(0,Math.min(this.buckets.length-1,next))); }
  onPointer(event: MouseEvent): void { if (!this.buckets.length) return; const box=(event.currentTarget as SVGElement).getBoundingClientRect(); this.focused.set(Math.max(0,Math.min(this.buckets.length-1,Math.round((event.clientX-box.left)/box.width*(this.buckets.length-1))))); }
  formatDate(value?: string): string { if (!value) return '—'; const [year,month,day]=value.split('-'); return `${day}/${month}/${year}`; }
}
