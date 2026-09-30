import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ContextStore } from '../../core/context/context.store';
import { DashboardApiClient } from '../home/dashboard-api.service';
import { HerdApi } from './herd-api.service';
import { ParityApi } from './parity-api.service';
import { HealthCommandCenterComponent } from './health-command-center.component';

for (const method of ['showModal', 'close'] as const) {
  const proto = HTMLDialogElement.prototype as unknown as Record<string, unknown>;
  if (typeof proto[method] !== 'function') proto[method] = () => {};
}

describe('HealthCommandCenterComponent', () => {
  const setup = async (
    options: { zeroCoverage?: boolean; agendaItems?: object[]; agendaError?: boolean } = {},
  ) => {
    const today = new Date();
    const day = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const attention = {
      referenceDate: day,
      preview: [],
      summary: {
        vaccinationDue: 2,
        dewormingDue: 3,
        brucellosisDue: 1,
        brucellosisWindowMissed: 1,
        weighingDue: 0,
        calvingUpcoming: 0,
        calvingOverdue: 0,
        plannerOpen: 0,
        plannerOverdue: 0,
      },
    };
    const pendingWork = vi.fn((filters: { type: string; page: number }) =>
      of({
        items:
          filters.type === 'BRUCELLOSIS_WINDOW_MISSED'
            ? [
                {
                  type: filters.type,
                  animalId: 'animal-1',
                  identification: 'A1',
                  name: null,
                  farmId: 'farm-1',
                  dueOn: day,
                  expectedOn: null,
                  daysOverdue: 4,
                  daysUntil: null,
                  pregnancyId: null,
                  treatmentType: 'VACCINATION',
                  lastPerformedOn: null,
                  lastWeightOn: null,
                },
              ]
            : [],
        page: filters.page,
        size: 20,
        totalElements: filters.type === 'BRUCELLOSIS_WINDOW_MISSED' ? 1 : 0,
        totalPages: 1,
      }),
    );
    const agendaPage = vi.fn(() =>
      options.agendaError
        ? throwError(() => Error('Falha'))
        : of({
            items: options.agendaItems || [],
            page: 0,
            size: 100,
            totalElements: options.agendaItems?.length || 0,
            totalPages: 1,
          }),
    );
    const coverage = vi.fn((code: string) =>
      of({
        procedureCode: code,
        referenceDate: day,
        positionSemantics: 'CURRENT_STATE_AGED_AT_REFERENCE_EFFECTIVE_RECORDED_TREATMENTS',
        totalActiveAnimals: 5,
        unknownBirthDate: options.zeroCoverage ? 5 : 0,
        withRecordedTreatment: options.zeroCoverage ? 0 : 3,
        withoutRecordedTreatment: options.zeroCoverage ? 0 : 2,
        cells: [],
      }),
    );
    TestBed.configureTestingModule({
      imports: [HealthCommandCenterComponent],
      providers: [
        provideRouter([]),
        {
          provide: ContextStore,
          useValue: {
            selectedFarm: signal({ farmId: 'farm-1' }),
            transitionPending: signal(false),
            contextVersion: signal(0),
          },
        },
        { provide: HerdApi, useValue: { pendingWork } },
        {
          provide: DashboardApiClient,
          useValue: { attention: vi.fn(() => of(attention)), agendaPage },
        },
        { provide: ParityApi, useValue: { coverage } },
      ],
    });
    const fixture = TestBed.createComponent(HealthCommandCenterComponent);
    fixture.componentRef.setInput('historySummary', {
      treatmentsCount: 5,
      animalsTreated: 4,
      countsByTreatmentType: { VACCINATION: 2, DEWORMING: 3 },
    });
    fixture.detectChanges();
    await fixture.whenStable();
    return {
      fixture,
      component: fixture.componentInstance,
      pendingWork,
      agendaPage,
      coverage,
      day,
    };
  };

  it('separa sete situações atuais de registros realizados e exibe a janela perdida primeiro', async () => {
    const { fixture } = await setup();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.command-summary-card strong')?.textContent?.trim()).toBe('7');
    expect(root.querySelector('.attention-hero strong')?.textContent).toContain(
      'Janela primária de vacinação perdida',
    );
    expect(root.textContent).toContain('Consulte o fluxo aplicável para regularização sanitária.');
    expect(root.textContent).toContain('2 registros na consulta de histórico');
  });

  it('rotula cobertura como registro estruturado e aftosa como informação histórica', async () => {
    const { fixture } = await setup();
    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).toContain('60%');
    expect(text).toContain('animais com registro estruturado');
    expect(text).toContain('Aftosa · histórico');
    expect(text).toContain('Não representa obrigação atual de revacinação.');
    expect(text).not.toContain('em dia');
  });

  it('mostra ausência de base para percentual sem inventar cobertura', async () => {
    const { fixture } = await setup({ zeroCoverage: true });
    const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('.coverage-card');
    expect(cards[0].textContent).toContain('Sem base para percentual');
    expect(cards[1].textContent).toContain('Sem base para percentual');
  });

  it('mostra agenda vazia e isola falha da agenda das pendências', async () => {
    const empty = await setup();
    expect((empty.fixture.nativeElement as HTMLElement).textContent).toContain(
      'Nenhuma ação sanitária programada nos próximos 7 dias.',
    );
    TestBed.resetTestingModule();
    const failed = await setup({ agendaError: true });
    expect((failed.fixture.nativeElement as HTMLElement).textContent).toContain(
      'Não foi possível carregar a agenda sanitária',
    );
    expect((failed.fixture.nativeElement as HTMLElement).textContent).toContain(
      'Janela primária de vacinação perdida',
    );
  });

  it('mostra apenas ações sanitárias reais da janela, sem atribuir horário', async () => {
    const base = {
      source: 'MANUAL',
      operationalDate: '',
      stableId: '',
      animalId: null,
      identification: null,
      name: null,
      plannerItemId: null,
      pendingWorkType: null,
      pregnancyId: null,
      status: 'OPEN',
    };
    const day = new Date();
    const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    const { fixture } = await setup({
      agendaItems: [
        {
          ...base,
          operationalDate: iso,
          stableId: 'v1',
          kind: 'VACCINATION',
          summary: 'Vacinação de A1',
        },
        {
          ...base,
          operationalDate: iso,
          stableId: 'w1',
          kind: 'WEIGHING',
          summary: 'Pesagem de A1',
        },
      ],
    });
    const agenda = (fixture.nativeElement as HTMLElement).querySelector('.command-agenda')!;
    expect(agenda.textContent).toContain('Vacinação de A1');
    expect(agenda.textContent).not.toContain('Pesagem de A1');
    expect(agenda.querySelectorAll('.agenda-day')).toHaveLength(7);
  });
});
