import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { HerdApi } from './herd-api.service';
import { AnimalCreatePageComponent } from './animal-create-page.component';

describe('cadastro de animal', () => {
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
