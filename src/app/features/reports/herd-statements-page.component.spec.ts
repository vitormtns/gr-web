import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of, Subject, throwError } from 'rxjs';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ContextStore } from '../../core/context/context.store';
import { ParityApi } from '../herd/parity-api.service';
import { HerdStatementsPageComponent } from './herd-statements-page.component';

for (const method of ['showModal', 'close'] as const) {
  if (typeof HTMLDialogElement.prototype[method] !== 'function') {
    HTMLDialogElement.prototype[method] = () => {};
  }
}

const balance = {
  referenceDate: '2025-01-01',
  positionSemantics: 'CURRENT_STATE_AGED_AT_REFERENCE',
  totalActiveAnimals: 2,
  unknownBirthDate: 0,
  cells: [{ ageBand: 'MONTHS_25_36', sex: 'FEMALE', count: 2 }],
};
const totals = {
  openingAnimals: 2,
  registeredAnimals: 0,
  births: 1,
  transfersIn: 1,
  sales: 1,
  deaths: 0,
  transfersOut: 1,
  closingAnimals: 2,
  ageBandChange: 0,
};
afterEach(() => TestBed.resetTestingModule());
async function setup() {
  const context = {
    contextVersion: signal(0),
    selectedFarm: signal({ farmId: 'A', farmName: 'Fazenda A' }),
    transitionPending: signal(false),
  };
  const api = {
    ageSexBalance: vi.fn(() => of(balance)),
    ageSexAnimals: vi.fn(() =>
      of({
        items: [],
        page: 0,
        size: 20,
        totalElements: 0,
        totalPages: 0,
        referenceDate: balance.referenceDate,
      }),
    ),
    ageSexPeriod: vi.fn(() =>
      of({
        from: '2025-01-01',
        to: '2025-12-31',
        totals,
        cells: [{ ageBand: 'MONTHS_25_36', sex: 'FEMALE', ...totals }],
      }),
    ),
  };
  await TestBed.configureTestingModule({
    imports: [HerdStatementsPageComponent],
    providers: [
      provideRouter([]),
      { provide: ContextStore, useValue: context },
      { provide: ParityApi, useValue: api },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(HerdStatementsPageComponent);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, api, context };
}
describe('quadros integrais e composição consultável', () => {
  it('drill-down preserva data, sexo e população atual ou histórica sem trocar silenciosamente a referência', async () => {
    const { fixture, component, api } = await setup();
    component.openAnimals(balance.referenceDate, 'MONTHS_25_36', 'FEMALE');
    fixture.detectChanges();
    expect(api.ageSexAnimals).toHaveBeenLastCalledWith(
      '2025-01-01',
      false,
      'MONTHS_25_36',
      'FEMALE',
      0,
    );
    expect(fixture.nativeElement.textContent).toContain('Nenhum animal nesta faixa e sexo');
    component.switchKind('historical');
    component.openAnimals(balance.referenceDate, 'MONTHS_25_36', 'FEMALE');
    expect(api.ageSexAnimals).toHaveBeenLastCalledWith(
      '2025-01-01',
      true,
      'MONTHS_25_36',
      'FEMALE',
      0,
    );
  });
  it('fluxos exibem sexo/faixa, todos os movimentos, total e envelhecimento explícito', async () => {
    const { fixture, component, api } = await setup();
    component.switchKind('flows');
    fixture.detectChanges();
    expect(api.ageSexPeriod).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.textContent).toContain('25 a 36 meses');
    expect(fixture.nativeElement.textContent).toContain('Entradas por transferência');
    expect(fixture.nativeElement.textContent).toContain('Mudança de faixa');
    expect(fixture.nativeElement.querySelector('tfoot')).not.toBeNull();
  });
  it('loading bloqueia exportação e erro de composição oferece retry sem contaminar o quadro', async () => {
    const { fixture, component, api } = await setup();
    const response = new Subject<any>();
    api.ageSexAnimals.mockReturnValueOnce(response as any);
    component.openAnimals(balance.referenceDate, 'MONTHS_25_36', 'FEMALE');
    fixture.detectChanges();
    expect(component.animalsLoading()).toBe(true);
    response.error(new Error('falha'));
    fixture.detectChanges();
    expect(component.animalsError()).toBe(true);
    component.loadAnimals();
    fixture.detectChanges();
    expect(component.animalsError()).toBe(false);
    api.ageSexBalance.mockReturnValueOnce(throwError(() => new Error('falha')) as any);
    component.load();
    fixture.detectChanges();
    const printButton = [...fixture.nativeElement.querySelectorAll('button')].find((button: any) =>
      button.textContent.includes('Imprimir'),
    ) as HTMLButtonElement;
    expect(printButton.disabled).toBe(true);
  });
  it('troca de contexto limpa o modal e ignora a página de composição anterior', async () => {
    const { fixture, component, api, context } = await setup();
    const response = new Subject<any>();
    api.ageSexAnimals.mockReturnValueOnce(response as any);
    component.openAnimals(balance.referenceDate, 'MONTHS_25_36', 'FEMALE');
    context.transitionPending.set(true);
    context.contextVersion.update((x) => x + 1);
    fixture.detectChanges();
    response.next({
      items: [{ animal: { id: 'private', identification: 'Outro contexto' } }],
      totalElements: 1,
    });
    expect(component.animalQuery()).toBeNull();
    expect(component.animalsResult()).toBeNull();
  });
  it('animal histórico fora da custódia atual não oferece link para perfil inacessível', async () => {
    const { fixture, component, api } = await setup();
    component.switchKind('historical');
    api.ageSexAnimals.mockReturnValueOnce(of({ items: [{ animal: { id: 'private', identification: null, name: null }, sex: 'FEMALE', birthDate: '2023-01-01', availableInCurrentFarm: false }], page: 0, size: 20, totalElements: 1, totalPages: 1, referenceDate: balance.referenceDate }) as any);
    component.openAnimals(balance.referenceDate, 'MONTHS_25_36', 'FEMALE'); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Animal do histórico');
    expect(fixture.nativeElement.textContent).toContain('Perfil fora do escopo atual');
    expect(fixture.nativeElement.querySelector('a[href="/rebanho/animais/private"]')).toBeNull();
  });
});
