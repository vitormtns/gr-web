import { describe, expect, it } from 'vitest';
import { decimalCommandJson, managementTimestamp, positiveDecimal, queryString } from './management.shared';

describe('Comandos decimais de gestão', () => {
  it('apresenta instante de auditoria no fuso local, sem cortar a data UTC', () => {
    expect(managementTimestamp('2026-09-29T02:30:00Z', 'America/Sao_Paulo')).toContain('28/09/2026');
    expect(managementTimestamp('2026-09-29T02:30:00Z', 'America/Sao_Paulo')).toContain('23:30');
    expect(managementTimestamp('inválido')).toBe('Não informado');
  });
  it('preserva centavos e precisão acima do inteiro seguro de JavaScript', () => {
    expect(positiveDecimal('9007199254740993,12', 2)).toBe('9007199254740993.12');
    expect(positiveDecimal('00012,500000', 6)).toBe('12.500000');
  });
  it.each(['0', '-1', '1e3', 'NaN', '1.234', '1,2,3', '12345678901234567890'])('rejeita valor monetário inválido %s', value => expect(positiveDecimal(value, 2)).toBeNull());
  it('preserva filtros false e página zero sem enviar identificadores alternativos', () => {
    expect(queryString({ page: 0, onlyPositive: false, search: 'ração & sal', missing: undefined, empty: '' })).toBe('page=0&onlyPositive=false&search=ra%C3%A7%C3%A3o+%26+sal');
  });
  it('serializa decimal numérico exato e escapa o restante do comando', () => {
    const body = { amount: '9007199254740993.12', notes: 'Nome "especial"\nObservação' };
    const json = decimalCommandJson(body, 'amount', 2);
    expect(json).toContain('"amount":9007199254740993.12');
    expect(JSON.parse(json).notes).toBe(body.notes);
    expect(() => decimalCommandJson({ amount: '1,"admin":true' }, 'amount', 2)).toThrow();
  });
  it('respeita a parte inteira reservada pelos tipos NUMERIC do backend', () => {
    expect(positiveDecimal('9999999999999.999999', 6)).toBe('9999999999999.999999');
    expect(positiveDecimal('10000000000000', 6)).toBeNull();
    expect(positiveDecimal('99999999999999999.99', 2)).toBe('99999999999999999.99');
    expect(positiveDecimal('100000000000000000', 2)).toBeNull();
  });
});
