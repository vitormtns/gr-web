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
});
