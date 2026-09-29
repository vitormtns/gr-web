import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ContextStore } from '../../core/context/context.store';
import { HerdApi } from './herd-api.service';
import { MovementPage, PaddockRef } from './herd.models';
import { MovementsPageComponent } from './movements-page.component';
const page: MovementPage = {
  items: [],
  page: 0,
  size: 20,
  totalElements: 0,
  totalPages: 0,
  summary: { movementCount: 0, distinctAnimalsMoved: 0 },
};
async function setup() {
  const api = {
    movements: vi.fn((_page: number, _filters?: object): Observable<MovementPage> => of(page)),
    allPaddocks: vi.fn(
      (_destination?: object, _includeInactive?: boolean): Observable<PaddockRef[]> =>
        of([{ id: 'p', name: 'Reserva', code: null, status: 'INACTIVE', version: 2 }]),
    ),
  };
  const context = {
    contextVersion: signal(0),
    transitionPending: signal(false),
    selectedFarm: signal({ farmId: 's', farmName: 'Origem' }),
  };
  await TestBed.configureTestingModule({
    imports: [MovementsPageComponent],
    providers: [provideRouter([]), { provide: ContextStore, useValue: context }],
  })
    .overrideComponent(MovementsPageComponent, {
      set: { providers: [{ provide: HerdApi, useValue: api }] },
    })
    .compileComponents();
  const fixture = TestBed.createComponent(MovementsPageComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, component: fixture.componentInstance, api, context };
}
describe('Histórico entre piquetes', () => {
  it('inclui piquetes inativos e aplica todos os filtros reais no servidor', async () => {
    const { component, api } = await setup();
    expect(api.allPaddocks).toHaveBeenCalledWith(undefined, true);
    component.from = '2026-09-01';
    component.to = '2026-09-29';
    component.animalId = 'f6d4c17b-4bdf-4e0d-b019-2aa72579f4c1';
    component.sourcePaddockId = 'p';
    component.destinationPaddockId = 'q';
    component.applyFilters();
    component.changePage(2);
    expect(api.movements).toHaveBeenLastCalledWith(2, {
      from: '2026-09-01',
      to: '2026-09-29',
      animalId: component.animalId,
      sourcePaddockId: 'p',
      destinationPaddockId: 'q',
    });
  });
  it('troca de fazenda cancela a consulta, limpa filtros e não mostra totais fictícios', async () => {
    const { component, api, context, fixture } = await setup();
    const pending = new Subject<MovementPage>();
    api.movements.mockReturnValue(pending);
    component.from = '2026-09-01';
    component.load();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.movement-summary')).toBeNull();
    context.transitionPending.set(true);
    fixture.detectChanges();
    expect(pending.observed).toBe(false);
    expect(component.from).toBe('');
    expect(component.data()).toBeNull();
    expect(component.paddocks()).toEqual([]);
  });
  it('falha de referência não produz resultado parcial e oferece retry completo', async () => {
    const { component, api } = await setup();
    api.allPaddocks.mockReturnValueOnce(throwError(() => new Error()));
    component.load();
    expect(component.state()).toBe('error');
    expect(component.data()).toBeNull();
    component.load();
    expect(component.state()).toBe('ready');
  });
});
