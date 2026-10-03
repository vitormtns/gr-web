import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject, Observable, Subject, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ContextStore } from '../../core/context/context.store';
import { MembershipRole } from '../../core/api/api.models';
import { ToastService } from '../../design-system/feedback/feedback';
import { HerdApi } from './herd-api.service';
import { Animal, Page } from './herd.models';
import { AnimalListPageComponent } from './animal-list-page.component';
import { DashboardApiClient } from '../home/dashboard-api.service';
const animal: Animal = {
  id: 'a',
  identification: 'BR-01',
  name: null,
  sex: 'FEMALE',
  birthDate: null,
  status: 'ACTIVE',
  version: 2,
  paddock: null,
};
const page: Page<Animal> = { items: [animal], page: 0, size: 20, totalElements: 1, totalPages: 1 };
async function setup(role: MembershipRole = 'OWNER') {
  const api = { animals: vi.fn((_filters: object): Observable<Page<Animal>> => of(page)) };
  const context = {
    contextVersion: signal(0),
    transitionPending: signal(false),
    selectedFarm: signal({ farmId: 's', farmName: 'Origem' }),
    role: signal<MembershipRole | null>(role),
  };
  const route = {
    snapshot: { queryParamMap: convertToParamMap({}) },
    queryParamMap: new BehaviorSubject(convertToParamMap({})),
  };
  await TestBed.configureTestingModule({
    imports: [AnimalListPageComponent],
    providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: route },
      { provide: ContextStore, useValue: context },
      { provide: ToastService, useValue: { show: vi.fn() } },
      {
        provide: DashboardApiClient,
        useValue: {
          overview: () =>
            of({
              herdSnapshot: {
                activeAnimals: 1,
                bySex: { FEMALE: 1, MALE: 0 },
                unlocatedAnimals: 1,
              },
            }),
        },
      },
    ],
  })
    .overrideComponent(AnimalListPageComponent, {
      set: { providers: [{ provide: HerdApi, useValue: api }] },
    })
    .compileComponents();
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(AnimalListPageComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, component: fixture.componentInstance, api, context, navigate };
}
describe('Seleção do rebanho', () => {
  it('seleciona o resultado completo consultado, sem limitar à página visível', async () => {
    const { component, api } = await setup();
    component.page.set({ ...page, totalElements: 2 });
    const second = { ...animal, id: 'b' };
    api.animals.mockReturnValue(
      of({ ...page, items: [animal, second], size: 100, totalElements: 2 }),
    );
    component.selectFiltered();
    expect(api.animals).toHaveBeenLastCalledWith(expect.objectContaining({ page: 0, size: 100 }));
    expect([...component.selected().keys()]).toEqual(['a', 'b']);
  });
  it('bloqueia resultado acima do limite e resposta incompleta sem selecionar primeira página', async () => {
    const { component, api } = await setup();
    api.animals.mockClear();
    component.page.set({ ...page, totalElements: 101 });
    component.selectFiltered();
    expect(api.animals).not.toHaveBeenCalled();
    expect(component.selected().size).toBe(0);
    component.page.set({ ...page, totalElements: 2 });
    api.animals.mockReturnValue(of({ ...page, totalElements: 2 }));
    component.selectFiltered();
    expect(component.selected().size).toBe(0);
  });
  it('cancela seleção filtrada atrasada quando a fazenda muda', async () => {
    const { component, api, fixture, context } = await setup();
    const pending = new Subject<Page<Animal>>();
    api.animals.mockReturnValue(pending);
    component.selectFiltered();
    expect(component.selectingFiltered()).toBe(true);
    context.transitionPending.set(true);
    fixture.detectChanges();
    expect(pending.observed).toBe(false);
    expect(component.selectingFiltered()).toBe(false);
    expect(component.selected().size).toBe(0);
  });
  it('restaura e envia os filtros com e sem piquete, incluindo false', async () => {
    const { component, api, navigate } = await setup();
    const params = TestBed.inject(ActivatedRoute).queryParamMap as BehaviorSubject<
      ReturnType<typeof convertToParamMap>
    >;
    params.next(convertToParamMap({ status: 'ACTIVE', unlocated: 'true' }));
    expect(api.animals).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'ACTIVE', unlocated: true }),
    );
    params.next(convertToParamMap({ unlocated: 'false', page: '2' }));
    expect(api.animals).toHaveBeenLastCalledWith(
      expect.objectContaining({ unlocated: false, page: 2 }),
    );
    expect(component.hasFilters()).toBe(true);
    component.setLocation('UNLOCATED');
    expect(navigate).toHaveBeenLastCalledWith(
      [],
      expect.objectContaining({
        queryParams: expect.objectContaining({ unlocated: 'true', page: null }),
      }),
    );
    component.clearFilters();
    expect(component.filters().unlocated).toBeUndefined();
  });
  it('apaga filtros anteriores e descarta uma busca atrasada na troca de fazenda', async () => {
    const { component, context, fixture, navigate } = await setup();
    const params = TestBed.inject(ActivatedRoute).queryParamMap as BehaviorSubject<
      ReturnType<typeof convertToParamMap>
    >;
    params.next(convertToParamMap({ search: 'Antigo', unlocated: 'true', status: 'ACTIVE' }));
    vi.useFakeTimers();
    try {
      component.searchInput.next('Busca atrasada');
      context.transitionPending.set(true);
      fixture.detectChanges();
      navigate.mockClear();
      vi.advanceTimersByTime(321);
      expect(component.filters()).toEqual({ search: '', sex: '', status: '', page: 0, size: 20 });
      expect(navigate).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
  it('mostra consulta em andamento sem apresentar contagem zero fictícia', async () => {
    const { component, api, fixture } = await setup();
    api.animals.mockReturnValue(new Subject<Page<Animal>>());
    component.load();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#herd-count').textContent).toContain(
      'Consultando animais',
    );
    expect(fixture.nativeElement.querySelector('#herd-count').textContent).not.toContain(
      '0 animais',
    );
  });
  it('restaura filtros do histórico e faz uma única leitura por URL', async () => {
    const { component, api } = await setup();
    const route = TestBed.inject(ActivatedRoute);
    const params = route.queryParamMap as BehaviorSubject<ReturnType<typeof convertToParamMap>>;
    api.animals.mockClear();
    params.next(convertToParamMap({ search: 'Estrela', page: '2' }));
    expect(component.filters()).toMatchObject({ search: 'Estrela', page: 2 });
    expect(api.animals).toHaveBeenCalledOnce();
  });
  it('VIEWER tem o mesmo número de colunas no cabeçalho e nas linhas e não seleciona animais', async () => {
    const { component, fixture } = await setup('VIEWER');
    component.toggle(animal);
    expect(component.selected().size).toBe(0);
    expect(fixture.nativeElement.querySelectorAll('thead th').length).toBe(
      fixture.nativeElement.querySelectorAll('tbody tr:first-child td').length,
    );
    expect(fixture.nativeElement.querySelector('input[type=checkbox]')).toBeNull();
  });
  it('troca de fazenda cancela consultas e apaga a seleção e a página anterior', async () => {
    const { component, api, context, fixture } = await setup();
    component.toggle(animal);
    const pending = new Subject<Page<Animal>>();
    api.animals.mockReturnValue(pending);
    component.load();
    context.transitionPending.set(true);
    fixture.detectChanges();
    expect(pending.observed).toBe(false);
    expect(component.selected().size).toBe(0);
    pending.next(page);
    expect(component.page()).toBeNull();
  });
  it('limita o lote a 100 animais ativos e impede selecionar animais terminais', async () => {
    const { component } = await setup();
    component.toggle({ ...animal, id: 'terminal', status: 'DECEASED' });
    for (let i = 0; i < 101; i++) component.toggle({ ...animal, id: String(i) });
    expect(component.selected().size).toBe(100);
  });
  it('alterna para cards sem repetir a consulta e preserva o contexto na rota do animal', async () => {
    const { component, api, navigate, fixture } = await setup();
    api.animals.mockClear();
    component.setViewMode('cards');
    const params = TestBed.inject(ActivatedRoute).queryParamMap as BehaviorSubject<
      ReturnType<typeof convertToParamMap>
    >;
    params.next(convertToParamMap({ view: 'cards', search: 'BR', page: '2', size: '50' }));
    api.animals.mockClear();
    fixture.detectChanges();
    expect(component.viewMode()).toBe('cards');
    expect(fixture.nativeElement.querySelectorAll('.animal-card').length).toBe(1);
    component.openAnimal(animal, { target: document.createElement('div') } as unknown as Event);
    expect(navigate).toHaveBeenLastCalledWith(
      ['/rebanho/animais', animal.id],
      expect.objectContaining({
        queryParams: expect.objectContaining({ search: 'BR', page: 2, size: 50, view: 'cards' }),
      }),
    );
    expect(api.animals).not.toHaveBeenCalled();
  });
  it('mostra chips individuais com os filtros efetivos da URL', async () => {
    const { component, fixture, navigate } = await setup();
    const params = TestBed.inject(ActivatedRoute).queryParamMap as BehaviorSubject<
      ReturnType<typeof convertToParamMap>
    >;
    params.next(convertToParamMap({ sex: 'FEMALE', status: 'ACTIVE', unlocated: 'false' }));
    fixture.detectChanges();
    expect(component.activeFilters().map((chip) => chip.label)).toEqual([
      'Sexo: Fêmea',
      'Estado: Ativo',
      'Com piquete',
    ]);
    component.removeFilter('location');
    expect(navigate).toHaveBeenLastCalledWith(
      [],
      expect.objectContaining({
        queryParams: expect.objectContaining({ unlocated: null, sex: 'FEMALE' }),
      }),
    );
  });
  it('aplica o estado ativo ao filtrar pelos indicadores do retrato ativo', async () => {
    const { component, navigate } = await setup();
    component.filterActiveSex();
    expect(navigate).toHaveBeenLastCalledWith(
      [],
      expect.objectContaining({
        queryParams: expect.objectContaining({ sex: 'FEMALE', status: 'ACTIVE' }),
      }),
    );
    component.filterActiveUnlocated();
    expect(navigate).toHaveBeenLastCalledWith(
      [],
      expect.objectContaining({
        queryParams: expect.objectContaining({ unlocated: 'true', status: 'ACTIVE' }),
      }),
    );
  });
  it('mantém checkbox separado da navegação por linha e mostra a barra de lote', async () => {
    const { component, fixture, navigate } = await setup();
    const checkbox = fixture.nativeElement.querySelector('tbody input[type="checkbox"]');
    component.openAnimal(animal, { target: checkbox } as unknown as Event);
    expect(navigate).not.toHaveBeenCalledWith(['/rebanho/animais', animal.id], expect.anything());
    checkbox.click();
    fixture.detectChanges();
    expect(component.selected().size).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('animal selecionado');
    component.openAnimal(animal, {
      target: fixture.nativeElement.querySelector('tbody tr'),
    } as unknown as Event);
    expect(navigate).toHaveBeenLastCalledWith(['/rebanho/animais', animal.id], expect.anything());
  });
});
