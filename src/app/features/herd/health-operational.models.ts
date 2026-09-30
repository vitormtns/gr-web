import type { PendingWorkItem, PendingWorkType } from './herd-operations.models';
import type { AgendaDto } from '../home/dashboard.models';

export const HEALTH_PENDING_TYPES = [
  'BRUCELLOSIS_WINDOW_MISSED',
  'VACCINATION_DUE',
  'DEWORMING_DUE',
  'BRUCELLOSIS_DUE',
] as const satisfies readonly PendingWorkType[];
export type HealthPendingType = (typeof HEALTH_PENDING_TYPES)[number];

export const HEALTH_PENDING_LABELS: Record<HealthPendingType, string> = {
  BRUCELLOSIS_WINDOW_MISSED: 'Janela primária de vacinação perdida',
  VACCINATION_DUE: 'Vacinação pendente',
  DEWORMING_DUE: 'Vermifugação pendente',
  BRUCELLOSIS_DUE: 'Brucelose na janela',
};

export function isHealthPendingType(value: string | null): value is HealthPendingType {
  return HEALTH_PENDING_TYPES.some((type) => type === value);
}

export function sanitaryPriority(item: PendingWorkItem): number {
  if (item.type === 'BRUCELLOSIS_WINDOW_MISSED') return 0;
  if (item.type === 'VACCINATION_DUE' && (item.daysOverdue ?? 0) > 0) return 1;
  if (item.type === 'DEWORMING_DUE' && (item.daysOverdue ?? 0) > 0) return 2;
  if (item.type === 'BRUCELLOSIS_DUE') return 3;
  if (item.type === 'VACCINATION_DUE') return 4;
  return 5;
}

export function rankSanitaryItems(items: PendingWorkItem[]): PendingWorkItem[] {
  return [...items].sort(
    (a, b) =>
      sanitaryPriority(a) - sanitaryPriority(b) ||
      (a.dueOn || a.expectedOn || '9999').localeCompare(b.dueOn || b.expectedOn || '9999') ||
      a.identification.localeCompare(b.identification) ||
      a.animalId.localeCompare(b.animalId),
  );
}

export function sanitaryAgenda(items: AgendaDto[]): AgendaDto[] {
  return items.filter(
    (item) =>
      (item.kind === 'VACCINATION' || item.kind === 'DEWORMING') &&
      item.status !== 'COMPLETED' &&
      item.status !== 'CANCELLED',
  );
}

export function datePlusDays(day: string, days: number): string {
  const [year, month, date] = day.split('-').map(Number);
  const result = new Date(year, month - 1, date + days, 12);
  return [
    result.getFullYear(),
    String(result.getMonth() + 1).padStart(2, '0'),
    String(result.getDate()).padStart(2, '0'),
  ].join('-');
}
