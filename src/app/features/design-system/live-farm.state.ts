import { computed, Injectable, signal } from '@angular/core';

export type PeriodKey = 'today' | '7d' | '30d' | '90d';
export type ScenarioKey = 'normal' | 'attention' | 'empty';

export interface DemoAnimal {
  id: string;
  name: string;
  paddockId: string;
  weight: number;
  previousWeight: number;
  lastWeight: string;
  health: string;
  healthDetail: string;
  reproduction: 'Sem gestação' | 'Gestação confirmada' | 'Não acompanhada';
  reproductionStage: number;
  nextEvent: string;
  accent: string;
}

export interface DemoEvent {
  id: number;
  time: string;
  type: 'movement' | 'weight' | 'health' | 'reproduction';
  animalId: string;
  title: string;
  detail: string;
  paddockId?: string;
}

export const DEMO_ANIMALS: DemoAnimal[] = [
  {
    id: 'BR-0187',
    name: 'Mimosa',
    paddockId: 'norte-1',
    weight: 438,
    previousWeight: 426,
    lastWeight: '04 set.',
    health: 'Acompanhamento em dia',
    healthDetail: 'Vacinação há 18 dias',
    reproduction: 'Sem gestação',
    reproductionStage: 0,
    nextEvent: 'Pesagem pendente',
    accent: '#6f57a8',
  },
  {
    id: 'BR-0312',
    name: 'Aurora',
    paddockId: 'maternidade',
    weight: 412,
    previousWeight: 405,
    lastWeight: '11 set.',
    health: 'Operação normal',
    healthDetail: 'Último cuidado em 02 set.',
    reproduction: 'Gestação confirmada',
    reproductionStage: 2,
    nextEvent: 'Parto previsto · 18 out.',
    accent: '#8b64b7',
  },
  {
    id: 'BR-0098',
    name: 'Estrela',
    paddockId: 'sul',
    weight: 390,
    previousWeight: 384,
    lastWeight: '08 set.',
    health: 'Vacinação recente',
    healthDetail: 'Protocolo em 14 set.',
    reproduction: 'Não acompanhada',
    reproductionStage: 0,
    nextEvent: 'Revisão sanitária · 24 set.',
    accent: '#3c7b68',
  },
];

export const PADDOCKS = [
  { id: 'norte-1', name: 'Pasto Norte 1', count: 84, level: 0.78 },
  { id: 'norte-2', name: 'Pasto Norte 2', count: 63, level: 0.58 },
  { id: 'sul', name: 'Pasto Sul', count: 112, level: 1 },
  { id: 'leste', name: 'Pasto Leste', count: 71, level: 0.66 },
  { id: 'maternidade', name: 'Maternidade', count: 38, level: 0.38 },
  { id: 'recria', name: 'Recria', count: 60, level: 0.55 },
];

@Injectable()
export class LiveFarmState {
  readonly selectedAnimalId = signal('BR-0187');
  readonly selectedPaddockId = signal('norte-1');
  readonly selectedPeriod = signal<PeriodKey>('30d');
  readonly scenario = signal<ScenarioKey>('attention');
  readonly hoveredPaddockId = signal<string | null>(null);
  readonly focusedDomain = signal<string | null>(null);
  readonly expandedAnimal = signal(false);
  readonly movementState = signal<'idle' | 'moving' | 'complete'>('idle');
  readonly animalLocations = signal<Record<string, string>>({});
  readonly events = signal<DemoEvent[]>([
    {
      id: 1,
      time: '09:31',
      type: 'movement',
      animalId: 'BR-0098',
      title: 'Movimentação concluída',
      detail: 'Pasto Norte 2 → Pasto Sul',
      paddockId: 'sul',
    },
    {
      id: 2,
      time: '08:54',
      type: 'weight',
      animalId: 'BR-0187',
      title: 'Pesagem registrada',
      detail: 'Mimosa · 438 kg',
      paddockId: 'norte-1',
    },
    {
      id: 3,
      time: 'Ontem',
      type: 'reproduction',
      animalId: 'BR-0312',
      title: 'Gestação confirmada',
      detail: 'Aurora · Maternidade',
      paddockId: 'maternidade',
    },
    {
      id: 4,
      time: '17 set.',
      type: 'health',
      animalId: 'BR-0098',
      title: 'Protocolo sanitário',
      detail: 'Estrela · vacinação',
      paddockId: 'sul',
    },
  ]);

  readonly selectedAnimal = computed(() => {
    const base =
      DEMO_ANIMALS.find((animal) => animal.id === this.selectedAnimalId()) ?? DEMO_ANIMALS[0];
    return { ...base, paddockId: this.animalLocations()[base.id] ?? base.paddockId };
  });
  readonly selectedPaddock = computed(
    () => PADDOCKS.find((paddock) => paddock.id === this.selectedPaddockId()) ?? PADDOCKS[0],
  );
  readonly activePaddockId = computed(() => this.hoveredPaddockId() ?? this.selectedPaddockId());
  readonly periodMetrics = computed(
    () =>
      ({
        today: [428, 6, 3, 9],
        '7d': [428, 6, 5, 21],
        '30d': [428, 6, 8, 47],
        '90d': [421, 6, 14, 126],
      })[this.selectedPeriod()],
  );
  readonly attentionCount = computed(() => {
    if (this.scenario() === 'empty') return 0;
    return this.scenario() === 'attention' ? this.periodMetrics()[2] : 1;
  });
  readonly visibleEvents = computed(() => {
    const limit = { today: 2, '7d': 3, '30d': 4, '90d': 4 }[this.selectedPeriod()];
    return this.scenario() === 'empty' ? [] : this.events().slice(0, limit);
  });

  selectAnimal(id: string): void {
    const animal = DEMO_ANIMALS.find((item) => item.id === id);
    if (!animal) return;
    this.selectedAnimalId.set(id);
    const paddockId = this.animalLocations()[id] ?? animal.paddockId;
    this.selectedPaddockId.set(paddockId);
    this.focusedDomain.set('animal');
  }

  selectPaddock(id: string): void {
    this.selectedPaddockId.set(id);
    const animal = DEMO_ANIMALS.find(
      (item) => (this.animalLocations()[item.id] ?? item.paddockId) === id,
    );
    if (animal) this.selectedAnimalId.set(animal.id);
    this.focusedDomain.set('territory');
  }

  simulateMovement(): void {
    if (this.movementState() === 'moving') return;
    const animal = this.selectedAnimal();
    const destination = animal.paddockId === 'sul' ? 'norte-1' : 'sul';
    const originName = PADDOCKS.find((item) => item.id === animal.paddockId)?.name ?? 'Origem';
    const destinationName = PADDOCKS.find((item) => item.id === destination)?.name ?? 'Destino';
    this.movementState.set('moving');
    window.setTimeout(() => {
      this.animalLocations.update((locations) => ({ ...locations, [animal.id]: destination }));
      this.selectedPaddockId.set(destination);
      this.events.update((events) => [
        {
          id: Date.now(),
          time: 'Agora',
          type: 'movement',
          animalId: animal.id,
          title: 'Movimentação simulada',
          detail: `${originName} → ${destinationName}`,
          paddockId: destination,
        },
        ...events,
      ]);
      this.movementState.set('complete');
      window.setTimeout(() => this.movementState.set('idle'), 900);
    }, 620);
  }

  clearFocus(): void {
    this.hoveredPaddockId.set(null);
    this.focusedDomain.set(null);
    this.expandedAnimal.set(false);
  }
}
