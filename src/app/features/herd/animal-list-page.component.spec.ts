import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ContextStore } from '../../core/context/context.store';
import { PermissionService } from '../../core/permissions/permission.service';
import { AnimalListPageComponent } from './animal-list-page.component';
import { HerdApi } from './herd-api.service';

describe('AnimalListPageComponent', () => {
  it('restaura filtros do histórico e faz uma única leitura por URL', async () => {
    const params = new BehaviorSubject(convertToParamMap({ search: 'Aurora', page: '1' }));
    const api = {
      animals: vi.fn(() => of({ items: [], page: 1, size: 20, totalElements: 0, totalPages: 0 })),
    };
    const context = {
      selectedFarm: signal({ farmId: 'farm-1', farmName: 'Fazenda Norte' }),
      transitionPending: signal(false),
      contextVersion: signal(0),
    };
    await TestBed.configureTestingModule({
      imports: [AnimalListPageComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: params.value }, queryParamMap: params.asObservable() } },
        { provide: Router, useValue: { navigate: vi.fn().mockResolvedValue(true) } },
        { provide: ContextStore, useValue: context },
        { provide: PermissionService, useValue: { canMutateHerd: () => true } },
      ],
    }).overrideComponent(AnimalListPageComponent, { set: { providers: [{ provide: HerdApi, useValue: api }] } }).compileComponents();

    const fixture = TestBed.createComponent(AnimalListPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    api.animals.mockClear();

    params.next(convertToParamMap({ search: 'Estrela', page: '2' }));
    await fixture.whenStable();

    expect(fixture.componentInstance.filters()).toMatchObject({ search: 'Estrela', page: 2 });
    expect(api.animals).toHaveBeenCalledOnce();
  });
});
