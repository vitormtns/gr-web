import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { DashboardStore } from './dashboard.store';
import { OperationalUrgencyBoardComponent } from './operational-urgency-board.component';

function stubStore(attention: unknown, agenda: unknown) {
  return {
    attention: signal(attention),
    agenda: signal(agenda),
    retry: vi.fn(),
  } as unknown as DashboardStore;
}

const ready = <T>(value: T) => ({ status: 'ready' as const, value, error: null });
const failed = { status: 'error' as const, value: null, error: null };
const loading = { status: 'loading' as const, value: null, error: null };

const attentionOk = (preview: unknown[] = [], referenceDate = '2026-09-15', summary = {}): any =>
  ready({ referenceDate, summary, preview });
const agendaOk = (items: unknown[] = []): any => ready({ items, page: 0, size: 5, totalElements: items.length, totalPages: 1 });

const item = (stableId: string, operationalDate: string, status: string | null = null) => ({
  source: 'DERIVED' as const,
  kind: 'WEIGHING',
  operationalDate,
  stableId,
  summary: 'Pesagem pendente',
  animalId: null,
  identification: null,
  name: null,
  plannerItemId: null,
  pendingWorkType: null,
  pregnancyId: null,
  status,
});

function createBoard(attention: unknown, agenda: unknown) {
  const store = stubStore(attention, agenda);
  TestBed.configureTestingModule({
    imports: [OperationalUrgencyBoardComponent],
    providers: [provideRouter([]), { provide: DashboardStore, useValue: store }],
  });
  const fixture = TestBed.createComponent(OperationalUrgencyBoardComponent);
  fixture.detectChanges();
  return { fixture, element: fixture.nativeElement as HTMLElement, store };
}

