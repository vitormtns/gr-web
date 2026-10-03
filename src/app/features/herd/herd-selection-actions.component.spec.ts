import { signal, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, Subject, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ContextStore } from '../../core/context/context.store';
import { MembershipRole } from '../../core/api/api.models';
import { ToastService } from '../../design-system/feedback/feedback';
import { BreedingBatchComponent } from './breeding-batch.component';
import { HealthPageComponent } from './health-page.component';
import { HerdSelectionActionsComponent } from './herd-selection-actions.component';
import { GroupsPageComponent } from './groups-page.component';
import { HerdApi } from './herd-api.service';
import { ParityApi } from './parity-api.service';
import { Animal } from './herd.models';
import { emptyGroupRules } from './parity.models';

const female: Animal = {
  id: 'a1',
  identification: 'Matriz 1',
  name: null,
  sex: 'FEMALE',
  status: 'ACTIVE',
  birthDate: null,
  version: 7,
  paddock: null,
};
const group = {
  id: 'g1',
  name: 'Matrizes',
  kind: 'MANUAL' as const,
  status: 'ACTIVE' as const,
  version: 9,
  rules: emptyGroupRules(),
};

async function setup<T>(component: Type<T>, role: MembershipRole = 'OWNER') {
  const context = {
    contextVersion: signal(0),
    transitionPending: signal(false),
    selectedFarm: signal({ farmId: 'f1', farmName: 'Fazenda' }),
    role: signal<MembershipRole | null>(role),
  };
  const herd = {
    animal: vi.fn((_id: string): Observable<Animal> => of(female)),
    healthReport: vi.fn(() => of({ summary: {}, items: [] })),
    recordHealthBatch: vi.fn((_body: unknown) => of({ replayed: false, items: [] })),
  };
  const parity = {
    groups: vi.fn(() => of({ items: [group], page: 0, size: 20, totalElements: 1 })),
    group: vi.fn(() => of(group)),
    groupAnimals: vi.fn((_id: string, _page = 0, _ref = '', _size = 20) =>
      of({
        items: [female],
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
        positionSemantics: 'CURRENT_STATE_AGED_AT_REFERENCE' as const,
      }),
    ),
    breedBatch: vi.fn((_body: unknown) => of({ items: [], replayed: false })),
    createGroupWithAnimals: vi.fn((_body: unknown): Observable<unknown> =>
      of({ group, addedCount: 1, alreadyMemberCount: 0, replayed: false }),
    ),
    membershipBatch: vi.fn((_id: string, _body: unknown) =>
      of({ group, addedCount: 1, alreadyMemberCount: 0, replayed: false }),
    ),
  };
  await TestBed.configureTestingModule({
    imports: [component],
    providers: [
      provideRouter([]),
      { provide: ContextStore, useValue: context },
      { provide: HerdApi, useValue: herd },
      { provide: ParityApi, useValue: parity },
      { provide: ToastService, useValue: { show: vi.fn() } },
    ],
  })
    .overrideComponent(component, { set: { template: '' } })
    .compileComponents();
  const fixture = TestBed.createComponent(component);
  if (component === HerdSelectionActionsComponent)
    fixture.componentRef.setInput('animals', [female]);
  if (component === HealthPageComponent) fixture.componentRef.setInput('embedded', true);
  fixture.detectChanges();
  await fixture.whenStable();
  return { component: fixture.componentInstance, fixture, context, herd, parity };
}

