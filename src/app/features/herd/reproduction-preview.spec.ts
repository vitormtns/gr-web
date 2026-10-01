import { describe, expect, it } from 'vitest';
import { expectedCalvingPreview } from './reproduction-preview';

describe('prévia de parto', () => {
  it('soma 283 dias de calendário, incluindo viradas de mês, ano e ano bissexto', () => {
    expect(expectedCalvingPreview('2026-01-15')).toBe('2026-10-25');
    expect(expectedCalvingPreview('2026-01-31')).toBe('2026-11-10');
    expect(expectedCalvingPreview('2025-12-31')).toBe('2026-10-10');
    expect(expectedCalvingPreview('2024-02-29')).toBe('2024-12-08');
    expect(expectedCalvingPreview('')).toBeNull();
  });
});
