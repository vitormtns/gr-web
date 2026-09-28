import { localDateOnly } from '../../core/date/date-only';
import { newUuid } from './herd.models';
import { ImportRow } from './parity.models';

export interface ImportPreview {
  rows: ImportRow[];
  errors: string[];
}
// CSV delimitado por vírgula ou ponto e vírgula, com aspas e quebras de linha.
export function parseHerdCsv(source: string, today = localDateOnly()): ImportPreview {
  const rows: ImportRow[] = [],
    errors: string[] = [];
  const text = source.replace(/^\uFEFF/, '');
  const delimiter = text.split(/\r?\n/, 1)[0].includes(';') ? ';' : ',';
  let records: string[][];
  try {
    records = csvRecords(text, delimiter);
  } catch {
    return { rows, errors: ['O CSV contém aspas incompletas ou fora de posição.'] };
  }
  const header = records.shift()?.map((x) => x.trim().toLocaleLowerCase('pt-BR')) ?? [];
  const columns = ['identificação', 'nome', 'sexo', 'nascimento', 'mãe'];
  if (header.length !== columns.length || header.some((x, i) => x !== columns[i]))
    return { rows, errors: ['Use o cabeçalho: identificação;nome;sexo;nascimento;mãe'] };
  if (!records.length || records.length > 100)
    return { rows, errors: ['O lote deve conter entre 1 e 100 animais.'] };
  const identifications = new Set<string>();
  records.forEach((record, index) => {
    const [identification = '', name = '', sexText = '', birthDate = '', mother = ''] = record.map(
      (x) => x.trim(),
    );
    const sex = sexText.toLocaleLowerCase('pt-BR');
    const lineErrors: string[] = [];
    if (record.length !== 5) lineErrors.push('quantidade de colunas inválida');
    if (!identification || [...identification].length > 100)
      lineErrors.push('identificação obrigatória, com até 100 caracteres');
    if (identifications.has(identification.toLocaleLowerCase('pt-BR')))
      lineErrors.push('identificação repetida no lote');
    identifications.add(identification.toLocaleLowerCase('pt-BR'));
    if (!['fêmea', 'macho', 'female', 'male'].includes(sex))
      lineErrors.push('sexo deve ser Fêmea ou Macho');
    if ([...name].length > 255 || [...mother].length > 100 || record.some((x) => x.includes('\0')))
      lineErrors.push('texto inválido ou acima do limite');
    if (birthDate && (!validImportDate(birthDate) || birthDate > today))
      lineErrors.push('nascimento inválido; use AAAA-MM-DD até hoje');
    if (lineErrors.length) errors.push(`Linha ${index + 2}: ${lineErrors.join('; ')}.`);
    rows.push({
      id: newUuid(),
      identification,
      name: name || null,
      sex: sex === 'macho' || sex === 'male' ? 'MALE' : 'FEMALE',
      status: 'ACTIVE',
      birthDate: birthDate || null,
      motherIdentification: mother || null,
    });
  });
  return { rows, errors };
}
export function validImportDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function csvRecords(text: string, delimiter: string): string[][] {
  const records: string[][] = [];
  let row: string[] = [],
    cell = '',
    quoted = false,
    closed = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else cell += c;
      continue;
    }
    if (c === '"') {
      if (cell || closed) throw new Error();
      quoted = true;
    } else if (c === delimiter) {
      row.push(cell);
      cell = '';
      closed = false;
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some((x) => x.trim())) records.push(row);
      row = [];
      cell = '';
      closed = false;
    } else {
      if (closed && c.trim()) throw new Error();
      if (!closed) cell += c;
    }
  }
  if (quoted) throw new Error();
  row.push(cell);
  if (row.some((x) => x.trim())) records.push(row);
  return records;
}
