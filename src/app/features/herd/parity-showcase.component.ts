import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { ContextStore } from '../../core/context/context.store';
import { PermissionService } from '../../core/permissions/permission.service';
import { GroupsPageComponent } from './groups-page.component';
import { AnimalImportPageComponent } from './animal-import-page.component';
import { AnimalManagementComponent } from './animal-management.component';
import { BreedingBatchComponent } from './breeding-batch.component';
import { HerdStatementsPageComponent } from '../reports/herd-statements-page.component';
import { AgendaPageComponent } from './agenda-page.component';
import { HerdApi } from './herd-api.service';
import { ParityApi } from './parity-api.service';
import { Animal } from './herd.models';
import { PlannerItem } from './herd-operations.models';
import {
  BreedingBatchCommand,
  CreateGroup,
  HerdGroup,
  ImportCommand,
  MilkCommand,
  UpdateGroup,
  emptyGroupRules,
} from './parity.models';

const demoAnimal: Animal = {
  id: '11111111-1111-4111-8111-111111111111',
  identification: 'BR-0248',
  name: 'Aurora',
  sex: 'FEMALE',
  birthDate: '2022-03-15',
  status: 'ACTIVE',
  version: 7,
  paddock: null,
};
const demoGroups: HerdGroup[] = [
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Matrizes em acompanhamento',
    kind: 'MANUAL',
    status: 'ACTIVE',
    rules: emptyGroupRules(),
    version: 2,
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Novilhas · 13 a 24 meses',
    kind: 'SMART',
    status: 'ACTIVE',
    rules: {
      ...emptyGroupRules(),
      status: 'ACTIVE',
      sex: 'FEMALE',
      minAgeMonths: 13,
      maxAgeMonths: 24,
    },
    version: 1,
  },
];
let demoPlanner: PlannerItem = {
  id: 'task1',
  operationId: 'demo-operation',
  title: 'Avaliar condição corporal das matrizes',
  type: 'GENERAL',
  scheduledFor: '2026-10-02',
  status: 'OPEN',
  groupId: demoGroups[0].id,
  animalId: null,
  notes: null,
  version: 2,
  createdAt: '2026-09-27T12:00:00Z',
  updatedAt: '2026-09-27T12:00:00Z',
  completedAt: null,
  cancelledAt: null,
  replay: false,
};
const demoApi = {
  animals: () =>
    of({
      items: [
        demoAnimal,
        {
          ...demoAnimal,
          id: '44444444-4444-4444-8444-444444444444',
          identification: 'BR-0250',
          name: 'Mimosa',
        },
      ],
      page: 0,
      size: 20,
      totalElements: 2,
      totalPages: 1,
    }),
  groups: () => of({ items: demoGroups, page: 0, size: 20, totalElements: 2 }),
  group: (id: string) => of(demoGroups.find((g) => g.id === id) || demoGroups[0]),
  groupAnimals: () =>
    of({
      items: [demoAnimal],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
      positionSemantics: 'CURRENT_STATE_AGED_AT_REFERENCE',
    }),
  createGroup: (body: CreateGroup) => of({ ...body, status: 'ACTIVE', version: 0 }),
  updateGroup: (id: string, body: UpdateGroup) =>
    of({
      ...demoGroups[0],
      id,
      name: body.name,
      rules: body.rules,
      version: body.expectedVersion + 1,
    }),
  archiveGroup: (id: string) => of({ ...demoGroups[0], id, status: 'ARCHIVED' }),
  membership: (id: string, _animalId: string, version: number) =>
    of({ ...demoGroups[0], id, version: version + 1 }),
  importAnimals: (body: ImportCommand) =>
    of({ animalIds: body.animals.map((a) => a.id), replayed: false }),
  breedBatch: (body: BreedingBatchCommand) =>
    of({
      items: body.mothers.map((m) => ({ motherId: m.id, pregnancyId: 'demo-pregnancy' })),
      replayed: false,
    }),
  note: () => of({ version: 8 }),
  correctMother: () => of({ version: 8 }),
  lifecycle: () => of({ ...demoAnimal, version: 8 }),
  recordMilk: (_id: string, body: MilkCommand) => of({ id: 'demo-milk', ...body }),
  milkHistory: () =>
    of({
      items: [
        {
          id: 'm1',
          recordedOn: '2026-09-27',
          liters: 18.75,
          session: 'MORNING',
          notes: 'Ordenha da manhã',
        },
        { id: 'm2', recordedOn: '2026-09-26', liters: 17.25, session: 'MORNING', notes: null },
      ],
      page: 0,
      size: 20,
      totalElements: 2,
    }),
  milkSummary: () =>
    of({
      lastRecord: { recordedOn: '2026-09-27', liters: 18.75 },
      averageLitersLast7Days: 17.8,
      recordsLast7Days: 7,
      trend: 'STABLE',
    }),
  milkOverview: () =>
    of({ litersToday: 342.75, femalesWithRecordToday: 18, averageLitersPerRecordLast7Days: 18.15 }),
  ageSexBalance: (date: string, historical: boolean) =>
    of({
      referenceDate: date,
      positionSemantics: historical
        ? 'RECORDED_FARM_EVENTS_WITH_CURRENTLY_CORRECTED_PROFILE'
        : 'CURRENT_STATE_AGED_AT_REFERENCE',
      totalActiveAnimals: 126,
      unknownBirthDate: 3,
      cells: [
        'MONTHS_0_2',
        'MONTHS_3_8',
        'MONTHS_9_12',
        'MONTHS_13_24',
        'MONTHS_25_36',
        'MONTHS_37_PLUS',
      ].flatMap((ageBand, i) => [
        { ageBand, sex: 'FEMALE', count: 10 + i },
        { ageBand, sex: 'MALE', count: 8 },
      ]),
    }),
  reconciliation: (from: string, to: string) =>
    of({
      from,
      to,
      positionSemantics: 'RECORDED_FARM_EVENT_LEDGER',
      balance: {
        openingAnimals: 120,
        closingAnimals: 126,
        births: 4,
        registeredAnimals: 3,
        transfersIn: 2,
        sales: 2,
        deaths: 1,
        transfersOut: 0,
      },
    }),
  coverage: (procedureCode: string, referenceDate: string) =>
    of({
      procedureCode,
      referenceDate,
      totalActiveAnimals: 126,
      unknownBirthDate: 3,
      withRecordedTreatment: 83,
      withoutRecordedTreatment: 43,
      cells: [
        {
          ageBand: 'MONTHS_3_8',
          sex: 'FEMALE',
          withRecordedTreatment: 8,
          withoutRecordedTreatment: 3,
        },
      ],
    }),
  agenda: () => of({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }),
  pendingWork: () => of({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }),
  plannerItem: () => of(demoPlanner),
  createPlanner: (body: Partial<PlannerItem>) =>
    of((demoPlanner = { ...demoPlanner, ...body, status: 'OPEN' })),
  correctPlanner: (_id: string, body: Partial<PlannerItem>) =>
    of((demoPlanner = { ...demoPlanner, ...body, version: demoPlanner.version + 1 })),
  completePlanner: () =>
    of((demoPlanner = { ...demoPlanner, status: 'COMPLETED', version: demoPlanner.version + 1 })),
  cancelPlanner: () =>
    of((demoPlanner = { ...demoPlanner, status: 'CANCELLED', version: demoPlanner.version + 1 })),
  planner: () =>
    of({
      items: [demoPlanner],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
    }),
};
@Component({
  selector: 'app-parity-showcase',
  imports: [
    GroupsPageComponent,
    AnimalImportPageComponent,
    AnimalManagementComponent,
    BreedingBatchComponent,
    HerdStatementsPageComponent,
    AgendaPageComponent,
  ],
  providers: [
    PermissionService,
    {
      provide: ContextStore,
      useValue: {
        selectedFarm: signal({ farmId: 'demo-farm', farmName: 'Fazenda Santa Helena' }),
        contextVersion: signal(0),
        transitionPending: signal(false),
        role: signal('OWNER'),
      },
    },
    { provide: ParityApi, useValue: demoApi },
    { provide: HerdApi, useValue: demoApi },
  ],
  template: ` <main>
    <header class="demo-nav">
      <strong>Demonstração local · dados fictícios</strong>
      <nav aria-label="Cenário de integração">
        @for (item of views; track item.id) {
          <button
            type="button"
            [attr.aria-pressed]="view() === item.id"
            (click)="view.set(item.id)"
          >
            {{ item.label }}
          </button>
        }
      </nav>
    </header>
    @switch (view()) {
      @case ('groups') {
        <app-groups-page />
      }
      @case ('import') {
        <app-animal-import-page />
      }
      @case ('animal') {
        <app-animal-management [animal]="animal" />
      }
      @case ('batch') {
        <app-breeding-batch />
      }
      @case ('reports') {
        <app-herd-statements-page />
      }
      @case ('agenda') {
        <app-agenda-page />
      }
    }
  </main>`,
  styles: [
    `
      main {
        max-width: 1240px;
        padding: 2rem;
        margin: auto;
      }
      .demo-nav {
        display: grid;
        gap: 0.8rem;
        margin-bottom: 2rem;
        padding: 1rem;
        background: var(--color-surface-soft);
        border-radius: var(--radius-lg);
        font-size: 0.8rem;
      }
      .demo-nav nav {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      .demo-nav button {
        padding: 0.6rem 1rem;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        background: white;
        cursor: pointer;
      }
      .demo-nav button[aria-pressed='true'] {
        background: var(--brand-primary);
        color: white;
      }
      @media (max-width: 900px) {
        main {
          padding: 1rem;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParityShowcaseComponent {
  readonly animal = demoAnimal;
  readonly views = [
    { id: 'groups', label: 'Grupos' },
    { id: 'import', label: 'Importação' },
    { id: 'animal', label: 'Gestão do animal' },
    { id: 'batch', label: 'Reprodução em lote' },
    { id: 'reports', label: 'Quadros gerenciais' },
    { id: 'agenda', label: 'Agenda' },
  ];
  readonly view = signal('groups');
}
