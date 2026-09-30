import { Component, input, output, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, Observable, Subject, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AppError, MembershipRole } from '../../core/api/api.models';
import { ContextStore } from '../../core/context/context.store';
import { ToastService } from '../../design-system/feedback/feedback';
import { AnimalManagementComponent } from './animal-management.component';
import { AnimalOperationalHistoryComponent } from './animal-operational-history.component';
import { AnimalProfilePageComponent } from './animal-profile-page.component';
import { HerdApi } from './herd-api.service';
import { Animal, AnimalEvent, AnimalHistory } from './herd.models';
import { HealthTreatment } from './herd-operations.models';
import { CountedPage } from './parity.models';
@Component({ selector: 'app-animal-management', template: '' })
class ManagementStub {
  animal = input.required<Animal>();
  mother = input<Animal | null>();
  showActions = input(true);
  showProduction = input(true);
  changed = output<void>();
  open = vi.fn();
}
@Component({ selector: 'app-animal-operational-history', template: '' })
class HistoryStub {
  animal = input.required<Animal>();
  activeTab = input<'weights' | 'health' | 'pregnancies' | 'calves' | null>('weights');
  navigationMode = input<'all' | 'reproduction' | 'none'>('all');
}
HTMLDialogElement.prototype.showModal ??= function () {
  this.open = true;
};
HTMLDialogElement.prototype.close ??= function () {
  this.open = false;
};
const animal: Animal = {
  id: 'f6d4c17b-4bdf-4e0d-b019-2aa72579f4c1',
  identification: 'BR-01',
  name: null,
  sex: 'FEMALE',
  birthDate: '2025-01-01',
  status: 'ACTIVE',
  version: 2,
  paddock: null,
};
const history: AnimalHistory = { items: [], page: 0, size: 50, totalElements: 0, totalPages: 0 };
async function setup(role: MembershipRole = 'OWNER', section?: string) {
  const api = {
    animal: vi.fn((_id: string): Observable<Animal> => of(animal)),
    history: vi.fn((_id: string, _page?: number, _type?: string): Observable<AnimalHistory> =>
      of(history),
    ),
    weights: vi.fn(() => of({ items: [], page: 0, size: 20, totalElements: 0 })),
    pendingWork: vi.fn(() => of({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 })),
    treatments: vi.fn((): Observable<CountedPage<HealthTreatment>> =>
      of({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }),
    ),
    pregnancies: vi.fn(() => of({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 })),
    mother: vi.fn(() => throwError(() => new AppError('not-found', '', 404, 'NOT_FOUND'))),
    calves: vi.fn(() => of([])),
    correct: vi.fn((_id: string, _body: object): Observable<Animal> => of(animal)),
    recordWeight: vi.fn((_id: string, _body: object): Observable<unknown> => of({})),
    allPaddocks: vi.fn((_destination?: object) =>
      of([{ id: 'p', name: 'Reserva', status: 'ACTIVE', version: 0, code: null }]),
    ),
  };
  const context = {
    contextVersion: signal(0),
    transitionPending: signal(false),
    selectedFarm: signal({ farmId: 's', farmName: 'Origem' }),
    selectedOrganization: signal({ organizationId: 'o' }),
    farms: signal([
      { farmId: 's', farmName: 'Origem' },
      { farmId: 'd', farmName: 'Destino' },
    ]),
    role: signal<MembershipRole | null>(role),
  };
  const params = new BehaviorSubject(convertToParamMap({ animalId: animal.id }));
  const toast = { show: vi.fn() };
  await TestBed.configureTestingModule({
    imports: [AnimalProfilePageComponent],
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            paramMap: params.value,
            queryParamMap: convertToParamMap({
              search: 'BR',
              page: '2',
              view: 'cards',
              ...(section ? { section } : {}),
            }),
          },
          paramMap: params,
        },
      },
      { provide: ContextStore, useValue: context },
      { provide: ToastService, useValue: toast },
    ],
  })
    .overrideComponent(AnimalProfilePageComponent, {
      remove: {
        imports: [AnimalManagementComponent, AnimalOperationalHistoryComponent],
        providers: [HerdApi],
      },
      add: {
        imports: [ManagementStub, HistoryStub],
        providers: [{ provide: HerdApi, useValue: api }],
      },
    })
    .compileComponents();
  const fixture = TestBed.createComponent(AnimalProfilePageComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, component: fixture.componentInstance, api, context, toast };
}
describe('Perfil operacional do animal', () => {
  it.each(['OWNER', 'ADMIN', 'MANAGER', 'OPERATOR'] as MembershipRole[])(
    '%s revisa a correção antes de enviá-la com a versão consultada',
    async (role) => {
      const { component, api } = await setup(role);
      component.openCorrection(animal);
      component.editIdentification = ' BR-02 ';
      component.saveCorrection();
      expect(api.correct).not.toHaveBeenCalled();
      component.prepareCorrection();
      component.saveCorrection();
      expect(api.correct).toHaveBeenCalledWith(
        animal.id,
        expect.objectContaining({ expectedVersion: 2, identification: 'BR-02' }),
      );
    },
  );
  it('VIEWER não abre nem executa escrita e OPERATOR não transfere', async () => {
    const { component, api, context } = await setup('VIEWER');
    component.openCorrection(animal);
    component.openMovement();
    component.openWeight();
    component.openTransfer();
    component.prepareCorrection();
    component.saveCorrection();
    expect(component.action()).toBeNull();
    expect(api.correct).not.toHaveBeenCalled();
    context.role.set('OPERATOR');
    component.openTransfer();
    expect(component.action()).toBeNull();
  });
  it('troca cancela escrita, limpa o editor e impede feedback de resposta tardia', async () => {
    const { component, api, context, fixture, toast } = await setup();
    const pending = new Subject<unknown>();
    api.recordWeight.mockReturnValue(pending);
    component.openWeight();
    component.weightKg = '100';
    component.recordWeight();
    component.recordWeight();
    expect(api.recordWeight).toHaveBeenCalledTimes(1);
    context.transitionPending.set(true);
    fixture.detectChanges();
    expect(pending.observed).toBe(false);
    expect(component.action()).toBeNull();
    expect(component.weightKg).toBe('');
    expect(component.animal()).toBeNull();
    pending.next({});
    expect(toast.show).not.toHaveBeenCalled();
  });
  it('filtros rápidos cancelam consultas anteriores do histórico', async () => {
    const { component, api } = await setup();
    const pending = new Subject<AnimalHistory>();
    api.history.mockReturnValueOnce(pending);
    component.historyType = 'WEIGHED';
    component.loadHistory(0);
    component.historyType = 'MOVED';
    component.loadHistory(0);
    expect(pending.observed).toBe(false);
    expect(api.history).toHaveBeenLastCalledWith(animal.id, 0, 'MOVED');
  });
  it('consultas do destino preservam a fazenda atual e invalidam catálogos ao fechar', async () => {
    const { component, api, context } = await setup();
    component.openTransfer();
    component.destinationFarm = 'd';
    component.loadDestinationPaddocks();
    expect(api.allPaddocks).toHaveBeenCalledWith({ organizationId: 'o', farmId: 'd' });
    expect(context.selectedFarm().farmId).toBe('s');
    component.closeAction();
    expect(component.transferPaddocks()).toEqual([]);
    expect(component.destinationFarm).toBe('');
  });
  it('recusa datas impossíveis ou anteriores ao nascimento antes da escrita', async () => {
    const { component, api } = await setup();
    component.openWeight();
    component.weightKg = '100';
    component.occurredOn = '2025-02-30';
    component.recordWeight();
    expect(api.recordWeight).not.toHaveBeenCalled();
    component.occurredOn = '2024-12-31';
    component.recordWeight();
    expect(component.actionError()).toContain('nascimento');
  });
  it('preserva busca, página e visualização no retorno à listagem', async () => {
    const { component, fixture } = await setup();
    expect(component.returnQueryParams()).toEqual({ search: 'BR', page: '2', view: 'cards' });
    expect(fixture.nativeElement.querySelector('.back-link').getAttribute('href')).toContain(
      'view=cards',
    );
  });
  it('agrupa eventos reais por mês e mostra detalhe contextual', async () => {
    const { component, api, fixture } = await setup();
    const event: AnimalEvent = {
      id: 'evento-1',
      type: 'WEIGHED',
      occurredOn: '2026-08-14',
      recordedAt: '2026-08-14T13:00:00Z',
      resultingVersion: 3,
      actorUserId: null,
      details: { notes: 'Pesagem no curral' },
    };
    api.history.mockReturnValueOnce(
      of({ items: [event], page: 0, size: 50, totalElements: 1, totalPages: 1 }),
    );
    component.loadHistory(0);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.timeline-period').textContent).toContain('agosto');
    expect(fixture.nativeElement.querySelector('.event').textContent).toContain(
      'Pesagem no curral',
    );
    fixture.nativeElement.querySelector('.event-detail').click();
    fixture.detectChanges();
    expect(component.selectedEvent()).toEqual(event);
    expect(fixture.nativeElement.querySelector('.event-dialog').textContent).toContain(
      'Pesagem no curral',
    );
  });
  it('usa o último tratamento disponível sem prender o restante do perfil à consulta', async () => {
    const { component, api, fixture, context } = await setup();
    api.treatments.mockReturnValueOnce(
      of({
        items: [
          {
            id: 'tratamento-1',
            occurredOn: '2026-08-10',
            recordedAt: '2026-08-10T12:00:00Z',
            type: 'VACCINATION' as const,
            procedureCode: 'BRUCELLOSIS' as const,
            product: null,
            protocol: null,
            nextDueOn: null,
          },
        ],
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
      }),
    );
    component.loadIntelligence();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.side-performance').textContent).toContain(
      'Brucelose',
    );
    context.transitionPending.set(true);
    fixture.detectChanges();
    expect(component.latestTreatment()).toBeNull();
  });
  it('navega entre seções com ARIA e preserva o parâmetro de retorno da lista', async () => {
    const { component, fixture } = await setup();
    const tabs = fixture.nativeElement.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(6);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    component.selectSection('health');
    fixture.detectChanges();
    expect(component.recordTab(animal)).toBe('health');
    expect(fixture.nativeElement.querySelector('[aria-selected="true"]').textContent).toContain(
      'Saúde',
    );
    expect(component.returnQueryParams()).toEqual({ search: 'BR', page: '2', view: 'cards' });
    component.selectSection('history');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.timeline')).not.toBeNull();
  });
  it('representa domínio, período e ordem dos eventos sem fabricar autor', async () => {
    const { component, api, fixture } = await setup();
    const events: AnimalEvent[] = [
      {
        id: 'b',
        type: 'BORN',
        occurredOn: '2026-09-20',
        recordedAt: '2026-09-20T12:00:00Z',
        resultingVersion: 2,
        actorUserId: null,
        details: {},
      },
      {
        id: 'w',
        type: 'WEIGHED',
        occurredOn: '2026-08-10',
        recordedAt: '2026-08-10T12:00:00Z',
        resultingVersion: 1,
        actorUserId: null,
        details: {},
      },
    ];
    api.history.mockReturnValueOnce(
      of({ items: events, page: 0, size: 50, totalElements: 2, totalPages: 1 }),
    );
    component.loadHistory(0);
    fixture.detectChanges();
    expect(
      [...fixture.nativeElement.querySelectorAll('.timeline-period')].map((node: HTMLElement) =>
        node.textContent?.trim(),
      ),
    ).toEqual(['setembro de 2026', 'agosto de 2026']);
    expect(
      [...fixture.nativeElement.querySelectorAll('.timeline li[data-domain]')].map(
        (node: HTMLElement) => node.getAttribute('data-domain'),
      ),
    ).toEqual(['calving', 'weight']);
    expect(fixture.nativeElement.querySelector('.event').textContent).not.toContain(
      'Autor não informado',
    );
  });
  it.each(['OWNER', 'VIEWER'] as MembershipRole[])(
    'limita os menus do hero para %s',
    async (role) => {
      const { fixture } = await setup(role);
      const actions = fixture.nativeElement.querySelector('.profile-actions').textContent;
      if (role === 'VIEWER') {
        expect(actions).not.toContain('Registrar');
        expect(actions).not.toContain('Mais ações');
      } else {
        expect(actions).toContain('Registrar');
        expect(actions).toContain('Corrigir dados');
      }
    },
  );
  it('abre deep link de saúde sem consultar a timeline oculta', async () => {
    const { component, api, fixture } = await setup('OWNER', 'health');
    expect(component.selectedSection()).toBe('health');
    expect(api.history).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.timeline')).toBeNull();
    component.selectSection('overview');
    expect(api.history).toHaveBeenCalledOnce();
  });
});
