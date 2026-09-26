import { ChangeDetectionStrategy, Component, computed, effect, signal } from '@angular/core';
import { ContextStore } from '../../core/context/context.store';
import { ErrorStateComponent, SkeletonComponent } from '../../design-system/feedback/feedback';
import { TerritoryFieldComponent, TerritoryRegion } from '../../design-system/patterns/operational-patterns';
import { DashboardStore } from './dashboard.store';
import { TerritoryItem, mapTerritory } from './dashboard.models';

interface RegionGeometry { path: string; x: number; y: number }

const FIELD_LAYOUTS: Record<number, RegionGeometry[]> = {
  1: [{ path: 'M48 54C144 27 275 38 365 55S575 29 672 74L650 309C540 336 421 316 342 326S151 342 58 294Z', x: 360, y: 184 }],
  2: [
    { path: 'M45 58C128 31 244 43 331 68L315 307C224 333 125 319 56 286Z', x: 184, y: 183 },
    { path: 'M349 61C443 35 570 42 675 82L650 300C558 329 445 315 337 300Z', x: 505, y: 183 },
  ],
  3: [
    { path: 'M47 55C131 31 239 42 340 65L321 172C224 188 126 178 55 151Z', x: 187, y: 112 },
    { path: 'M52 190C139 166 224 185 322 201L313 310C222 333 121 318 58 282Z', x: 184, y: 254 },
    { path: 'M364 59C468 33 584 49 675 84L649 301C555 330 445 316 343 292Z', x: 510, y: 184 },
  ],
  4: [
    { path: 'M45 57C133 31 237 43 333 67L316 171C224 188 128 177 54 150Z', x: 184, y: 111 },
    { path: 'M358 61C455 35 574 48 675 82L650 171C557 190 459 178 344 163Z', x: 510, y: 112 },
    { path: 'M52 191C141 169 227 184 322 202L313 311C220 333 120 318 58 283Z', x: 184, y: 254 },
    { path: 'M347 194C449 170 561 188 654 207L646 301C551 329 445 315 342 291Z', x: 506, y: 254 },
  ],
  5: [
    { path: 'M45 57C116 34 194 42 251 63L237 171C168 187 103 174 53 149Z', x: 145, y: 111 },
    { path: 'M272 58C346 37 430 45 487 67L475 170C407 185 334 176 258 163Z', x: 371, y: 111 },
    { path: 'M507 62C562 43 626 55 675 83L650 171C599 184 548 178 493 163Z', x: 582, y: 111 },
    { path: 'M52 193C157 165 273 185 365 207L345 309C244 333 129 316 58 282Z', x: 202, y: 254 },
    { path: 'M385 196C474 171 570 188 654 208L646 301C556 329 459 314 365 291Z', x: 510, y: 254 },
  ],
  6: [
    { path: 'M45 57C116 34 194 42 251 63L237 171C168 187 103 174 53 149Z', x: 145, y: 111 },
    { path: 'M272 58C346 37 430 45 487 67L475 170C407 185 334 176 258 163Z', x: 371, y: 111 },
    { path: 'M507 62C562 43 626 55 675 83L650 171C599 184 548 178 493 163Z', x: 582, y: 111 },
    { path: 'M51 192C119 171 192 184 250 204L238 309C169 327 104 314 58 282Z', x: 145, y: 254 },
    { path: 'M270 195C342 173 426 186 488 207L476 304C406 324 333 314 257 291Z', x: 371, y: 254 },
    { path: 'M506 194C563 176 618 191 654 208L646 300C596 321 543 314 493 290Z', x: 582, y: 254 },
  ],
};

