import { describe, expect, it } from 'vitest';
import { ExactDecimalPipe, parseManagementJson } from './exact-decimal';

describe('Precisão de valores recebidos pela gestão', () => {
  it('preserva dinheiro, saldos e snapshots sem modificar versões ou texto', () => {
    expect(parseManagementJson('{"amount":9007199254740993.12,"version":3,"details":{"quantity":9999999999999.999999},"description":"amount: 1"}'))
      .toEqual({ amount: '9007199254740993.12', version: 3, details: { quantity: '9999999999999.999999' }, description: 'amount: 1' });
  });
  it('exibe agrupamento brasileiro e centavos sem arredondar o decimal original', () => {
    const pipe = new ExactDecimalPipe();
    expect(pipe.transform('9007199254740993.12', 2)).toBe('9.007.199.254.740.993,12');
    expect(pipe.transform('9999999999999.999999')).toBe('9.999.999.999.999,999999');
    expect(pipe.transform('-12.500000', 2)).toBe('-12,50');
    expect(pipe.transform('0.000000')).toBe('0');
    expect(pipe.transform(null)).toBe('—');
  });
});
