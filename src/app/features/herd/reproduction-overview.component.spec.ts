import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { ReproductionOperationalStore } from './reproduction-operational.store';
import { ReproductionOverviewComponent } from './reproduction-overview.component';
import type { ReproductionReport } from './herd-operations.models';

HTMLDialogElement.prototype.showModal ??= function () { this.open = true; };
HTMLDialogElement.prototype.close ??= function () { this.open = false; };
const report: ReproductionReport = {
  items: [], page: 0, size: 20, totalElements: 0, totalPages: 0,
  summary: { servicesRecorded: 8, pregnanciesConfirmed: 4, pregnanciesTerminated: 1,
    calvings: 2, calvesBorn: 2, openPossiblePregnancies: 5, openConfirmedPregnancies: 6 },
};
const emptyPage = { items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 };
async function setup() {
  const store = {
    today: '2026-10-01',
    overview: signal({ status: 'ready', value: report, error: '' }),
    attention: signal<any>({ status: 'ready', value: { overdue: emptyPage, upcoming: emptyPage, plannedChecks: 0 }, error: '' }),
    milestones: signal({ status: 'ready', value: [], error: '' }),
    detail: signal({ status: 'idle', value: null, error: '' }),
    detailType: signal(null), detailPage: signal(0),
    loadOverview: vi.fn(), loadAttention: vi.fn(), loadMilestones: vi.fn(),
    loadDetail: vi.fn(), openDetail: vi.fn(), closeDetail: vi.fn(),
  };
  await TestBed.configureTestingModule({ imports: [ReproductionOverviewComponent],
    providers: [provideRouter([]), { provide: ReproductionOperationalStore, useValue: store }] }).compileComponents();
  const fixture = TestBed.createComponent(ReproductionOverviewComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, store, text: () => fixture.nativeElement.textContent as string };
}

describe('visão geral da reprodução', () => {
  it('mapeia a jornada ao resumo real sem apresentar taxa ou funil', async () => {
    const { fixture, text } = await setup();
    const stages = fixture.nativeElement.querySelectorAll('.journey-card');
    expect(Array.from(stages).map((stage: any) => stage.querySelector('strong').textContent.trim()))
      .toEqual(['8', '5', '6', '2']);
    expect(text()).toContain('em acompanhamento no período');
    expect(text()).toContain('Realizados na consulta');
    expect(text()).not.toMatch(/taxa de prenhez|taxa de conversão|funil de conversão/i);
  });

  it('destaca o parto atrasado e mantém próximos como ação secundária', async () => {
    const { fixture, store, text } = await setup();
    store.attention.set({ status: 'ready', value: {
      overdue: { ...emptyPage, totalElements: 1, items: [{ animalId: 'mother', identification: 'M-01', name: null, expectedOn: '2026-09-29', daysOverdue: 2, pregnancyId: 'pregnancy' }] },
      upcoming: { ...emptyPage, totalElements: 3 }, plannedChecks: 0,
    }, error: '' });
    fixture.detectChanges();
    expect(text()).toContain('URGENTE');
    expect(text()).toContain('Parto após a data esperada');
    expect(text()).toContain('Partos próximos');
    expect(fixture.nativeElement.querySelector('.attention-hero')).not.toBeNull();
  });

  it('não transforma possíveis gestações em diagnósticos pendentes', async () => {
    const { text, store, fixture } = await setup();
    expect(text()).toContain('Possíveis gestações');
    expect(text()).not.toContain('Diagnósticos pendentes');
    store.attention.set({ status: 'ready', value: { overdue: emptyPage, upcoming: emptyPage, plannedChecks: 2 }, error: '' });
    fixture.detectChanges();
    expect(text()).toContain('Diagnósticos planejados');
    expect(text()).toContain('Tarefas em aberto no planejamento');
  });

  it('mostra o vazio dos marcos sem horário inventado', async () => {
    const { text } = await setup();
    expect(text()).toContain('Nenhum marco reprodutivo previsto nos próximos 7 dias.');
    expect(text()).not.toMatch(/\b\d{2}:\d{2}\b/);
  });

  it('abre o histórico completo pelo resumo de eventos', async () => {
    const { fixture } = await setup();
    const spy = vi.fn();
    fixture.componentInstance.openHistory.subscribe(spy);
    const button = Array.from(fixture.nativeElement.querySelectorAll('button'))
      .find((element: any) => element.textContent.includes('Ver histórico completo')) as HTMLButtonElement;
    button.click();
    expect(spy).toHaveBeenCalledOnce();
  });
});