describe('Snapshot explícito para lotes e grupos', () => {
  it('grupo consulta todas as páginas antes de transportar o conjunto para ações', async () => {
    const { component, parity } = await setup(GroupsPageComponent);
    component.select(group);
    component.members.set({
      items: [female],
      page: 0,
      size: 20,
      totalElements: 21,
      totalPages: 2,
      positionSemantics: 'CURRENT_STATE_AGED_AT_REFERENCE',
    });
    parity.groupAnimals.mockImplementation((_id, page) =>
      of({
        items: Array.from({ length: 21 }, (_, i) => ({ ...female, id: String(i) })),
        page,
        size: 100,
        totalElements: 21,
        totalPages: 1,
        positionSemantics: 'CURRENT_STATE_AGED_AT_REFERENCE' as const,
      }),
    );
    parity.groupAnimals.mockClear();
    component.selectGroupSnapshot();
    expect(component.selectedMembers()).toHaveLength(21);
    expect(parity.groupAnimals).toHaveBeenCalledExactlyOnceWith(group.id, 0, component.referenceDate, 100);
  });
  it('grupo acima de 100 não vira seleção parcial', async () => {
    const { component, parity } = await setup(GroupsPageComponent);
    component.select(group);
    component.members.set({
      items: [female],
      page: 0,
      size: 20,
      totalElements: 101,
      totalPages: 6,
      positionSemantics: 'CURRENT_STATE_AGED_AT_REFERENCE',
    });
    parity.groupAnimals.mockClear();
    component.selectGroupSnapshot();
    expect(parity.groupAnimals).not.toHaveBeenCalled();
    expect(component.selectedMembers()).toEqual([]);
    expect(component.snapshotMessage()).toContain('mais de 100');
  });
  it('cria grupo com IDs revistos em uma operação e mantém o recibo na tentativa após falha', async () => {
    const { component, fixture, herd, parity } = await setup(HerdSelectionActionsComponent);
    component.openGroup();
    component.name = 'Lote revisto';
    component.reviewGroup();
    expect(herd.animal).toHaveBeenCalledWith(female.id);
    expect(component.reviewing()).toBe(true);
    fixture.componentRef.setInput('animals', [{ ...female, id: 'outro' }]);
    fixture.detectChanges();
    parity.createGroupWithAnimals.mockReturnValueOnce(throwError(() => new Error('rede')));
    component.submitGroup();
    const command = parity.createGroupWithAnimals.mock.calls[0][0];
    expect(command).toMatchObject({ name: 'Lote revisto', animalIds: ['a1'] });
    component.submitGroup();
    expect(parity.createGroupWithAnimals.mock.calls[1][0]).toEqual(command);
  });
  it('consulta versão do grupo existente antes da confirmação e não grava no preparo', async () => {
    const { component, parity } = await setup(HerdSelectionActionsComponent);
    component.openGroup();
    component.mode = 'existing';
    component.groupId = group.id;
    component.reviewGroup();
    expect(parity.group).toHaveBeenCalledWith(group.id);
    expect(parity.membershipBatch).not.toHaveBeenCalled();
    component.submitGroup();
    expect(parity.membershipBatch).toHaveBeenCalledWith(
      group.id,
      expect.objectContaining({ expectedVersion: 9, animalIds: ['a1'] }),
    );
  });
  it('troca de fazenda cancela o preparo e descarta a revisão do grupo', async () => {
    const { component, fixture, context, herd, parity } = await setup(
      HerdSelectionActionsComponent,
    );
    const pending = new Subject<Animal>();
    herd.animal.mockReturnValue(pending);
    component.openGroup();
    component.name = 'Novo';
    component.reviewGroup();
    context.transitionPending.set(true);
    fixture.detectChanges();
    expect(pending.observed).toBe(false);
    expect(component.groupOpen()).toBe(false);
    component.submitGroup();
    expect(parity.createGroupWithAnimals).not.toHaveBeenCalled();
  });
  it('não consulta nem envia mais de 100 animais ou seleção sem permissão', async () => {
    const { component, fixture, herd, parity } = await setup(HerdSelectionActionsComponent);
    fixture.componentRef.setInput(
      'animals',
      Array.from({ length: 101 }, (_, i) => ({ ...female, id: String(i) })),
    );
    fixture.detectChanges();
    component.openGroup();
    expect(component.groupOpen()).toBe(false);
    expect(herd.animal).not.toHaveBeenCalled();
    expect(parity.groups).not.toHaveBeenCalled();
  });
  it('serviço exige que toda seleção seja feminina ativa, sem descartar machos silenciosamente', async () => {
    const { component, herd, parity } = await setup(BreedingBatchComponent);
    herd.animal.mockReturnValue(of({ ...female, sex: 'MALE' }));
    component.startWithSelection([female]);
    expect(component.selected()).toEqual([]);
    expect(component.error()).toContain('machos');
    component.review();
    component.submit();
    expect(parity.breedBatch).not.toHaveBeenCalled();
  });
  it('serviço reconsulta versões antes de formar o comando da seleção', async () => {
    const { component, herd, parity } = await setup(BreedingBatchComponent);
    component.startWithSelection([{ ...female, version: 1 }]);
    herd.animal.mockReturnValue(of({ ...female, version: 12 }));
    component.review();
    component.submit();
    expect(parity.breedBatch).toHaveBeenCalledWith(
      expect.objectContaining({ mothers: [{ id: 'a1', expectedVersion: 12 }] }),
    );
  });
  it('saúde embedded não consulta relatório e mantém IDs escolhidos ao revisar a versão atual', async () => {
    const { component, herd } = await setup(HealthPageComponent);
    expect(herd.healthReport).not.toHaveBeenCalled();
    component.openSelected([{ ...female, version: 1 }]);
    expect(component.batch).toBe(true);
    expect(component.animalIds).toEqual(['a1']);
    herd.animal.mockReturnValue(of({ ...female, version: 15 }));
    component.prepare();
    component.save();
    expect(herd.recordHealthBatch).toHaveBeenCalledWith(
      expect.objectContaining({ animals: [{ id: 'a1', expectedVersion: 15 }] }),
    );
  });
  it('saúde descarta consulta atrasada na troca de contexto e não envia lote parcial', async () => {
    const { component, fixture, herd, context } = await setup(HealthPageComponent);
    const pending = new Subject<Animal>();
    herd.animal.mockReturnValue(pending);
    component.openSelected([female]);
    context.transitionPending.set(true);
    fixture.detectChanges();
    expect(pending.observed).toBe(false);
    expect(component.creating()).toBe(false);
    component.prepare();
    component.save();
    expect(herd.recordHealthBatch).not.toHaveBeenCalled();
  });
  it('VIEWER não prepara operações de seleção', async () => {
    const { component, parity } = await setup(HerdSelectionActionsComponent, 'VIEWER');
    component.openGroup();
    expect(component.groupOpen()).toBe(false);
    expect(parity.groups).not.toHaveBeenCalled();
  });
});
