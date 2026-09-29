import { signal, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, Subject, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AppError, MembershipRole } from '../../core/api/api.models';
import { ContextStore } from '../../core/context/context.store';
import { ToastService } from '../../design-system/feedback/feedback';
import { HerdApi } from './herd-api.service';
import { ParityApi } from './parity-api.service';
import { AnimalImportPageComponent } from './animal-import-page.component';
import { GroupsPageComponent } from './groups-page.component';
import { AnimalManagementComponent } from './animal-management.component';
import { BreedingBatchComponent } from './breeding-batch.component';
import { HerdStatementsPageComponent } from '../reports/herd-statements-page.component';
import {
  AgeSexBalance,
  BreedingBatchResult,
  CountedPage,
  HerdGroup,
  ImportResult,
  MilkRecord,
  MilkSummary,
  emptyGroupRules,
} from './parity.models';
import { Animal, Page } from './herd.models';

HTMLDialogElement.prototype.showModal ??= function () {
  this.open = true;
};
HTMLDialogElement.prototype.close ??= function () {
  this.open = false;
};
const animal: Animal = {
  id: 'a1',
  identification: 'A1',
  name: 'Aurora',
  sex: 'FEMALE',
  status: 'ACTIVE',
  birthDate: '2020-01-01',
  version: 7,
  paddock: null,
};
const group: HerdGroup = {
  id: 'g1',
  name: 'Matrizes',
  kind: 'MANUAL',
  status: 'ACTIVE',
  version: 4,
  rules: emptyGroupRules(),
};
const balance: AgeSexBalance = {
  referenceDate: '2026-01-01',
  positionSemantics: 'CURRENT_STATE_AGED_AT_REFERENCE',
  totalActiveAnimals: 0,
  unknownBirthDate: 0,
  cells: [],
};
const csv = 'identificação;nome;sexo;nascimento;mãe\nA1;;Fêmea;;';

