import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { HerdApi } from './herd-api.service';
import { AnimalCreatePageComponent } from './animal-create-page.component';

describe('cadastro de animal', () => {
  it('adiciona outro apenas após sucesso, limpa identidade e gera outra operação', () => {
    const create = vi.fn(() => of({ identification: 'A1', id: 'animal' }));
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: HerdApi, useValue: { create } }] });
    const page = TestBed.runInInjectionContext(() => new AnimalCreatePageComponent());
    page.identification = 'A1'; page.name = 'Nome'; page.sex = 'FEMALE'; page.birthDate = '2020-01-01';
    const firstOperation = page.operationId;
    page.submit(true);
    expect(page.operationId).not.toBe(firstOperation);
    expect([page.identification, page.name, page.sex, page.birthDate]).toEqual(['', '', '', '']);
    expect(page.dirty()).toBe(false);
    expect(page.createdMessage()).toBe('A1');
    page.identification = 'A2'; page.sex = 'MALE'; page.submit(true);
    expect(create.mock.calls).toHaveLength(2);
  });
  it('mantém payload e operação após falha, para uma nova tentativa segura', () => {
    const create = vi.fn(() => throwError(() => new Error('indisponível')));
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: HerdApi, useValue: { create } }] });
    const page = TestBed.runInInjectionContext(() => new AnimalCreatePageComponent());
    page.identification = 'A1'; page.sex = 'FEMALE';
    const operation = page.operationId;
    page.submit(true);
    expect(page.operationId).toBe(operation);
    expect(page.identification).toBe('A1');
    expect(page.sex).toBe('FEMALE');
    expect(page.createdMessage()).toBe('');
    expect(page.dirty()).toBe(true);
  });
  it('impede saída com dados não salvos até uma decisão explícita no diálogo', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: HerdApi, useValue: {} }],
    });
    const page = TestBed.runInInjectionContext(() => new AnimalCreatePageComponent());
    expect(page.canDeactivate()).toBe(true);

    page.identification = 'SMOKE-NAO-SALVO';
    const keep = page.canDeactivate();
    expect(page.discardOpen()).toBe(true);
    expect(page.canDeactivate()).toBe(false);
    page.decideDiscard(false);
    expect(await keep).toBe(false);
    expect(page.discardOpen()).toBe(false);

    const discard = page.canDeactivate();
    page.decideDiscard(true);
    expect(await discard).toBe(true);
    expect(page.discardOpen()).toBe(false);
  });
});
