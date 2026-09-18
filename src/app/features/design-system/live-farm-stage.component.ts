import { ChangeDetectionStrategy, Component, HostListener, inject } from '@angular/core';
import {
  AnimalLensesComponent,
  AnimalSignalComponent,
  AttentionStackComponent,
  LiveMetricDeckComponent,
  LiveTerritoryComponent,
  MovementPathComponent,
  OperationStreamComponent,
} from './live-farm-objects';
import { DEMO_ANIMALS, LiveFarmState, PeriodKey, ScenarioKey } from './live-farm.state';

@Component({
  selector: 'gr-live-farm-stage',
  imports: [
    LiveMetricDeckComponent,
    LiveTerritoryComponent,
    AnimalSignalComponent,
    AttentionStackComponent,
    MovementPathComponent,
    AnimalLensesComponent,
    OperationStreamComponent,
  ],
  providers: [LiveFarmState],
  templateUrl: './live-farm-stage.component.html',
  styleUrl: './live-farm-stage.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiveFarmStageComponent {
  readonly state = inject(LiveFarmState);
  readonly animals = DEMO_ANIMALS;
  readonly periods: { id: PeriodKey; label: string }[] = [
    { id: 'today', label: 'Hoje' },
    { id: '7d', label: '7 dias' },
    { id: '30d', label: '30 dias' },
    { id: '90d', label: '90 dias' },
  ];
  readonly scenarios: { id: ScenarioKey; label: string }[] = [
    { id: 'normal', label: 'Normal' },
    { id: 'attention', label: 'Atenção' },
    { id: 'empty', label: 'Vazio' },
  ];
  @HostListener('document:keydown.escape') clearFocus(): void {
    this.state.clearFocus();
  }
}