async function setup<T>(
  component: Type<T>,
  role: MembershipRole = 'OWNER',
  initialize?: (api: ReturnType<typeof mocks>) => void,
  inputs?: Record<string, object>,
) {
  const api = mocks();
  initialize?.(api);
  const context = {
    selectedFarm: signal({ farmId: 'farm1', farmName: 'Fazenda Norte' }),
    contextVersion: signal(0),
    transitionPending: signal(false),
    role: signal<MembershipRole | null>(role),
  };
  await TestBed.configureTestingModule({
    imports: [component],
    providers: [
      provideRouter([]),
      { provide: ContextStore, useValue: context },
      { provide: ParityApi, useValue: api },
      { provide: HerdApi, useValue: api },
      { provide: ToastService, useValue: { show: vi.fn() } },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(component);
  if (inputs)
    for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, component: fixture.componentInstance, api, context };
}
function mocks() {
  return {
    animal: vi.fn((_id: string): Observable<Animal> => of(animal)),
    lifecycleExact: vi.fn((_id: string, _body: string): Observable<Animal> =>
      of({ ...animal, status: 'SOLD' }),
    ),
    animals: vi.fn((): Observable<Page<Animal>> =>
      of({ items: [animal], page: 0, size: 20, totalElements: 1, totalPages: 1 }),
    ),
    groups: vi.fn((): Observable<CountedPage<HerdGroup>> =>
      of({ items: [group], page: 0, size: 20, totalElements: 1 }),
    ),
    group: vi.fn(() => of(group)),
    createGroup: vi.fn((): Observable<HerdGroup> => of(group)),
    updateGroup: vi.fn((): Observable<HerdGroup> => of({ ...group, version: 5 })),
    archiveGroup: vi.fn(() => of({ ...group, status: 'ARCHIVED' })),
    membership: vi.fn((): Observable<HerdGroup> => of({ ...group, version: 5 })),
    groupAnimals: vi.fn(() =>
      of({
        items: [animal],
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
        positionSemantics: 'CURRENT_STATE_AGED_AT_REFERENCE',
      }),
    ),
    importAnimals: vi.fn((): Observable<ImportResult> =>
      of({ animalIds: ['a1'], replayed: false }),
    ),
    breedBatch: vi.fn((): Observable<BreedingBatchResult> =>
      of({ items: [{ motherId: animal.id, pregnancyId: 'p1' }], replayed: false }),
    ),
    correctMother: vi.fn(() =>
      of({ animalId: animal.id, motherId: null, version: 8, replayed: false }),
    ),
    note: vi.fn(() =>
      of({
        animalId: animal.id,
        operationId: 'op',
        occurredOn: '2026-09-01',
        notes: 'Observação',
        version: 8,
        replayed: false,
      }),
    ),
    lifecycle: vi.fn(() => of({ ...animal, status: 'SOLD' })),
    recordMilk: vi.fn(() => of({ id: 'milk1' })),
    milkHistory: vi.fn((): Observable<CountedPage<MilkRecord>> =>
      of({ items: [], page: 0, size: 20, totalElements: 0 }),
    ),
    milkSummary: vi.fn((): Observable<MilkSummary> =>
      of({
        lastRecord: null,
        averageLitersLast7Days: null,
        recordsLast7Days: 0,
        trend: 'INSUFFICIENT_DATA',
      }),
    ),
    ageSexBalance: vi.fn((): Observable<AgeSexBalance> => of(balance)),
    reconciliation: vi.fn(() =>
      of({
        from: '2026-01-01',
        to: '2026-01-01',
        positionSemantics: 'RECORDED_FARM_EVENT_LEDGER',
        balance: {
          openingAnimals: 0,
          closingAnimals: 0,
          births: 0,
          registeredAnimals: 0,
          deaths: 0,
          sales: 0,
          transfersIn: 0,
          transfersOut: 0,
        },
      }),
    ),
    coverage: vi.fn(() =>
      of({
        procedureCode: 'BRUCELLOSIS',
        referenceDate: '2026-01-01',
        totalActiveAnimals: 0,
        withRecordedTreatment: 0,
        withoutRecordedTreatment: 0,
        unknownBirthDate: 0,
        cells: [],
      }),
    ),
    milkOverview: vi.fn(() =>
      of({ litersToday: 15, femalesWithRecordToday: 1, averageLitersPerRecordLast7Days: 14 }),
    ),
  };
}
describe('Importação utilizável e atômica', () => {
  it('exibe erros de linha e não envia lote inválido', async () => {
    const { component, fixture, api } = await setup(AnimalImportPageComponent);
    component.csv = 'identificação;nome;sexo;nascimento;mãe\nA1;;inválido;;';
    component.preview();
    component.submit();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Linha 2');
    expect(api.importAnimals).not.toHaveBeenCalled();
  });
  it('preserva operação e UUIDs após resposta perdida, inclusive ao clicar Revisar novamente', async () => {
    const { component, api } = await setup(AnimalImportPageComponent, 'OWNER', (api) =>
      api.importAnimals.mockReturnValue(
        throwError(() => new AppError('unavailable', 'Tente novamente', 503, 'UNAVAILABLE')),
      ),
    );
    component.csv = csv;
    component.preview();
    component.submit();
    const first = api.importAnimals.mock.calls[0];
    component.preview();
    component.submit();
    expect(api.importAnimals.mock.calls[1]).toEqual(first);
  });
  it('descarta recibo tardio ao trocar a fazenda', async () => {
    const response = new Subject<ImportResult>();
    const { component, context, fixture } = await setup(AnimalImportPageComponent, 'OWNER', (api) =>
      api.importAnimals.mockReturnValue(response),
    );
    component.csv = csv;
    component.preview();
    component.submit();
    expect(response.observed).toBe(true);
    context.contextVersion.update((x) => x + 1);
    fixture.detectChanges();
    expect(response.observed).toBe(false);
    expect(component.csv).toBe('');
    response.next({ animalIds: ['old'], replayed: false });
    expect(component.result()).toBeNull();
    expect(component.review()).toBeNull();
  });
  it('VIEWER não recebe ação nem consegue importar', async () => {
    const { component, api, fixture } = await setup(AnimalImportPageComponent, 'VIEWER');
    component.csv = csv;
    component.preview();
    component.submit();
    expect(api.importAnimals).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('exige permissão');
  });
});
describe('Grupos de manejo', () => {
  it('operador consulta membros e não administra grupos', async () => {
    const { component, fixture, api } = await setup(GroupsPageComponent, 'OPERATOR');
    component.openCreate();
    component.select(group);
    fixture.detectChanges();
    expect(component.editorOpen()).toBe(false);
    expect(fixture.nativeElement.querySelector('header.page-header button')).toBeNull();
    expect(api.groupAnimals).toHaveBeenCalledWith(group.id, 0, component.today);
  });
  it('calcula páginas a partir do total real e valida idade das regras', async () => {
    const { component } = await setup(GroupsPageComponent);
    component.groups.set({ items: [], page: 0, size: 20, totalElements: 41 });
    expect(component.groupPages()).toBe(3);
    component.openCreate();
    component.name = 'Novilhas';
    component.kind = 'SMART';
    component.rules.minAgeMonths = 20;
    component.rules.maxAgeMonths = 10;
    expect(component.valid()).toBe(false);
    component.rules.maxAgeMonths = 30;
    expect(component.valid()).toBe(true);
  });
  it('usa versão atualizada após associar um animal e preserva sucesso ao paginar', async () => {
    const result = new Subject<HerdGroup>();
    const { component, api } = await setup(GroupsPageComponent, 'OWNER', (api) =>
      api.membership.mockReturnValue(result),
    );
    component.select(group);
    component.membership(animal, true);
    expect(component.membershipReview()?.group.version).toBe(4);
    component.confirmMembership();
    component.load(1);
    result.next({ ...group, version: 5 });
    result.complete();
    expect(component.saving()).toBe(false);
    expect(component.selected()?.version).toBe(5);
    expect(api.membership).toHaveBeenCalledWith('g1', 'a1', 4, true);
  });
  it('separa erro de membros e estado sem grupos', async () => {
    const { component, fixture } = await setup(GroupsPageComponent);
    component.groups.set({ items: [], page: 0, size: 20, totalElements: 0 });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nenhum grupo cadastrado');
    component.select(group);
    component.membersError.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Não foi possível carregar os membros');
  });
  it('revisa criação e edição com versão fresca e comando congelado', async () => {
    const { component, api } = await setup(GroupsPageComponent, 'OWNER', (a) =>
      a.group.mockReturnValue(of({ ...group, version: 9 })),
    );
    component.openCreate();
    component.name = 'Teste local de grupo';
    component.reviewEditor();
    expect(api.createGroup).not.toHaveBeenCalled();
    expect(component.reviewing()).toBe(true);
    component.save();
    expect(api.createGroup).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Teste local de grupo' }),
    );
    component.edit(group);
    component.name = 'Nome revisado';
    component.reviewEditor();
    expect(api.group).toHaveBeenCalledWith(group.id);
    component.save();
    expect(api.updateGroup).toHaveBeenCalledWith(
      group.id,
      expect.objectContaining({ expectedVersion: 9, name: 'Nome revisado' }),
    );
  });
  it('revisa associação e arquivamento com a versão atual do grupo', async () => {
    const { component, api } = await setup(GroupsPageComponent, 'OWNER', (a) =>
      a.group.mockReturnValue(of({ ...group, version: 12 })),
    );
    component.select(group);
    component.membership(animal, true);
    expect(api.membership).not.toHaveBeenCalled();
    component.confirmMembership();
    expect(api.membership).toHaveBeenCalledWith(group.id, animal.id, 12, true);
    component.beginArchive(group);
    expect(component.archiving()?.version).toBe(12);
    component.archive();
    expect(api.archiveGroup).toHaveBeenCalledWith(group.id, 12);
  });
  it('cancela consultas e operações de grupo na troca de contexto', async () => {
    const request = new Subject<HerdGroup>();
    const { component, api, context, fixture } = await setup(GroupsPageComponent, 'OWNER', (a) =>
      a.group.mockReturnValue(request),
    );
    component.edit(group);
    component.name = 'Rascunho de outra fazenda';
    component.reviewEditor();
    expect(request.observed).toBe(true);
    context.contextVersion.update((n) => n + 1);
    fixture.detectChanges();
    expect(request.observed).toBe(false);
    expect(component.editorOpen()).toBe(false);
    expect(component.name).toBe('');
    expect(component.editing()).toBeNull();
    expect(component.reviewing()).toBe(false);
    component.save();
    expect(api.updateGroup).not.toHaveBeenCalled();
  });
  it('rejeita data de referência inválida antes de consultar membros', async () => {
    const { component, api } = await setup(GroupsPageComponent);
    component.select(group);
    api.groupAnimals.mockClear();
    component.referenceDate = '2026-02-30';
    component.loadMembers(0);
    expect(api.groupAnimals).not.toHaveBeenCalled();
    expect(component.membersError()).toBe(true);
    expect(component.formError()).toContain('referência de idade válida');
  });
});
describe('Gestão contextual do animal', () => {
  it('registra litros como número, versão e turno e solicita refresh ao pai', async () => {
    const { component, api } = await setup(AnimalManagementComponent, 'OPERATOR', undefined, {
      animal,
    });
    const changed = vi.fn();
    component.changed.subscribe(changed);
    component.open('milk');
    component.milkLiters = '12,125';
    component.session = 'MORNING';
    component.prepare();
    component.submit();
    expect(api.recordMilk).toHaveBeenCalledWith(
      animal.id,
      expect.objectContaining({ expectedVersion: 7, liters: 12.125, session: 'MORNING' }),
    );
    expect(changed).toHaveBeenCalledOnce();
  });
  it('remoção materna exige escolha explícita e envia null', async () => {
    const { component, api } = await setup(AnimalManagementComponent, 'OWNER', undefined, {
      animal,
    });
    component.open('mother');
    component.prepare();
    component.submit();
    expect(api.correctMother).not.toHaveBeenCalled();
    component.removeMother = true;
    component.prepare();
    component.submit();
    expect(api.correctMother).toHaveBeenCalledWith(
      animal.id,
      expect.objectContaining({ expectedVersion: 7, motherId: null }),
    );
  });
  it('limita notas e rejeita data anterior ao nascimento', async () => {
    const { component, api } = await setup(AnimalManagementComponent, 'OWNER', undefined, {
      animal,
    });
    component.open('note');
    component.notes = ' ';
    expect(component.valid()).toBe(false);
    component.notes = 'Observação';
    component.occurredOn = '2019-01-01';
    component.prepare();
    component.submit();
    expect(api.note).not.toHaveBeenCalled();
    component.occurredOn = component.today;
    component.prepare();
    component.submit();
    expect(api.note).toHaveBeenCalledWith(
      animal.id,
      expect.objectContaining({ notes: 'Observação', expectedVersion: 7 }),
    );
  });
  it('operador não vende e VIEWER não recebe ações mutáveis', async () => {
    const { component, api } = await setup(AnimalManagementComponent, 'OPERATOR', undefined, {
      animal,
    });
    component.open('sale');
    expect(component.action()).toBeNull();
    expect(api.lifecycle).not.toHaveBeenCalled();
  });
  it('mostra estado sem produção e erro independente de leitura', async () => {
    const { fixture, component } = await setup(AnimalManagementComponent, 'VIEWER', undefined, {
      animal,
    });
    expect(fixture.nativeElement.textContent).toContain('Nenhum registro de leite');
    expect(fixture.nativeElement.querySelector('.parity-actions button')).toBeNull();
    component.readError.set(
      new AppError('unavailable', 'Indisponível', 503, 'READ_FAILED', 'ref-1'),
    );
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Não foi possível carregar a produção');
  });
  it('consulta a versão atual e mantém o comando revisado nas tentativas', async () => {
    const { component, api } = await setup(
      AnimalManagementComponent,
      'OWNER',
      (a) => {
        a.animal.mockReturnValue(of({ ...animal, version: 11 }));
        a.note.mockReturnValue(
          throwError(() => new AppError('unavailable', 'Falha', 503, 'FAILED')),
        );
      },
      { animal },
    );
    component.open('note');
    component.notes = 'Observação revisada';
    component.prepare();
    expect(api.note).not.toHaveBeenCalled();
    expect(component.reviewedVersion()).toBe(11);
    component.submit();
    const first = api.note.mock.calls[0];
    component.notes = 'Alteração posterior';
    component.submit();
    expect(api.note.mock.calls[1]).toEqual(first);
    expect(first).toEqual([
      animal.id,
      expect.objectContaining({ expectedVersion: 11, notes: 'Observação revisada' }),
    ]);
  });
  it('cancela a consulta de versão e apaga todos os rascunhos na troca de contexto', async () => {
    const pending = new Subject<Animal>();
    const { fixture, component, api, context } = await setup(
      AnimalManagementComponent,
      'OWNER',
      (a) => a.animal.mockReturnValue(pending),
      { animal },
    );
    component.open('sale');
    component.saleBuyer = 'Comprador fictício';
    component.saleAmount = '12,34';
    component.notes = 'Rascunho';
    component.prepare();
    expect(pending.observed).toBe(true);
    context.contextVersion.update((n) => n + 1);
    fixture.detectChanges();
    expect(pending.observed).toBe(false);
    expect(component.action()).toBeNull();
    expect(component.saleBuyer).toBe('');
    expect(component.saleAmount).toBe('');
    expect(component.notes).toBe('');
    pending.next({ ...animal, version: 18 });
    expect(component.confirming()).toBe(false);
    expect(api.lifecycle).not.toHaveBeenCalled();
  });
  it('cancela a escrita pendente e impede confirmação simultânea', async () => {
    const pending = new Subject<any>();
    const { fixture, component, api, context } = await setup(
      AnimalManagementComponent,
      'OWNER',
      (a) => a.recordMilk.mockReturnValue(pending),
      { animal },
    );
    component.open('milk');
    component.milkLiters = '1,125';
    component.prepare();
    component.submit();
    component.submit();
    expect(api.recordMilk).toHaveBeenCalledOnce();
    expect(pending.observed).toBe(true);
    context.contextVersion.update((n) => n + 1);
    fixture.detectChanges();
    expect(pending.observed).toBe(false);
    expect(component.milkLiters).toBe('');
    expect(component.session).toBeNull();
  });
  it('preserva todos os dígitos da venda sem conversão para Number', async () => {
    const { component, api } = await setup(AnimalManagementComponent, 'OWNER', undefined, {
      animal,
    });
    component.open('sale');
    component.saleAmount = '99999999999999999,99';
    component.prepare();
    component.submit();
    expect(api.lifecycleExact).toHaveBeenCalledWith(
      animal.id,
      expect.stringContaining('"saleAmount":99999999999999999.99'),
    );
    expect(api.lifecycle).not.toHaveBeenCalled();
  });
  it('impede revisão de leite quando a consulta revela baixa posterior', async () => {
    const { component, api } = await setup(
      AnimalManagementComponent,
      'OWNER',
      (a) => a.animal.mockReturnValue(of({ ...animal, status: 'DECEASED', version: 8 })),
      { animal },
    );
    component.open('milk');
    component.milkLiters = '1';
    component.prepare();
    expect(component.confirming()).toBe(false);
    expect(component.actionError()).toContain('estado atual');
    component.submit();
    expect(api.recordMilk).not.toHaveBeenCalled();
  });
  it('oferece nova tentativa de leitura da versão sem efetuar escrita', async () => {
    const { component, api } = await setup(
      AnimalManagementComponent,
      'OWNER',
      (a) =>
        a.animal.mockReturnValueOnce(
          throwError(() => new AppError('unavailable', 'Indisponível', 503, 'FAILED')),
        ),
      { animal },
    );
    component.open('death');
    component.prepare();
    expect(component.preparing()).toBe(false);
    expect(component.confirming()).toBe(false);
    expect(component.actionError()).toContain('Indisponível');
    component.prepare();
    expect(component.confirming()).toBe(true);
    expect(api.lifecycle).not.toHaveBeenCalled();
  });
});
describe('Reprodução em lote', () => {
  it('seleção paginada evita duplicação e limita a 100', async () => {
    const { component } = await setup(BreedingBatchComponent);
    component.start();
    component.add(animal);
    component.add(animal);
    expect(component.selected()).toHaveLength(1);
    for (let i = 0; i < 110; i++) component.add({ ...animal, id: 'a' + i });
    expect(component.selected()).toHaveLength(100);
  });
  it('gera payload atômico com versões e emite atualização após recibo', async () => {
    const { component, api } = await setup(BreedingBatchComponent);
    component.start();
    component.add(animal);
    component.review();
    const changed = vi.fn();
    component.changed.subscribe(changed);
    component.submit();
    expect(api.breedBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        mothers: [{ id: animal.id, expectedVersion: 7 }],
        expectedCalvingOn: null,
      }),
    );
    expect(component.result()?.items).toHaveLength(1);
    expect(changed).toHaveBeenCalledOnce();
  });
  it('em conflito preserva lote para replay e não mostra sucesso parcial', async () => {
    const { component, api } = await setup(BreedingBatchComponent, 'OWNER', (api) =>
      api.breedBatch.mockReturnValue(
        throwError(() => new AppError('conflict', 'Conflito', 409, 'HERD_VERSION_CONFLICT')),
      ),
    );
    component.start();
    component.add(animal);
    component.review();
    component.submit();
    const first = api.breedBatch.mock.calls[0];
    component.submit();
    expect(api.breedBatch.mock.calls[1]).toEqual(first);
    expect(component.result()).toBeNull();
    expect(component.error()).toContain('Nenhuma gestação');
  });
  it('consulta todas as versões antes da revisão sem gravar antecipadamente', async () => {
    const { component, api } = await setup(BreedingBatchComponent, 'OWNER', (a) =>
      a.animal.mockImplementation((id) => of({ ...animal, id, version: 12 })),
    );
    component.start();
    component.add(animal);
    component.add({ ...animal, id: 'a2' });
    component.review();
    expect(api.animal).toHaveBeenCalledTimes(2);
    expect(api.breedBatch).not.toHaveBeenCalled();
    component.submit();
    expect(api.breedBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        mothers: [
          { id: 'a1', expectedVersion: 12 },
          { id: 'a2', expectedVersion: 12 },
        ],
      }),
    );
  });
  it('cancela consultas e apaga todos os dados do lote na troca de contexto', async () => {
    const pending = new Subject<Animal>();
    const { component, api, context, fixture } = await setup(BreedingBatchComponent, 'OWNER', (a) =>
      a.animal.mockReturnValue(pending),
    );
    component.start();
    component.add(animal);
    component.notes = 'Rascunho da fazenda anterior';
    component.sireReference = 'Reprodutor fictício';
    component.serviceType = 'NATURAL_SERVICE';
    component.review();
    expect(pending.observed).toBe(true);
    context.contextVersion.update((n) => n + 1);
    fixture.detectChanges();
    expect(pending.observed).toBe(false);
    expect(component.notes).toBe('');
    expect(component.sireReference).toBe('');
    expect(component.serviceType).toBe('INSEMINATION');
    expect(component.selected()).toEqual([]);
    expect(component.confirming()).toBe(false);
    component.submit();
    expect(api.breedBatch).not.toHaveBeenCalled();
  });
  it('impede escrita simultânea e cancela sua inscrição na troca de contexto', async () => {
    const pending = new Subject<BreedingBatchResult>();
    const { component, api, context, fixture } = await setup(BreedingBatchComponent, 'OWNER', (a) =>
      a.breedBatch.mockReturnValue(pending),
    );
    component.start();
    component.add(animal);
    component.review();
    component.submit();
    component.submit();
    expect(api.breedBatch).toHaveBeenCalledOnce();
    context.contextVersion.update((n) => n + 1);
    fixture.detectChanges();
    expect(pending.observed).toBe(false);
    expect(component.result()).toBeNull();
  });
  it('rejeita matriz baixada, data anterior ao nascimento e textos fora do contrato', async () => {
    const { component, api } = await setup(BreedingBatchComponent, 'OWNER', (a) =>
      a.animal.mockReturnValue(of({ ...animal, status: 'DECEASED' })),
    );
    component.start();
    component.add({ ...animal, sex: 'MALE' });
    expect(component.selected()).toEqual([]);
    component.add(animal);
    component.serviceOn = '2019-01-01';
    expect(component.valid()).toBe(false);
    component.serviceOn = component.today;
    component.notes = 'x'.repeat(1001);
    expect(component.valid()).toBe(false);
    component.notes = '';
    component.review();
    expect(component.error()).toContain('mudou de estado');
    expect(component.confirming()).toBe(false);
    component.submit();
    expect(api.breedBatch).not.toHaveBeenCalled();
  });
});
describe('Quadros gerenciais', () => {
  it('distingue posição atual, histórica e ausência de animais', async () => {
    const { component, fixture, api } = await setup(HerdStatementsPageComponent);
    expect(fixture.nativeElement.textContent).toContain('Nenhum animal nesta posição');
    component.switchKind('historical');
    expect(api.ageSexBalance).toHaveBeenLastCalledWith(component.referenceDate, true);
    expect(component.semantics()).toContain('atualmente corrigidos');
  });
  it('não relabela indicador de leite quando o filtro editável muda', async () => {
    const { component, fixture } = await setup(HerdStatementsPageComponent);
    component.referenceDate = '2026-01-01';
    component.switchKind('milk');
    component.referenceDate = '2026-02-01';
    fixture.detectChanges();
    expect(component.milkReference()).toBe('2026-01-01');
    expect(fixture.nativeElement.textContent).toContain('01/01/2026');
  });
  it('rejeita futuro e período invertido antes de enviar consulta', async () => {
    const { component, api } = await setup(HerdStatementsPageComponent);
    component.from = '2026-02-02';
    component.to = '2026-01-01';
    component.switchKind('flows');
    expect(api.reconciliation).not.toHaveBeenCalled();
    expect(component.filterError()).not.toBe('');
  });
  it('descarta resposta de tipo anterior mesmo quando novo filtro é inválido', async () => {
    const request = new Subject<AgeSexBalance>();
    const { component } = await setup(HerdStatementsPageComponent, 'OWNER', (api) =>
      api.ageSexBalance.mockReturnValue(request),
    );
    component.referenceDate = '2999-01-01';
    component.switchKind('milk');
    request.next(balance);
    expect(component.result()).toBeNull();
  });
  it('mostra erro com referência sem confundir com quadro vazio', async () => {
    const { component, fixture } = await setup(HerdStatementsPageComponent, 'OWNER', (api) =>
      api.ageSexBalance.mockReturnValue(
        throwError(() => new AppError('unavailable', 'Indisponível', 503, 'READ_FAILED', 'ref-1')),
      ),
    );
    fixture.detectChanges();
    expect(component.error()?.requestId).toBe('ref-1');
    expect(fixture.nativeElement.textContent).toContain('Não foi possível carregar o quadro');
  });
});
