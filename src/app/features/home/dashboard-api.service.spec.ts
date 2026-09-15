import { describe, expect, it } from 'vitest';
import { periodQuery } from './dashboard-api.service';

describe('requisições de período', () => {
  it('envia apenas period para períodos relativos', () => {
    expect(periodQuery({ period: 'TODAY' })).toBe('?period=TODAY');
    expect(periodQuery({ period: 'LAST_7_DAYS' })).toBe('?period=LAST_7_DAYS');
    expect(periodQuery({ period: 'LAST_30_DAYS' })).toBe('?period=LAST_30_DAYS');
  });
  it('envia from/to somente no CUSTOM', () => {
    expect(periodQuery({ period: 'CUSTOM', from: '2026-09-01', to: '2026-09-15' })).toBe('?period=CUSTOM&from=2026-09-01&to=2026-09-15');
  });
});
