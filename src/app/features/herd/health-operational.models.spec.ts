import { describe, expect, it } from 'vitest';
import type { PendingWorkItem } from './herd-operations.models';
import {
  datePlusDays,
  isHealthPendingType,
  rankSanitaryItems,
  sanitaryAgenda,
} from './health-operational.models';

const pending = (
  type: PendingWorkItem['type'],
  daysOverdue: number | null = null,
): PendingWorkItem => ({
  type,
  animalId: type,
  identification: type,
  name: null,
  farmId: 'farm',
  dueOn: '2026-09-30',
  expectedOn: null,
  daysOverdue,
  daysUntil: daysOverdue ? -daysOverdue : 1,
  pregnancyId: null,
  treatmentType: null,
  lastPerformedOn: null,
  lastWeightOn: null,
});

describe('leitura sanitária operacional', () => {
  it('prioriza janela perdida e atraso antes do volume ou das próximas necessidades', () => {
    const items = [
      pending('BRUCELLOSIS_DUE'),
      pending('VACCINATION_DUE'),
      pending('DEWORMING_DUE', 2),
      pending('VACCINATION_DUE', 1),
      pending('BRUCELLOSIS_WINDOW_MISSED'),
    ];
    expect(rankSanitaryItems(items).map((item) => item.type)).toEqual([
      'BRUCELLOSIS_WINDOW_MISSED',
      'VACCINATION_DUE',
      'DEWORMING_DUE',
      'BRUCELLOSIS_DUE',
      'VACCINATION_DUE',
    ]);
  });
  it('filtra apenas ações sanitárias abertas e reconhece deep links válidos', () => {
    const item = (kind: string, status: string | null = null) => ({
      source: 'MANUAL' as const,
      kind,
      status,
      operationalDate: '2026-09-30',
      stableId: kind + status,
      animalId: null,
      summary: kind,
      identification: null,
      name: null,
      plannerItemId: null,
      pendingWorkType: null,
      pregnancyId: null,
    });
    expect(
      sanitaryAgenda([
        item('VACCINATION'),
        item('DEWORMING'),
        item('WEIGHING'),
        item('VACCINATION', 'COMPLETED'),
      ]).map((event) => event.kind),
    ).toEqual(['VACCINATION', 'DEWORMING']);
    expect(isHealthPendingType('BRUCELLOSIS_WINDOW_MISSED')).toBe(true);
    expect(isHealthPendingType('WEIGHING_DUE')).toBe(false);
  });
  it('avança a janela de sete dias como datas locais, inclusive na troca de mês', () => {
    expect(datePlusDays('2026-09-30', 6)).toBe('2026-10-06');
  });
});
