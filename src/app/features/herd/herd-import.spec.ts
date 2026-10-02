import { describe, expect, it } from 'vitest';
import { parseHerdCsv } from './herd-import';

const header = 'identificação;nome;sexo;nascimento;mãe\n';
describe('Importação de rebanho', () => {
  it('valida relações internas independentemente da ordem das linhas', () => {
    const result = parseHerdCsv(header + 'C;;Macho;2026-01-01;M\nM;;Fêmea;2020-01-01;');
    expect(result.errors).toEqual([]);
  });
  it('aponta mãe macho e nascimento posterior à cria antes de enviar', () => {
    const result = parseHerdCsv(header + 'C;;Macho;2020-01-01;M\nM;;Macho;2021-01-01;');
    expect(result.errors.join(' ')).toContain('deve ser fêmea');
    expect(result.errors.join(' ')).toContain('nascido depois');
  });
  it('aponta ciclos, inclusive autorreferência, sem depender da ordem', () => {
    expect(parseHerdCsv(header + 'A;;Fêmea;;B\nB;;Fêmea;;A').errors.join(' ')).toContain('ciclo');
    expect(parseHerdCsv(header + 'A;;Fêmea;;A').errors.join(' ')).toContain('ciclo');
  });
  it('preserva referência externa para validação autoritativa sem inventar inexistência', () => {
    expect(parseHerdCsv(header + 'C;;Macho;;Externa').errors).toEqual([]);
  });
  it('normaliza CSV brasileiro, preserva mãe e gera IDs antecipados', () => {
    const result = parseHerdCsv(
      '\uFEFF' + header + 'A1; Aurora ;Fêmea;2020-01-02;M1\nA2;;Macho;;',
      '2026-09-27',
    );
    expect(result.errors).toEqual([]);
    expect(result.rows[0]).toMatchObject({
      identification: 'A1',
      name: 'Aurora',
      sex: 'FEMALE',
      status: 'ACTIVE',
      birthDate: '2020-01-02',
      motherIdentification: 'M1',
    });
    expect(result.rows[1].name).toBeNull();
    expect(result.rows[0].id).not.toBe(result.rows[1].id);
  });
  it('aceita vírgulas, aspas escapadas e quebra dentro da célula', () => {
    const result = parseHerdCsv(
      'identificação,nome,sexo,nascimento,mãe\nA1,"Lua, ""Clara""\nNova",Fêmea,,',
    );
    expect(result.errors).toEqual([]);
    expect(result.rows[0].name).toBe('Lua, "Clara"\nNova');
  });
  it('rejeita datas inexistentes, futuras, sexo e identificação duplicada', () => {
    const result = parseHerdCsv(
      header + 'A1;;Fêmea;2026-02-30;\na1;;desconhecido;2030-01-01;',
      '2026-09-27',
    );
    expect(result.errors.join(' ')).toContain('nascimento inválido');
    expect(result.errors.join(' ')).toContain('repetida');
    expect(result.errors.join(' ')).toContain('sexo deve');
  });
  it('rejeita lote vazio ou acima de 100 e cabeçalho divergente', () => {
    expect(parseHerdCsv(header).errors).toHaveLength(1);
    expect(
      parseHerdCsv(header + Array.from({ length: 101 }, (_, i) => `A${i};;Macho;;`).join('\n'))
        .errors[0],
    ).toContain('100');
    expect(parseHerdCsv('id;nome\n1;X').errors[0]).toContain('cabeçalho');
  });
  it('não ignora CSV incompleto ou coluna extra', () => {
    expect(parseHerdCsv(header + 'A1;"Lua;Fêmea;;').errors[0]).toContain('aspas');
    expect(parseHerdCsv(header + 'A1;;Fêmea;;;extra').errors[0]).toContain('colunas');
  });
  it('aceita exatamente 100 registros com campos opcionais nulos', () => {
    const result = parseHerdCsv(
      header + Array.from({ length: 100 }, (_, i) => `A${i};;Macho;;`).join('\r\n'),
    );
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(100);
    expect(result.rows[99]).toMatchObject({
      name: null,
      birthDate: null,
      motherIdentification: null,
    });
  });
});
