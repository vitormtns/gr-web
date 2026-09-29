import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError, Observable } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ContextStore } from '../../core/context/context.store';
import { AnimalPickerComponent } from './animal-picker.component';
import { GroupPickerComponent } from './group-picker.component';
import { HerdApi } from './herd-api.service';
import { ParityApi } from './parity-api.service';
import { Animal, Page } from './herd.models';
import { CountedPage, HerdGroup } from './parity.models';

const context = () => ({
  contextVersion: signal(0),
  transitionPending: signal(false),
  selectedFarm: signal({ farmId: 'farm', farmName: 'Fazenda' }),
});
const animals: Page<Animal> = { items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 };
const groups: CountedPage<HerdGroup> = { items: [], page: 0, size: 20, totalElements: 0 };
const groupFixture: HerdGroup = {
  id: 'g1',
  name: 'Matrizes',
  kind: 'MANUAL',
  status: 'ACTIVE',
  version: 0,
  rules: {
    sex: null,
    status: null,
    minAgeMonths: null,
    maxAgeMonths: null,
    onlyReproductionActive: false,
    onlyMissingProfile: false,
  },
};
describe('Seletores paginados e isolamento de contexto', () => {
  it('cancela a busca anterior e a consulta da fazenda antiga, sem aceitar resposta tardia', async () => {
    const c = context();
    const pending = new Subject<Page<Animal>>();
    const api = { animals: vi.fn((_filters: object): Observable<Page<Animal>> => pending) };
    await TestBed.configureTestingModule({
      imports: [AnimalPickerComponent],
      providers: [
        { provide: ContextStore, useValue: c },
        { provide: HerdApi, useValue: api },
      ],
    }).compileComponents();
    const f = TestBed.createComponent(AnimalPickerComponent);
    f.detectChanges();
    await f.whenStable();
    expect(pending.observed).toBe(true);
    api.animals.mockReturnValueOnce(of({ ...animals, page: 2 }));
    f.componentInstance.search = 'Matriz';
    f.componentInstance.load(2);
    expect(pending.observed).toBe(false);
    expect(api.animals).toHaveBeenLastCalledWith({
      search: 'Matriz',
      sex: '',
      status: 'ACTIVE',
      page: 2,
      size: 20,
    });
    api.animals.mockReturnValueOnce(pending);
    f.componentInstance.load(3);
    c.transitionPending.set(true);
    c.contextVersion.update((v) => v + 1);
    f.detectChanges();
    await f.whenStable();
    expect(pending.observed).toBe(false);
    expect(f.componentInstance.page()).toBe(null);
    expect(f.componentInstance.search).toBe('');
    pending.next({ ...animals, page: 9 });
    expect(f.componentInstance.page()).toBe(null);
  });
  it('oferece nova tentativa após falha e cancela a consulta ao destruir o seletor', async () => {
    const c = context();
    const pending = new Subject<Page<Animal>>();
    const api = {
      animals: vi.fn((_filters: object): Observable<Page<Animal>> =>
        throwError(() => Error('Indisponível')),
      ),
    };
    await TestBed.configureTestingModule({
      imports: [AnimalPickerComponent],
      providers: [
        { provide: ContextStore, useValue: c },
        { provide: HerdApi, useValue: api },
      ],
    }).compileComponents();
    const f = TestBed.createComponent(AnimalPickerComponent);
    f.detectChanges();
    await f.whenStable();
    expect(f.componentInstance.error()).toBe(true);
    api.animals.mockReturnValue(pending);
    f.componentInstance.load(0);
    expect(pending.observed).toBe(true);
    f.destroy();
    expect(pending.observed).toBe(false);
  });
  it('mantém a consulta do nome independente da página e cancela ambas na troca de contexto', async () => {
    const c = context();
    const name = new Subject<HerdGroup>(),
      list = new Subject<CountedPage<HerdGroup>>();
    const api = {
      groups: vi.fn((_page: number): Observable<CountedPage<HerdGroup>> => of(groups)),
      group: vi.fn((_id: string): Observable<HerdGroup> => name),
    };
    await TestBed.configureTestingModule({
      imports: [GroupPickerComponent],
      providers: [
        { provide: ContextStore, useValue: c },
        { provide: ParityApi, useValue: api },
      ],
    }).compileComponents();
    const f = TestBed.createComponent(GroupPickerComponent);
    f.componentRef.setInput('selected', 'g1');
    f.detectChanges();
    await f.whenStable();
    expect(name.observed).toBe(true);
    f.componentInstance.load(2);
    expect(name.observed).toBe(true);
    name.next(groupFixture);
    expect(f.componentInstance.selectedName()).toBe('Matrizes');
    api.groups.mockReturnValue(list);
    f.componentInstance.load(3);
    c.transitionPending.set(true);
    c.contextVersion.update((v) => v + 1);
    f.detectChanges();
    await f.whenStable();
    expect(list.observed).toBe(false);
    expect(name.observed).toBe(false);
    expect(f.componentInstance.page()).toBe(null);
    name.next({ ...groupFixture, name: 'Antigo' });
    expect(f.componentInstance.selectedName()).not.toBe('Antigo');
  });
});
