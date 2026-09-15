import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MetricComponent } from '../../design-system/data-display/data-display';
import { ErrorStateComponent, SkeletonComponent } from '../../design-system/feedback/feedback';
import { DashboardStore } from './dashboard.store';
import { PaddockTotal, mapTerritory } from './dashboard.models';

@Component({
  selector: 'app-territory-overview',
  imports: [MetricComponent, ErrorStateComponent, SkeletonComponent],
  template: `<section class="territory-section" aria-labelledby="territory-title">
    <div class="section-heading"><div><span class="section-kicker">POSIÇÃO ATUAL</span><h2 id="territory-title">Território e rebanho</h2></div><span class="section-note">Representação operacional · não cartográfica</span></div>
    @if(store.overview().status==='ready' && store.overview().value; as overview){
      <div class="herd-rail"><div class="herd-primary"><span>Animais ativos</span><strong>{{formatNumber(overview.herdSnapshot.activeAnimals)}}</strong></div><gr-metric label="Piquetes ocupados" [value]="formatNumber(occupied(overview.herdSnapshot.byPaddock))" /><gr-metric label="Sem localização" [value]="formatNumber(overview.herdSnapshot.unlocatedAnimals)" /></div>
      @if(store.paddocks().status==='ready' && store.paddocks().value; as paddocks){
        @if(paddocks.length){<div class="territory-field" role="list" aria-label="Piquetes e ocupação">@for(paddock of territory(overview.herdSnapshot, paddocks); track paddock.id){<div class="paddock" [class.unoccupied]="!paddock.animals" [class.inactive]="paddock.status==='INACTIVE'" role="listitem"><span class="paddock-marker" aria-hidden="true"></span><div><strong>{{paddock.name}}</strong>@if(paddock.status==='INACTIVE'){<small>Inativo</small>}@else if(paddock.code){<small>{{paddock.code}}</small>}</div><span class="paddock-count">{{formatNumber(paddock.animals)}} <small>{{paddock.animals===1?'animal':'animais'}}</small></span></div>}</div>}
        @else{<div class="territory-empty"><strong>Esta fazenda ainda não possui piquetes cadastrados.</strong><p>O rebanho permanece visível acima; a leitura territorial aparecerá quando houver piquetes.</p></div>}
      }@else if(store.paddocks().status==='error'){<gr-error-state title="Não foi possível carregar os piquetes" [description]="errorText(store.paddocks().error?.message)" [reference]="reference(store.paddocks().error?.requestId)" (retry)="store.retry('paddocks')" />}
      @else{<div class="territory-skeleton"><gr-skeleton /><gr-skeleton /><gr-skeleton /></div>}
    }@else if(store.overview().status==='error'){<gr-error-state title="Não foi possível carregar o rebanho" [description]="errorText(store.overview().error?.message)" [reference]="reference(store.overview().error?.requestId)" (retry)="store.retry('overview')" />}
    @else{<div class="territory-loading" aria-label="Carregando rebanho"><gr-skeleton /><div><gr-skeleton /><gr-skeleton /><gr-skeleton /></div></div>}
  </section>`,
  styleUrl: './territory-overview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TerritoryOverviewComponent {
  territory = mapTerritory;
  constructor(readonly store: DashboardStore) {}
  occupied(items: PaddockTotal[]): number { return items.filter(item => item.total > 0).length; }
  formatNumber(value: number): string { return new Intl.NumberFormat('pt-BR').format(value); }
  errorText(value?: string): string { return value || 'Verifique sua conexão e tente novamente.'; }
  reference(value?: string): string { return value?.slice(0, 12) || ''; }
}
