import { describe, expect, it } from 'vitest';
import { mapQueueItem, mapTerritory, periodIsValid } from './dashboard.models';

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
      [{ id: 'a', name: 'Norte', code: null, status: 'ACTIVE', version: 1, occupancy: 2 }, { id: 'b', name: 'Sul', code: null, status: 'ACTIVE', version: 1, occupancy: 0 }]);
    expect(items.map(item => item.animals)).toEqual([2, 0]);
    expect(mapTerritory({ activeAnimals: 0, bySex: {}, byCategory: {}, byPaddock: [], unlocatedAnimals: 0 }, [])).toEqual([]);
  });
  it('preserva MANUAL e DERIVED e a ordem recebida', () => {
    const first = mapQueueItem({ source: 'MANUAL', kind: 'WEIGHING', operationalDate: '2026-09-15', stableId: '1', summary: 'Pesar lote', animal: null, plannerItemId: 'p', pendingWorkType: null, pregnancyId: null, status: 'OPEN' });
    const second = mapQueueItem({ source: 'DERIVED', kind: 'CALVING', operationalDate: '2026-09-16', stableId: '2', summary: 'Parto próximo', animal: null, plannerItemId: null, pendingWorkType: null, pregnancyId: 'g', status: null });
    expect([first, second].map(item => item.source)).toEqual(['MANUAL', 'DERIVED']);
  });
});
