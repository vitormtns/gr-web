import { Component, input, output, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { MembershipRole } from '../../core/api/api.models';
import { ContextStore } from '../../core/context/context.store';
import { ToastService } from '../../design-system/feedback/feedback';
import { AnimalPickerComponent } from './animal-picker.component';
import { BreedingBatchComponent } from './breeding-batch.component';
import { HerdApi } from './herd-api.service';
import { Animal } from './herd.models';
import { FarmPregnancyPage, Pregnancy, ReproductionReport } from './herd-operations.models';
import { ReproductionPageComponent } from './reproduction-page.component';

@Component({ selector: 'app-animal-picker', template: '' })
class PickerStub {
  label = input('');
  sex = input('');
  status = input('');
  disabled = input(false);
  chosen = output<Animal>();
}
@Component({ selector: 'app-breeding-batch', template: '' })
class BatchStub {
  embedded = input(false);
  changed = output<void>();
  start() {}
}
HTMLDialogElement.prototype.showModal ??= function () {
  this.open = true;
};
HTMLDialogElement.prototype.close ??= function () {
  this.open = false;
};
const mother: Animal = {
  id: '11111111-1111-4111-8111-111111111111',
  identification: 'Matriz local',
  name: null,
  sex: 'FEMALE',
  birthDate: '2024-01-01',
  status: 'ACTIVE',
  version: 7,
  paddock: null,
};
const pregnancy: Pregnancy = {
  id: '22222222-2222-4222-8222-222222222222',
  motherId: mother.id,
  serviceType: 'INSEMINATION',
  serviceOn: '2025-01-01',
  sireReference: null,
  expectedCalvingOn: '2025-10-11',
  status: 'POSSIBLE',
  confirmedOn: null,
  endedOn: null,
  terminationReason: null,
  calfAnimalId: null,
  version: 9,
};
const report: ReproductionReport = {
  items: [],
  page: 0,
  size: 20,
  totalElements: 0,
  totalPages: 0,
  summary: {
    servicesRecorded: 0,
    pregnanciesConfirmed: 0,
    pregnanciesTerminated: 0,
    calvings: 0,
    calvesBorn: 0,
    openPossiblePregnancies: 0,
    openConfirmedPregnancies: 0,
  },
};
async function setup(role: MembershipRole = 'OWNER', query: Record<string, string> = {}) {
  const context = {
    contextVersion: signal(0),
    transitionPending: signal(false),
    selectedFarm: signal({ farmId: 'farm', farmName: 'Fazenda' }),
    role: signal<MembershipRole | null>(role),
  };
  const api = {
    reproductionReport: vi.fn((_filters: object): Observable<ReproductionReport> => of(report)),
    pendingWork: vi.fn(() => of({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 })),
    planner: vi.fn(() => of({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 })),
    agenda: vi.fn(() => of({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 })),
    allPregnancies: vi.fn((): Observable<FarmPregnancyPage> => of({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 })),
    animal: vi.fn((_id: string): Observable<Animal> => of(mother)),
    pregnancy: vi.fn((_id: string): Observable<Pregnancy> => of(pregnancy)),
    breed: vi.fn((_id: string, _body: object): Observable<unknown> => of(pregnancy)),
    calve: vi.fn((_id: string, _body: object): Observable<unknown> =>
      of({ calfAnimalId: 'calf', resultingMotherVersion: 8, pregnancyId: null }),
    ),
    confirmPregnancy: vi.fn((_id: string, _body: object): Observable<unknown> => of(pregnancy)),
    terminatePregnancy: vi.fn((_id: string, _body: object): Observable<unknown> => of(pregnancy)),
  };
  const toast = { show: vi.fn() };
  await TestBed.configureTestingModule({
    imports: [ReproductionPageComponent],
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { queryParamMap: convertToParamMap(query) }, queryParamMap: of(convertToParamMap(query)) },
      },
      { provide: ContextStore, useValue: context },
      { provide: HerdApi, useValue: api },
      { provide: ToastService, useValue: toast },
    ],
  })
    .overrideComponent(ReproductionPageComponent, {
      remove: { imports: [AnimalPickerComponent, BreedingBatchComponent] },
      add: { imports: [PickerStub, BatchStub] },
    })
    .compileComponents();
  const fixture = TestBed.createComponent(ReproductionPageComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, component: fixture.componentInstance, api, context, toast };
}
describe('Reprodução com revisão e versões atuais', () => {
  it('seleção da mãe no parto preserva a gestação aberta sem nova busca manual', async () => {
    const { component, api } = await setup();
    api.allPregnancies.mockReturnValueOnce(of({ items: [{ ...pregnancy, mother: { id: mother.id, identification: mother.identification, name: null } }], page: 0, size: 20, totalElements: 1, totalPages: 1 }));
    component.openStandaloneCalving();
    component.chooseMother(mother);
    expect(component.pregnancy()?.id).toBe(pregnancy.id);
    expect(api.allPregnancies).toHaveBeenCalledWith({ motherId: mother.id, status: 'POSSIBLE' });
    expect(api.allPregnancies).toHaveBeenCalledWith({ motherId: mother.id, status: 'CONFIRMED' });
  });
  it('deep link abre a gestação exata para confirmar sem executar o comando', async () => {
    const { component, api } = await setup('OWNER', { pregnancyId: pregnancy.id, action: 'confirm' });
    expect(component.flow()).toBe('confirm');
    expect(api.pregnancy).toHaveBeenCalledWith(pregnancy.id);
    expect(api.confirmPregnancy).not.toHaveBeenCalled();
  });
  it('falha ao consultar gestação impede revisar parto com contexto incompleto', async () => {
    const { component, api } = await setup();
    api.allPregnancies.mockReturnValueOnce(throwError(() => new Error('indisponível')));
    component.openStandaloneCalving(); component.chooseMother(mother); component.prepare();
    expect(component.reviewing()).toBe(false);
    expect(api.calve).not.toHaveBeenCalled();
    expect(component.formError()).toContain('Verifique a gestação');
  });
  it('visualizador não abre comando de confirmação recebido por deep link', async () => {
    const { component, api } = await setup('VIEWER', { pregnancyId: pregnancy.id, action: 'confirm' });
    expect(component.flow()).toBeNull();
    expect(api.confirmPregnancy).not.toHaveBeenCalled();
    expect(api.pregnancy).not.toHaveBeenCalled();
  });
  it('abre deep link de gestações com consulta global paginada', async () => {
    const { component, api, fixture } = await setup('OWNER', { tab: 'pregnancies' });
    expect(component.tab()).toBe('pregnancies');
    expect(api.allPregnancies).toHaveBeenCalledWith(expect.objectContaining({ page: 0 }));
    expect(fixture.nativeElement.textContent).toContain('Gestações do rebanho');
  });
  it('oferece busca por matriz no histórico sem pedir UUID', async () => {
    const { component, fixture } = await setup();
    component.selectTab('history');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Buscar matriz');
    expect(fixture.nativeElement.querySelector('input[placeholder*="UUID"]')).toBeNull();
  });
  it('abre a experiência de serviço em lote pelo CTA do cabeçalho', async () => {
    const { component, fixture } = await setup();
    const start = vi.fn();
    component.batch = { start } as unknown as BreedingBatchComponent;
    const button = Array.from(fixture.nativeElement.querySelectorAll('button'))
      .find((element: any) => element.textContent.includes('Serviço em lote')) as HTMLButtonElement;
    button.click();
    expect(start).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.querySelector('app-breeding-batch')).not.toBeNull();
  });
  it.each(['OWNER', 'ADMIN', 'MANAGER', 'OPERATOR'] as MembershipRole[])(
    '%s pode revisar cobertura e confirmação',
    async (role) => {
      const { component, api, fixture } = await setup(role);
      component.openBreeding();
      component.chooseMother({ ...mother, version: 1 });
      component.serviceOn = '2026-01-31';
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-calving-preview')).not.toBeNull();
      component.prepare();
      expect(component.reviewing()).toBe(true);
      expect(api.breed).not.toHaveBeenCalled();
      component.save();
      expect(api.breed).toHaveBeenCalledWith(
        mother.id,
        expect.objectContaining({
          expectedVersion: 7,
          serviceType: 'INSEMINATION',
          operationId: expect.any(String),
        }),
      );
      expect(api.breed.mock.calls[0][1]).not.toHaveProperty('expectedCalvingOn');
      component.openPregnancy(pregnancy.id, 'confirm');
      component.prepare();
      component.save();
      expect(api.confirmPregnancy).toHaveBeenCalledWith(
        pregnancy.id,
        expect.objectContaining({ expectedVersion: 9 }),
      );
    },
  );
  it.each(['OWNER', 'ADMIN', 'MANAGER'] as MembershipRole[])(
    '%s pode encerrar e registrar parto',
    async (role) => {
      const { component, api } = await setup(role);
      component.openPregnancy(pregnancy.id, 'terminate');
      component.prepare();
      component.save();
      expect(api.terminatePregnancy).toHaveBeenCalledWith(
        pregnancy.id,
        expect.objectContaining({ expectedVersion: 9, reason: 'NOT_PREGNANT' }),
      );
      component.openStandaloneCalving();
      component.chooseMother(mother);
      component.calfIdentification = 'Cria de teste';
      component.prepare();
      component.save();
      expect(api.calve).toHaveBeenCalledWith(
        mother.id,
        expect.objectContaining({
          expectedVersion: 7,
          pregnancyId: null,
          calfId: expect.any(String),
        }),
      );
    },
  );
  it('operador não pode encerrar nem registrar parto, incluindo chamadas diretas', async () => {
    const { component, fixture, api } = await setup('OPERATOR');
    component.openStandaloneCalving();
    expect(component.flow()).toBe(null);
    component.openPregnancy(pregnancy.id, 'terminate');
    expect(api.pregnancy).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).not.toContain('Registrar parto sem gestação');
  });
  it('visualizador consulta gestação sem formulários de escrita', async () => {
    const { component, fixture, api } = await setup('VIEWER');
    component.openBreeding();
    expect(component.flow()).toBe(null);
    component.openPregnancy(pregnancy.id, 'view');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Detalhes da gestação');
    component.prepare();
    component.save();
    expect(api.breed).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).not.toContain('Revisar operação');
  });
  it('conserva o UUID da cria e o comando completo na nova tentativa de parto', async () => {
    const { component, api } = await setup();
    component.openStandaloneCalving();
    component.chooseMother(mother);
    component.calfIdentification = 'Cria de teste';
    component.prepare();
    api.calve.mockReturnValueOnce(throwError(() => Error('Falha temporária')));
    component.save();
    expect(component.reviewing()).toBe(true);
    const first = api.calve.mock.calls[0][1];
    component.calfIdentification = 'Outro valor';
    component.save();
    expect(api.calve.mock.calls[1][1]).toBe(first);
    expect(first).toEqual(
      expect.objectContaining({ identification: 'Cria de teste', calfId: expect.any(String) }),
    );
  });
  it('não confirma duas vezes nem fecha durante a escrita', async () => {
    const { component, api } = await setup();
    const pending = new Subject();
    api.breed.mockReturnValue(pending);
    component.openBreeding();
    component.chooseMother(mother);
    component.prepare();
    component.save();
    component.save();
    component.close();
    expect(component.flow()).toBe('breeding');
    expect(api.breed).toHaveBeenCalledTimes(1);
    pending.next(pregnancy);
    expect(component.flow()).toBe(null);
  });
  it('cancela consultas e escrita, apaga rascunhos e ignora respostas na nova fazenda', async () => {
    const { component, api, context, fixture, toast } = await setup();
    const pending = new Subject();
    api.calve.mockReturnValue(pending);
    component.openStandaloneCalving();
    component.chooseMother(mother);
    component.calfIdentification = 'Cria de teste';
    component.prepare();
    component.save();
    expect(pending.observed).toBe(true);
    context.transitionPending.set(true);
    context.contextVersion.update((v) => v + 1);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(pending.observed).toBe(false);
    expect(component.flow()).toBe(null);
    expect(component.calfIdentification).toBe('');
    expect(component.mother()).toBe(null);
    pending.next({});
    expect(toast.show).not.toHaveBeenCalled();
  });
  it('cancela o relatório anterior ao alterar filtros e conserva a paginação real', async () => {
    const { component, api } = await setup();
    const pending = new Subject<ReproductionReport>();
    api.reproductionReport.mockReturnValueOnce(pending);
    component.reload();
    expect(pending.observed).toBe(true);
    component.status = 'CONFIRMED';
    component.serviceFilter = 'NATURAL_SERVICE';
    component.motherFilter = mother.id;
    component.from = '2025-01-01';
    component.to = '2025-12-31';
    component.changePage(2);
    expect(pending.observed).toBe(false);
    expect(api.reproductionReport).toHaveBeenLastCalledWith({
      pregnancyStatus: 'CONFIRMED',
      serviceType: 'NATURAL_SERVICE',
      motherId: mother.id,
      from: '2025-01-01',
      to: '2025-12-31',
      page: 2,
    });
  });
  it('mantém versões indisponíveis e datas inválidas fora da confirmação', async () => {
    const { component, api } = await setup();
    component.openBreeding();
    component.chooseMother(mother);
    component.serviceOn = '2025-02-30';
    component.prepare();
    expect(api.animal).not.toHaveBeenCalled();
    component.serviceOn = component.today;
    api.animal.mockReturnValueOnce(throwError(() => Error('Indisponível')));
    component.prepare();
    expect(component.reviewing()).toBe(false);
    component.save();
    expect(api.breed).not.toHaveBeenCalled();
    component.prepare();
    expect(component.reviewing()).toBe(true);
  });
  it('recusa transição de gestação encerrada após a consulta atual', async () => {
    const { component, api } = await setup();
    api.pregnancy.mockReturnValue(of({ ...pregnancy, status: 'CALVED' }));
    component.openPregnancy(pregnancy.id, 'confirm');
    component.prepare();
    component.save();
    expect(api.confirmPregnancy).not.toHaveBeenCalled();
    expect(component.formError()).toContain('estado atual');
  });
  it('abre o filtro da Home apenas no contexto inicial e não apresenta zeros durante falha', async () => {
    const { component, api, context, fixture } = await setup('OWNER', {
      pregnancyStatus: 'CONFIRMED',
    });
    expect(api.reproductionReport).toHaveBeenCalledWith(
      expect.objectContaining({ pregnancyStatus: 'CONFIRMED' }),
    );
    api.reproductionReport.mockReturnValue(throwError(() => Error('Indisponível')));
    component.reload();
    component.operational.loadOverview();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.journey-card')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Não foi possível carregar');
    context.contextVersion.update((v) => v + 1);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.status).toBe('');
  });
});
