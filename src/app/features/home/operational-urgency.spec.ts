import { describe, expect, it } from 'vitest';
import {
  buildOperationalUrgencies,
  classifyUrgency,
  daysBetweenOperationalDates,
  formatUrgencyLabel,
  parseOperationalDay,
  pluralizePt,
  selectUrgencySpotlight,
} from './operational-urgency';
import type { AgendaDto, AttentionDto } from './dashboard.models';

const REF = '2026-09-15';

function attention(partial: Partial<AttentionDto> & { stableId: string }): AttentionDto {
  return {
    source: 'DERIVED',
    kind: 'VACCINATION',
    operationalDate: REF,
    summary: 'Evento',
    animal: null,
    plannerItemId: null,
    pendingWorkType: null,
    pregnancyId: null,
    status: null,
    ...partial,
  };
}

function agenda(partial: Partial<AgendaDto> & { stableId: string }): AgendaDto {
  return {
    source: 'DERIVED',
    kind: 'WEIGHING',
    operationalDate: REF,
    summary: 'Evento',
    animalId: null,
    identification: null,
    name: null,
    plannerItemId: null,
    pendingWorkType: null,
    pregnancyId: null,
    status: null,
    ...partial,
  };
}

describe('operational urgency pura', () => {
  it('classifica os limites de horizonte sem deslocamento UTC', () => {
    expect(daysBetweenOperationalDates('2026-09-15', '2026-09-14')).toBe(-1);
    expect(daysBetweenOperationalDates('2026-09-15', '2026-09-15')).toBe(0);
    expect(daysBetweenOperationalDates('2026-09-15', '2026-09-16')).toBe(1);
    expect(daysBetweenOperationalDates('2026-09-15', '2026-09-18')).toBe(3);
    expect(daysBetweenOperationalDates('2026-09-15', '2026-09-22')).toBe(7);
    expect(daysBetweenOperationalDates('2026-09-15', '2026-09-23')).toBe(8);
    expect(daysBetweenOperationalDates('2026-09-15', '2026-10-15')).toBe(30);
    expect(daysBetweenOperationalDates('2026-09-15', '2026-10-16')).toBe(31);
    expect(classifyUrgency(-1)).toBe('overdue');
    expect(classifyUrgency(0)).toBe('today');
    expect(classifyUrgency(1)).toBe('imminent');
    expect(classifyUrgency(3)).toBe('imminent');
    expect(classifyUrgency(7)).toBe('week');
    expect(classifyUrgency(8)).toBe('month');
    expect(classifyUrgency(30)).toBe('month');
    expect(classifyUrgency(31)).toBe('future');
  });

  it('atravessa virada de mês e de ano por dia de calendário', () => {
    expect(daysBetweenOperationalDates('2026-01-31', '2026-02-01')).toBe(1);
    expect(daysBetweenOperationalDates('2025-12-31', '2026-01-01')).toBe(1);
    expect(daysBetweenOperationalDates('2026-02-28', '2026-03-01')).toBe(1);
    expect(parseOperationalDay('2026-13-01')).toBeNull();
    expect(parseOperationalDay('15/09/2026')).toBeNull();
    expect(daysBetweenOperationalDates('invalida', REF)).toBeNull();
  });

  it('formata rótulos temporais em pt-BR com plural correto', () => {
    expect(formatUrgencyLabel(-2)).toBe('Atraso de 2 dias');
    expect(formatUrgencyLabel(-1)).toBe('Atraso de 1 dia');
    expect(formatUrgencyLabel(0)).toBe('hoje');
    expect(formatUrgencyLabel(1)).toBe('amanhã');
    expect(formatUrgencyLabel(2)).toBe('em 2 dias');
    expect(formatUrgencyLabel(30)).toBe('em 30 dias');
    expect(formatUrgencyLabel(31)).toBeNull();
    expect(pluralizePt(1, 'parto previsto', 'partos previstos')).toBe('parto previsto');
    expect(pluralizePt(2, 'parto previsto', 'partos previstos')).toBe('partos previstos');
    expect(pluralizePt(1, 'animal', 'animais')).toBe('animal');
  });

  it('prioriza status OVERDUE do backend e exclui itens terminais', () => {
    const pool = buildOperationalUrgencies({
      attention: [
        attention({ stableId: 'a', kind: 'VACCINATION', operationalDate: '2026-09-20', status: 'OVERDUE' }),
        attention({ stableId: 'b', kind: 'WEIGHING', operationalDate: '2026-09-10', status: 'COMPLETED' }),
        attention({ stableId: 'c', kind: 'MOVEMENT', operationalDate: '2026-09-10', status: 'CANCELLED' }),
      ],
      agenda: [],
      referenceDate: REF,
    });
    expect(pool.map(item => item.id)).toEqual(['a']);
    expect(pool[0].level).toBe('overdue');
    expect(pool[0].daysUntil).toBeLessThan(0);
  });

  it('ordena por nível, data e id estável entre domínios', () => {
    const pool = buildOperationalUrgencies({
      attention: [
        attention({ stableId: 'm1', kind: 'MOVEMENT', operationalDate: '2026-10-20' }),
        attention({ stableId: 'w1', kind: 'WEIGHING', operationalDate: '2026-09-16' }),
        attention({ stableId: 'v1', kind: 'VACCINATION', operationalDate: '2026-09-13' }),
        attention({ stableId: 'c1', kind: 'CALVING', operationalDate: '2026-09-15' }),
        attention({ stableId: 'c2', kind: 'CALVING', operationalDate: '2026-09-15' }),
      ],
      agenda: [],
      referenceDate: REF,
    });
    expect(pool.map(item => item.id)).toEqual(['v1', 'c1', 'c2', 'w1', 'm1']);
    expect(pool.map(item => item.level)).toEqual(['overdue', 'today', 'today', 'imminent', 'future']);
  });

  it('remove duplicadas por stableId com prioridade da attention', () => {
    const shared = { stableId: 'x', kind: 'WEIGHING', operationalDate: '2026-09-16', summary: 'Pesagem' };
    const pool = buildOperationalUrgencies({
      attention: [attention(shared)],
      agenda: [agenda(shared)],
      referenceDate: REF,
    });
    expect(pool.map(item => item.id)).toEqual(['x']);
  });

  it('preserva partos da semana e do mês como eventos distintos', () => {
    const pool = buildOperationalUrgencies({
      attention: [],
      agenda: [
        agenda({ stableId: 'p1', kind: 'CALVING', operationalDate: '2026-09-15' }),
        agenda({ stableId: 'p2', kind: 'CALVING', operationalDate: '2026-09-17' }),
        agenda({ stableId: 'p3', kind: 'CALVING', operationalDate: '2026-09-25' }),
      ],
      referenceDate: REF,
    });
    expect(pool.map(item => item.id)).toEqual(['p1', 'p2', 'p3']);
    expect(pool.map(item => item.domain)).toEqual(['reproduction', 'reproduction', 'reproduction']);
    expect(pool.map(item => item.level)).toEqual(['today', 'imminent', 'month']);
  });

  it('retorna vazio sem urgências e ignora datas inválidas', () => {
    expect(buildOperationalUrgencies({ attention: [], agenda: [], referenceDate: REF })).toEqual([]);
    const pool = buildOperationalUrgencies({
      attention: [attention({ stableId: 'bad', operationalDate: 'sem-data' })],
      agenda: [],
      referenceDate: REF,
    });
    expect(pool).toEqual([]);
  });

  it('destaca só um evento e preserva animais distintos com o mesmo título', () => {
    const pool = buildOperationalUrgencies({
      attention: [
        attention({ stableId: 'animal-1', kind: 'WEIGHING', summary: 'Pesagem pendente' }),
        attention({ stableId: 'animal-2', kind: 'WEIGHING', summary: 'Pesagem pendente' }),
      ],
      agenda: [],
      referenceDate: REF,
    });
    const spotlight = selectUrgencySpotlight(pool);
    expect(pool.map(item => item.id)).toEqual(['animal-1', 'animal-2']);
    expect(spotlight.featured?.id).toBe('animal-1');
    expect(spotlight.secondary.map(item => item.id)).toEqual(['animal-2']);
  });

  it('rejeita datas impossíveis do calendário e preserva duplicada viva', () => {
    expect(parseOperationalDay('2026-02-31')).toBeNull();
    expect(daysBetweenOperationalDates('2026-02-28', '2026-02-31')).toBeNull();
    const pool = buildOperationalUrgencies({
      attention: [attention({ stableId: 'x', operationalDate: '2026-02-31' })],
      agenda: [agenda({ stableId: 'x', operationalDate: '2026-09-16' })],
      referenceDate: REF,
    });
    expect(pool.map(item => item.id)).toEqual(['x']);
    expect(pool[0].date).toBe('2026-09-16');
    const terminalShadow = buildOperationalUrgencies({
      attention: [attention({ stableId: 'y', operationalDate: '2026-09-16', status: 'CANCELLED' })],
      agenda: [agenda({ stableId: 'y', operationalDate: '2026-09-16' })],
      referenceDate: REF,
    });
    expect(terminalShadow.map(item => item.id)).toEqual(['y']);
  });

  it('usa hoje local quando a referência falta ou é inválida', () => {
    const pool = buildOperationalUrgencies({ attention: [], agenda: [], referenceDate: null });
    expect(pool).toEqual([]);
    const dated = buildOperationalUrgencies({
      attention: [],
      agenda: [agenda({ stableId: 't', operationalDate: '2099-01-01' })],
      referenceDate: 'invalida',
    });
    expect(dated.length).toBe(1);
    expect(dated[0].level).toBe('future');
  });
});
