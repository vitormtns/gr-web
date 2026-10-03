import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of, Subject, throwError } from 'rxjs';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ApiClient } from '../../core/api/api-client.service';
import { ContextStore } from '../../core/context/context.store';
import { AgeTransitionsComponent } from './age-transitions.component';
import { AnimalAge, ageLabel } from './age-intelligence.models';
import { ReproductiveIntelligenceComponent } from './reproductive-intelligence.component';
import { AnimalLineageComponent } from './animal-lineage.component';
import { CalvingPreviewComponent } from './calving-preview.component';
import { mergeSummaryDays } from './agenda-daily-summary.component';

const age: AnimalAge = {
  birthDate: '2023-09-14',
  referenceDate: '2026-10-02',
  completedMonths: 36,
  completedDays: 1114,
  currentBand: 'MONTHS_25_36',
  nextBand: 'MONTHS_37_PLUS',
  transitionOn: '2026-10-14',
  daysUntilTransition: 12,
  boundaryMonths: 37,
  policy: 'COMPLETED_CALENDAR_MONTHS_V1',
};
const emptyTransitions = {
  referenceDate: age.referenceDate,
  horizonDays: 15,
  items: [],
  page: 0,
  size: 20,
  totalElements: 0,
  totalPages: 0,
};
function context() {
  return {
    contextVersion: signal(0),
    selectedFarm: signal({ farmId: 'A', farmName: 'Fazenda A' }),
    transitionPending: signal(false),
  };
}
afterEach(() => TestBed.resetTestingModule());
describe('inteligência legada com regra recebida do serviço', () => {
  it('formata meses completos sem recalcular calendário no navegador', () => {
    expect(ageLabel(age)).toBe('3 anos');
    expect(ageLabel({ ...age, completedMonths: 37 })).toBe('3 anos e 1 mês');
    expect(ageLabel({ ...age, completedMonths: 1 })).toBe('1 mês');
    expect(ageLabel({ ...age, completedMonths: 0, completedDays: 0 })).toBe('0 dias');
    expect(ageLabel({ ...age, completedMonths: 0, completedDays: 1 })).toBe('1 dia');
    expect(ageLabel({ ...age, completedMonths: 0, completedDays: 14 })).toBe('14 dias');
    expect(ageLabel(null)).toBe('Idade não informada');
  });
  it('transições têm loading, vazio, erro, retry e contador total independente da página', async () => {
    const response = new Subject<any>();
    const get = vi.fn(() => response);
    TestBed.configureTestingModule({
      imports: [AgeTransitionsComponent],
      providers: [
        provideRouter([]),
        { provide: ApiClient, useValue: { get } },
        { provide: ContextStore, useValue: context() },
      ],
    });
    const fixture = TestBed.createComponent(AgeTransitionsComponent);
    fixture.componentRef.setInput('preview', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(get).toHaveBeenCalledWith(expect.stringContaining('size=3'), true);
    response.next(emptyTransitions);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nenhum animal vai mudar de faixa');
    get.mockReturnValueOnce(throwError(() => new Error('falha')) as any);
    fixture.componentInstance.load();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Não foi possível carregar');
    get.mockReturnValueOnce(
      of({
        ...emptyTransitions,
        totalElements: 205,
        items: [{ animalId: '1', identification: 'M-01', name: null, age }],
      }) as any,
    );
    fixture.componentInstance.load();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('205 animais');
    expect(fixture.nativeElement.textContent).toContain('em 12 dias');
    expect(fixture.nativeElement.querySelector('a[href="/rebanho/animais/1"]')).not.toBeNull();
  });
  it('descarta resposta antiga e apaga informações ao trocar a fazenda', () => {
    const a = new Subject<any>();
    const b = new Subject<any>();
    const ctx = context();
    const get = vi.fn().mockReturnValueOnce(a).mockReturnValueOnce(b);
    TestBed.configureTestingModule({
      imports: [AgeTransitionsComponent],
      providers: [
        provideRouter([]),
        { provide: ApiClient, useValue: { get } },
        { provide: ContextStore, useValue: ctx },
      ],
    });
    const fixture = TestBed.createComponent(AgeTransitionsComponent);
    fixture.detectChanges();
    a.next({ ...emptyTransitions, totalElements: 1 });
    fixture.detectChanges();
    ctx.transitionPending.set(true);
    ctx.contextVersion.update((x) => x + 1);
    fixture.detectChanges();
    expect(fixture.componentInstance.result()).toBeNull();
    ctx.selectedFarm.set({ farmId: 'B', farmName: 'Fazenda B' });
    ctx.transitionPending.set(false);
    fixture.detectChanges();
    a.next({ ...emptyTransitions, totalElements: 999 });
    b.next(emptyTransitions);
    fixture.detectChanges();
    expect(fixture.componentInstance.result()?.totalElements).toBe(0);
  });
  it('pós-parto apresenta fato, referência e orientação sem declarar aptidão', () => {
    const value = {
      referenceDate: '2026-10-02',
      openPregnancyId: null,
      calving: null,
      postpartum: {
        calvedOn: '2026-08-18',
        daysSinceCalving: 45,
        reviewOn: '2026-10-02',
        daysUntilReview: 0,
        reviewDue: true,
        reviewAfterDays: 45,
        guidance: 'Avalie a matriz conforme o manejo da fazenda.',
      },
    };
    TestBed.configureTestingModule({
      imports: [ReproductiveIntelligenceComponent],
      providers: [
        provideRouter([]),
        { provide: ApiClient, useValue: { get: vi.fn(() => of(value)) } },
        { provide: ContextStore, useValue: context() },
      ],
    });
    const fixture = TestBed.createComponent(ReproductiveIntelligenceComponent);
    fixture.componentRef.setInput('animalId', 'mother');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('45 dias desde o parto');
    expect(fixture.nativeElement.textContent).toContain(value.postpartum.guidance);
    expect(fixture.nativeElement.textContent).not.toContain('apta');
    expect(fixture.nativeElement.textContent).toContain('Revisão prevista para hoje');
    fixture.componentInstance.result.set({ ...value, postpartum: { ...value.postpartum, daysUntilReview: 12, reviewDue: false, reviewOn: '2026-10-14' } });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Faltam 12 dias para a revisão');
  });
  it('linhagem carrega por disclosure e permite ampliar somente limites explícitos', () => {
    const get = vi.fn(() =>
      of({ animalId: 'a', depth: 5, limit: 100, truncated: true, items: [] }),
    );
    TestBed.configureTestingModule({
      imports: [AnimalLineageComponent],
      providers: [
        provideRouter([]),
        { provide: ApiClient, useValue: { get } },
        { provide: ContextStore, useValue: context() },
      ],
    });
    const fixture = TestBed.createComponent(AnimalLineageComponent);
    fixture.componentRef.setInput('animalId', 'a');
    fixture.detectChanges();
    expect(get).not.toHaveBeenCalled();
    const details = fixture.nativeElement.querySelector('details');
    details.open = true;
    details.dispatchEvent(new Event('toggle'));
    fixture.detectChanges();
    expect(get).toHaveBeenCalledWith(expect.stringContaining('depth=5&limit=100'), true);
    expect(fixture.nativeElement.textContent).toContain('atingiu o limite');
    fixture.componentInstance.expand();
    fixture.detectChanges();
    expect(get).toHaveBeenLastCalledWith(expect.stringContaining('depth=10&limit=200'), true);
  });
  it('prévia de parto apresenta resposta do serviço e cancela a data anterior', () => {
    const get = vi.fn(() => of({ expectedCalvingOn: '2026-10-25' }));
    TestBed.configureTestingModule({
      imports: [CalvingPreviewComponent],
      providers: [
        { provide: ApiClient, useValue: { get } },
        { provide: ContextStore, useValue: context() },
      ],
    });
    const fixture = TestBed.createComponent(CalvingPreviewComponent);
    fixture.componentRef.setInput('serviceOn', '2026-01-15');
    fixture.detectChanges();
    expect(get).toHaveBeenCalledWith(
      '/api/v1/herd/reproduction/calving-preview?serviceOn=2026-01-15',
      true,
    );
    expect(fixture.nativeElement.textContent).toContain('25/10/2026');
    fixture.componentRef.setInput('serviceOn', '');
    fixture.detectChanges();
    expect(fixture.componentInstance.expectedOn()).toBeNull();
  });
  it('combina contagens completas e maior nível de tipos distintos sem limite de preview', () => {
    const page = {
      referenceDate: '2026-10-02',
      from: '2026-10-02',
      to: '2026-10-08',
      totalElements: 250,
    };
    expect(
      mergeSummaryDays([
        { ...page, days: [{ displayOn: '2026-10-02', count: 150, maxLevel: 'WARNING' }] },
        { ...page, days: [{ displayOn: '2026-10-02', count: 100, maxLevel: 'DANGER' }] },
      ]),
    ).toEqual([{ displayOn: '2026-10-02', count: 250, maxLevel: 'DANGER' }]);
  });
});