describe('OperationalUrgencyBoardComponent', () => {
  it('renderiza parcial honesta quando uma fonte falha', () => {
    const { element } = createBoard(failed, agendaOk([item('a', '2026-09-15')]));
    expect(element.querySelector('.urgency-partial-note')).not.toBeNull();
    expect(element.querySelector('.urgency-object--hero')?.textContent).toContain('Pesagem pendente');
    expect(element.querySelector('.urgency-calm')).toBeNull();
  });

  it('mostra indisponível somente quando ambas as fontes falham', () => {
    const { element } = createBoard(failed, failed);
    expect(element.textContent).toContain('Não foi possível carregar as urgências');
    expect(element.querySelector('.urgency-hero')).toBeNull();
  });

  it('mostra calm somente com fontes íntegras e sem urgências', () => {
    const { element } = createBoard(attentionOk(), agendaOk());
    expect(element.querySelector('.urgency-calm')?.textContent).toContain('Operação em dia');
  });

  it('não afirma calmaria quando uma fonte falha mesmo sem urgências', () => {
    const { element } = createBoard(failed, agendaOk());
    expect(element.querySelector('.urgency-calm')).toBeNull();
    expect(element.querySelector('.urgency-partial-note')).not.toBeNull();
  });

  it('exibe skeleton enquanto carrega sem afirmar calmaria', () => {
    const { element } = createBoard(loading, loading);
    expect(element.querySelector('.urgency-skeleton')).not.toBeNull();
    expect(element.querySelector('.urgency-calm')).toBeNull();
  });

  it('começa colapsado e expande sem navegar', () => {
    const { fixture, element } = createBoard(attentionOk([item('a', '2026-09-15')]), agendaOk());
    const button = element.querySelector<HTMLButtonElement>('.urgency-object__summary');
    expect(button?.getAttribute('aria-expanded')).toBe('false');
    expect(element.querySelector('.urgency-object.expanded')).toBeNull();
    expect(element.querySelector('.urgency-object__expansion')?.hasAttribute('inert')).toBe(true);
    button?.click();
    fixture.detectChanges();
    expect(button?.getAttribute('aria-expanded')).toBe('true');
    expect(element.querySelector('.urgency-object.expanded .urgency-object__cta')).not.toBeNull();
    expect(element.querySelector('.urgency-object.expanded .urgency-object__expansion')?.hasAttribute('inert')).toBe(false);
  });

  it('abre um objeto por vez com semântica acessível', () => {
    const { fixture, element } = createBoard(
      attentionOk([
        { ...item('a', '2026-09-15'), kind: 'VACCINATION', summary: 'Vacinação do lote' },
        { ...item('b', '2026-09-16'), kind: 'MOVEMENT', summary: 'Movimentação de lote' },
      ]),
      agendaOk(),
    );
    const buttons = Array.from(element.querySelectorAll<HTMLButtonElement>('.urgency-object__summary'));
    expect(buttons.length).toBe(2);
    buttons[0].click();
    fixture.detectChanges();
    expect(buttons[0].getAttribute('aria-expanded')).toBe('true');
    const panelId = buttons[0].getAttribute('aria-controls');
    const panel = panelId ? element.querySelector(`#${panelId}`) : null;
    expect(panel?.getAttribute('role')).toBe('region');
    buttons[1].click();
    fixture.detectChanges();
    expect(buttons[0].getAttribute('aria-expanded')).toBe('false');
    expect(buttons[1].getAttribute('aria-expanded')).toBe('true');
    expect(element.querySelectorAll('.urgency-object.expanded').length).toBe(1);
  });

  it('expõe CTA de rota real por domínio sem interativo aninhado', () => {
    const { fixture, element } = createBoard(
      attentionOk([
        {
          ...item('c', '2026-09-17'),
          source: 'DERIVED' as const,
          kind: 'CALVING',
          summary: 'Parto previsto',
          animal: { id: 'x', identification: 'BR-0312', name: 'Mimosa' },
          plannerItemId: null,
          pendingWorkType: null,
          pregnancyId: null,
          status: null,
        },
      ]),
      agendaOk(),
    );
    const button = element.querySelector<HTMLButtonElement>('.urgency-object__summary');
    button?.click();
    fixture.detectChanges();
    const cta = element.querySelector('.urgency-object.expanded .urgency-object__cta') as HTMLAnchorElement;
    expect(cta?.getAttribute('href')).toBe('/rebanho/reproducao');
    expect(element.querySelector('.urgency-object.expanded')?.textContent).toContain('BR-0312');
    expect(element.querySelectorAll('.urgency-object button a, .urgency-object a button').length).toBe(0);
  });

  it('expande saúde e movimentação somente com dados reais', () => {
    const { element } = createBoard(
      attentionOk([
        { ...item('h', '2026-09-15'), kind: 'VACCINATION', summary: 'Vacinação do lote' },
        { ...item('m', '2026-09-15'), kind: 'MOVEMENT', summary: 'Movimentação de lote' },
      ]),
      agendaOk(),
    );
    const buttons = Array.from(element.querySelectorAll<HTMLButtonElement>('.urgency-object__summary'));
    buttons[0].click();
    const ctas = Array.from(element.querySelectorAll('.urgency-object__cta')) as HTMLAnchorElement[];
    expect(ctas.map(cta => cta.getAttribute('href'))).toContain('/rebanho/saude');
    expect(element.textContent).toContain('Vacinação do lote');
  });

  it('fecha a expansão quando os dados mudam e o id some', () => {
    const store = stubStore(
      attentionOk([{ ...item('a', '2026-09-15'), kind: 'VACCINATION', summary: 'Vacinação' }]),
      agendaOk(),
    );
    TestBed.configureTestingModule({
      imports: [OperationalUrgencyBoardComponent],
      providers: [provideRouter([]), { provide: DashboardStore, useValue: store }],
    });
    const fixture = TestBed.createComponent(OperationalUrgencyBoardComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('.urgency-object__summary')?.click();
    fixture.detectChanges();
    expect(element.querySelector('.urgency-object.expanded')).not.toBeNull();
    store.attention.set(attentionOk([], '2026-09-15', {}));
    store.agenda.set(agendaOk([]));
    fixture.detectChanges();
    expect(element.querySelector('.urgency-object.expanded')).toBeNull();
  });
});
