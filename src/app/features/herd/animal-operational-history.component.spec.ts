import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ContextStore } from '../../core/context/context.store';
import { HerdApi } from './herd-api.service';
import { Animal } from './herd.models';
import { HealthTreatment, PregnancyPage, WeightPage } from './herd-operations.models';
import { CountedPage } from './parity.models';
import { AnimalOperationalHistoryComponent } from './animal-operational-history.component';
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
async function setup() {
  const api = {
    weights: vi.fn((_id: string, _page?: number): Observable<WeightPage> =>
      of({
        items: [
          {
            id: 'w',
            operationId: 'op',
            weightKg: '418.750',
            measuredOn: '2026-09-29',
            notes: 'Balança aferida',
            recordedAt: '2026-09-29T13:00:00Z',
          },
        ],
        page: 0,
        size: 20,
        totalElements: 21,
      }),
    ),
    treatments: vi.fn((_id: string, _page?: number): Observable<CountedPage<HealthTreatment>> =>
      of({ items: [], page: 0, size: 20, totalElements: 0 }),
    ),
    pregnancies: vi.fn((_id: string, _page?: number): Observable<PregnancyPage> =>
      of({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }),
    ),
    calves: vi.fn((_id: string, _page?: number, _size?: number): Observable<Animal[]> => of([])),
  };
  const context = {
    contextVersion: signal(0),
    transitionPending: signal(false),
    selectedFarm: signal({ farmId: 's' }),
  };
  await TestBed.configureTestingModule({
    imports: [AnimalOperationalHistoryComponent],
    providers: [
      provideRouter([]),
      { provide: HerdApi, useValue: api },
      { provide: ContextStore, useValue: context },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(AnimalOperationalHistoryComponent);
  fixture.componentRef.setInput('animal', animal);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, component: fixture.componentInstance, api, context };
}
describe('Históricos operacionais do animal', () => {
  it('usa a contagem do backend para navegar além das primeiras vinte pesagens', async () => {
    const { component, api, fixture } = await setup();
    expect(component.totalPages()).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('418,75');
    expect(fixture.nativeElement.textContent).toContain('Balança aferida');
    component.changePage(1);
    expect(api.weights).toHaveBeenLastCalledWith('a', 1);
  });
  it('carrega saúde, gestações e crias com paginação independente e contrato sem total inventado', async () => {
    const { component, api } = await setup();
    component.changePage(1);
    component.selectTab('health');
    expect(api.treatments).toHaveBeenCalledWith('a', 0);
    component.selectTab('pregnancies');
    expect(api.pregnancies).toHaveBeenCalledWith('a', 0);
    component.selectTab('calves');
    expect(api.calves).toHaveBeenCalledWith('a', 0, 20);
    component.changePage(1);
    expect(api.calves).toHaveBeenLastCalledWith('a', 1, 20);
  });
  it('troca de animal ou fazenda cancela leituras antigas e limpa os registros', async () => {
    const { component, api, fixture, context } = await setup();
    const pending = new Subject<WeightPage>();
    api.weights.mockReturnValue(pending);
    component.load();
    context.transitionPending.set(true);
    fixture.detectChanges();
    expect(pending.observed).toBe(false);
    expect(component.weights()).toBeNull();
    expect(component.calves()).toEqual([]);
    expect(component.tab()).toBe('weights');
  });
  it('erro de consulta oferece retry sem apresentar histórico vazio como sucesso', async () => {
    const { component, api } = await setup();
    api.treatments.mockReturnValueOnce(throwError(() => new Error()));
    component.selectTab('health');
    expect(component.error()).toContain('Tente novamente');
    component.load();
    expect(component.error()).toBe('');
    expect(component.health()?.totalElements).toBe(0);
  });
  it('animal macho não abre gestações ou crias pela interface', async () => {
    const { component, fixture, api } = await setup();
    fixture.componentRef.setInput('animal', { ...animal, sex: 'MALE' });
    fixture.detectChanges();
    component.selectTab('pregnancies');
    expect(component.tab()).toBe('weights');
    expect(api.pregnancies).not.toHaveBeenCalled();
  });
});
