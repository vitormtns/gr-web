import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ErrorStateComponent, SkeletonComponent } from '../../design-system/feedback/feedback';
import { DashboardStore } from './dashboard.store';
import { PaddockTotal, TerritoryItem, mapTerritory } from './dashboard.models';

@Component({
  selector: 'app-territory-overview',
  imports: [ErrorStateComponent, SkeletonComponent],
  template: `<section class="territory-section" aria-labelledby="territory-title">
    <div class="section-heading">
      <div><span class="section-kicker">POSIÇÃO ATUAL</span><h2 id="territory-title">Território vivo</h2></div>
      <span class="section-note">Representação operacional · sem escala</span>
    </div>

    @if(store.overview().status==='ready' && store.overview().value; as overview){
      <div class="territory-shell">
        <div class="herd-rail" aria-label="Resumo atual do território">
          <div class="herd-primary"><span>Animais ativos</span><strong>{{formatNumber(overview.herdSnapshot.activeAnimals)}}</strong><small>no contexto atual</small></div>
          <div class="herd-metric"><span>Piquetes ocupados</span><strong>{{formatNumber(occupied(overview.herdSnapshot.byPaddock))}}</strong></div>
          <div class="herd-metric" [class.attention]="overview.herdSnapshot.unlocatedAnimals>0"><span>Sem localização</span><strong>{{formatNumber(overview.herdSnapshot.unlocatedAnimals)}}</strong></div>
        </div>

        @if(store.paddocks().status==='ready' && store.paddocks().value; as paddocks){
          @if(paddocks.length){
            @let items = territory(overview.herdSnapshot, paddocks);
            <div class="territory-field" role="list" aria-label="Piquetes e ocupação">
              <span class="field-orbit orbit-one" aria-hidden="true"></span>
              <span class="field-orbit orbit-two" aria-hidden="true"></span>
              @for(paddock of items; track paddock.id; let index = $index){
                <article class="paddock" [class.unoccupied]="!paddock.animals" [class.inactive]="paddock.status==='INACTIVE'" [attr.data-shape]="index % 4" role="listitem">
                  <div class="paddock-heading">
                    <span class="paddock-index" aria-hidden="true">{{twoDigits(index + 1)}}</span>
                    <div><strong>{{paddock.name}}</strong>@if(paddock.status==='INACTIVE'){<small>Inativo</small>}@else if(paddock.code){<small>{{paddock.code}}</small>}@else{<small>Piquete ativo</small>}</div>
                  </div>
                  <div class="paddock-reading"><strong>{{formatNumber(paddock.animals)}}</strong><span>{{paddock.animals===1?'animal':'animais'}}</span></div>
                  <div class="density-track" aria-hidden="true"><i [style.width.%]="density(paddock, items)"></i></div>
                </article>
              }
            </div>

            <div class="territory-status" [class.attention]="overview.herdSnapshot.unlocatedAnimals>0">
              <span class="status-dot" aria-hidden="true"></span>
              @if(overview.herdSnapshot.unlocatedAnimals>0){
                <strong>{{formatNumber(overview.herdSnapshot.unlocatedAnimals)}} {{overview.herdSnapshot.unlocatedAnimals===1?'animal ainda não está associado':'animais ainda não estão associados'}} a um piquete.</strong>
              }@else{
                <strong>Todo o rebanho ativo está associado a um piquete.</strong>
              }
            </div>
          }
          @else{
            <div class="territory-empty"><span class="empty-orbit" aria-hidden="true"></span><div><strong>Esta fazenda ainda não possui piquetes cadastrados.</strong><p>O rebanho continua visível; a leitura territorial aparecerá quando houver piquetes.</p></div></div>
          }
        }
        @else if(store.paddocks().status==='error'){
          <gr-error-state title="Não foi possível carregar os piquetes" [description]="errorText(store.paddocks().error?.message)" [reference]="reference(store.paddocks().error?.requestId)" (retry)="store.retry('paddocks')" />
        }
        @else{
          <div class="territory-skeleton"><gr-skeleton /><gr-skeleton /><gr-skeleton /></div>
        }
      </div>
    }
    @else if(store.overview().status==='error'){
      <gr-error-state title="Não foi possível carregar o rebanho" [description]="errorText(store.overview().error?.message)" [reference]="reference(store.overview().error?.requestId)" (retry)="store.retry('overview')" />
    }
    @else{
      <div class="territory-loading" aria-label="Carregando rebanho"><gr-skeleton /><div><gr-skeleton /><gr-skeleton /><gr-skeleton /></div></div>
    }
  </section>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TerritoryOverviewComponent {
  territory = mapTerritory;
  constructor(readonly store: DashboardStore) {}
  occupied(items: PaddockTotal[]): number { return items.filter(item => item.total > 0).length; }
  density(item: TerritoryItem, items: TerritoryItem[]): number {
    const maximum = Math.max(1, ...items.map(candidate => candidate.animals));
    return item.animals === 0 ? 0 : Math.max(10, Math.round(item.animals / maximum * 100));
  }
  twoDigits(value: number): string { return value.toString().padStart(2, '0'); }
  formatNumber(value: number): string { return new Intl.NumberFormat('pt-BR').format(value); }
  errorText(value?: string): string { return value || 'Verifique sua conexão e tente novamente.'; }
  reference(value?: string): string { return value?.slice(0, 12) || ''; }
}
