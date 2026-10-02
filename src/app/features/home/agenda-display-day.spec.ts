import { describe, expect, it } from 'vitest';
import { agendaWindowDays } from './home-agenda-section.component';

describe('Dia de exibição autoritativo da agenda', () => {
  it('mostra uma vencida em hoje mantendo sua data original e sem recalcular atraso', () => {
    const item = { operationalDate: '2026-10-01', displayOn: '2026-10-02', summary: 'Conferir lote' };
    const days = agendaWindowDays('2026-10-02', [item]);
    expect(days[0].count).toBe(1);
    expect(days[0].items[0].operationalDate).toBe('2026-10-01');
    expect(days[1].count).toBe(0);
  });
});
