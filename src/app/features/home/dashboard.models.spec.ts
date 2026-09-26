import { describe, expect, it } from 'vitest';
import { mapQueueItem, mapTerritory, periodIsValid } from './dashboard.models';
import type { AttentionSummary } from './dashboard.models';

describe('contratos do dashboard', () => {
  it('valida os quatro períodos e o limite inclusivo do backend', () => {
    for (const period of ['TODAY', 'LAST_7_DAYS', 'LAST_30_DAYS'] as const) expect(periodIsValid({ period })).toBe(true);
    expect(periodIsValid({ period: 'CUSTOM', from: '2025-01-01', to: '2026-01-01' })).toBe(true);
    expect(periodIsValid({ period: 'CUSTOM', from: '2025-01-01', to: '2026-01-02' })).toBe(false);
    expect(periodIsValid({ period: 'CUSTOM', from: '2026-09-10', to: '2026-09-09' })).toBe(false);
    expect(periodIsValid({ period: 'CUSTOM', from: '2026-02-30', to: '2026-03-01' })).toBe(false);
    expect(periodIsValid({ period: 'TODAY', from: '2026-09-15' })).toBe(false);
  });
  it('preserva ocupação e piquetes vazios sem inventar geometria', () => {
    const items = mapTerritory({ activeAnimals: 2, bySex: {}, byCategory: {}, byPaddock: [{ id: 'a', name: 'Norte', total: 2 }], unlocatedAnimals: 0 },
      [{ id: 'a', name: 'Norte', code: null, status: 'ACTIVE', version: 1, occupancy: 2 }, { id: 'b', name: 'Sul', code: null, status: 'INACTIVE', version: 1, occupancy: 4 }]);
    expect(items.map(item => item.animals)).toEqual([2, 0]);
    expect(items[1].status).toBe('INACTIVE');
    expect(mapTerritory({ activeAnimals: 0, bySex: {}, byCategory: {}, byPaddock: [], unlocatedAnimals: 0 }, [])).toEqual([]);
  });
  it('preserva MANUAL e DERIVED e a ordem recebida', () => {
    const first = mapQueueItem({ source: 'MANUAL', kind: 'WEIGHING', operationalDate: '2026-09-15', stableId: '1', summary: 'Pesar lote', animal: null, plannerItemId: 'p', pendingWorkType: null, pregnancyId: null, status: 'OPEN' });
    const second = mapQueueItem({ source: 'DERIVED', kind: 'CALVING', operationalDate: '2026-09-16', stableId: '2', summary: 'Parto próximo', animal: null, plannerItemId: null, pendingWorkType: null, pregnancyId: 'g', status: null });
    expect([first, second].map(item => item.source)).toEqual(['MANUAL', 'DERIVED']);
  });
  it('aceita contagens de brucelose no resumo de atenção sem opcionais', () => {
    const summary: AttentionSummary = { vaccinationDue: 24, dewormingDue: 4, weighingDue: 18, calvingUpcoming: 3, calvingOverdue: 1, plannerOpen: 7, plannerOverdue: 2, brucellosisDue: 3, brucellosisWindowMissed: 2 };
    expect(summary.brucellosisDue).toBe(3);
    expect(summary.brucellosisWindowMissed).toBe(2);
    expect(summary.vaccinationDue).toBe(24);
    const zeroed: AttentionSummary = { vaccinationDue: 0, dewormingDue: 0, weighingDue: 0, calvingUpcoming: 0, calvingOverdue: 0, plannerOpen: 0, plannerOverdue: 0, brucellosisDue: 0, brucellosisWindowMissed: 0 };
    expect(zeroed.brucellosisDue).toBe(0);
    expect(zeroed.brucellosisWindowMissed).toBe(0);
  });
});