@Component({
  selector: 'app-territory-overview',
  imports: [ErrorStateComponent, SkeletonComponent, TerritoryFieldComponent],
  template: `<section class="territory-section" aria-labelledby="territory-title">
    <div class="section-heading"><div><span class="section-kicker">TERRITÓRIO</span><h2 id="territory-title">Distribuição atual</h2></div><span class="section-note">Representação operacional · sem escala</span></div>
    @if(store.overview().status==='ready' && store.overview().value; as overview){
      @if(store.paddocks().status==='ready' && store.paddocks().value; as paddocks){
        @if(paddocks.length){
          <gr-territory-field title="Campo territorial" [scope]="context.selectedFarm()?.farmName || 'Fazenda atual'" [label]="fieldLabel()" [regions]="regions()" [selected]="selected()" [compact]="true" (selectedChange)="select($event)" />
          <div class="territory-reading" [class.attention]="overview.herdSnapshot.unlocatedAnimals>0">
            <span class="reading-marker" aria-hidden="true"></span>
            @if(selectedRegion(); as region){<strong>{{region.name}}</strong><span>{{formatNumber(region.count)}} {{region.count===1?'animal':'animais'}} na região selecionada</span><button type="button" (click)="selected.set('')">Limpar seleção</button>}
            @else if(overview.herdSnapshot.unlocatedAnimals>0){<strong>Sem localização</strong><span>{{formatNumber(overview.herdSnapshot.unlocatedAnimals)}} {{overview.herdSnapshot.unlocatedAnimals===1?'animal ainda não está associado':'animais ainda não estão associados'}} a um piquete</span>}
            @else{<strong>Território associado</strong><span>Todo o rebanho ativo está vinculado a um piquete</span>}
          </div>
        } @else {<div class="territory-empty"><span aria-hidden="true"></span><div><strong>Nenhum piquete cadastrado</strong><p>O rebanho continua disponível; a leitura territorial aparecerá quando houver piquetes.</p></div></div>}
      } @else if(store.paddocks().status==='error'){
        <gr-error-state title="Não foi possível carregar os piquetes" [description]="errorText(store.paddocks().error?.message)" [reference]="reference(store.paddocks().error?.requestId)" (retry)="store.retry('paddocks')" />
      } @else {<div class="territory-loading" aria-label="Carregando território"><gr-skeleton /><div><gr-skeleton /><gr-skeleton /></div></div>}
    } @else if(store.overview().status==='error'){
      <gr-error-state title="Não foi possível carregar o rebanho" [description]="errorText(store.overview().error?.message)" [reference]="reference(store.overview().error?.requestId)" (retry)="store.retry('overview')" />
    } @else {<div class="territory-loading" aria-label="Carregando rebanho"><gr-skeleton /><div><gr-skeleton /><gr-skeleton /></div></div>}
  </section>`,
  styleUrl: './territory-overview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TerritoryOverviewComponent {
  readonly selected = signal('');
  readonly regions = computed(() => this.toRegions(mapTerritory(this.store.overview().value?.herdSnapshot ?? { activeAnimals: 0, bySex: {}, byCategory: {}, byPaddock: [], unlocatedAnimals: 0 }, this.store.paddocks().value ?? [])));
  readonly selectedRegion = computed(() => this.regions().find(item => item.id === this.selected()) ?? null);
  readonly fieldLabel = computed(() => `${this.regions().length} ${this.regions().length === 1 ? 'região abstrata' : 'regiões abstratas'} da fazenda; representação operacional sem escala`);

  constructor(readonly store: DashboardStore, readonly context: ContextStore) {
    effect(() => { this.context.contextVersion(); this.selected.set(''); });
  }

  select(id: string): void { this.selected.update(current => current === id ? '' : id); }
  formatNumber(value: number): string { return new Intl.NumberFormat('pt-BR').format(value); }
  errorText(value?: string): string { return value || 'Verifique sua conexão e tente novamente.'; }
  reference(value?: string): string { return value?.slice(0, 12) || ''; }

  private toRegions(items: TerritoryItem[]): TerritoryRegion[] {
    const visible = items.length > 6 ? [...items.slice(0, 5), this.group(items.slice(5))] : items;
    const geometry = FIELD_LAYOUTS[Math.max(1, visible.length)];
    const maximum = Math.max(1, ...visible.map(item => item.animals));
    return visible.map((item, index) => ({
      id: item.id, name: item.name, count: item.animals, path: geometry[index].path,
      labelX: geometry[index].x, labelY: geometry[index].y,
      detail: item.code || (item.status === 'INACTIVE' ? 'Piquete inativo' : undefined),
      status: item.status === 'INACTIVE' ? 'attention' : item.animals ? 'normal' : 'empty',
      density: item.animals ? .08 + item.animals / maximum * .22 : 0,
    }));
  }

  private group(items: TerritoryItem[]): TerritoryItem {
    return { id: '__remaining', name: 'Outros piquetes', code: `${items.length} piquetes`, status: 'ACTIVE', animals: items.reduce((sum, item) => sum + item.animals, 0) };
  }
}
