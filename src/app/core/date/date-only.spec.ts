import { describe, expect, it } from 'vitest';
import { localDateOnly } from './date-only';

describe('localDateOnly', () => {
  it('usa a data civil local em vez do dia UTC', () => {
    const lateEvening = new Date(2026, 8, 18, 23, 30);
    expect(localDateOnly(lateEvening)).toBe('2026-09-18');
  });

  it('preenche mês e dia com zero', () => {
    expect(localDateOnly(new Date(2026, 0, 5, 12))).toBe('2026-01-05');
  });
});
