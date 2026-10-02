import { describe, expect, it } from 'vitest';
import { pendingNavigation } from './pending-navigation';

describe('Navegação contextual de pendências', () => {
  it('preserva a gestação exata sem executar o parto', () => {
    expect(pendingNavigation('animal', 'CALVING_OVERDUE', 'gestação')).toEqual({
      path: '/rebanho/reproducao', query: { tab: 'pregnancies', pregnancyId: 'gestação', action: 'view' },
    });
  });
  it('preserva tipo sanitário e animal', () => {
    expect(pendingNavigation('animal', 'BRUCELLOSIS_WINDOW_MISSED', null).query)
      .toEqual({ tab: 'pending', pendingType: 'BRUCELLOSIS_WINDOW_MISSED', animalId: 'animal' });
  });
  it('leva à seção de peso e não inventa gestação quando o vínculo não existe', () => {
    expect(pendingNavigation('animal', 'WEIGHING_DUE', null).query.section).toBe('weight');
    expect(pendingNavigation('animal', 'CALVING_OVERDUE', null).path).toBe('/rebanho/animais/animal');
  });
});
