import type { DomainIconName } from '../../design-system/primitives/domain-icon';
import { mapQueueItem, type AgendaDto, type AttentionDto, type QueueItem } from './dashboard.models';

export type { DomainIconName };

export type OperationalUrgencyLevel = 'overdue' | 'today' | 'imminent' | 'week' | 'month' | 'future';

export type UrgencyDomain = 'health' | 'weight' | 'reproduction' | 'movement' | 'traceability';

export interface OperationalUrgency extends QueueItem {
  daysUntil: number;
  level: OperationalUrgencyLevel;
  domain: UrgencyDomain;
}

export interface UrgencyDetailFact {
  label: string;
  value: string;
}

const ISO_DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export const URGENCY_LEVEL_RANK: Record<OperationalUrgencyLevel, number> = {
  overdue: 0,
  today: 1,
  imminent: 2,
  week: 3,
  month: 4,
  future: 5,
};

const DOMAIN_TITLES: Record<Exclude<UrgencyDomain, 'traceability'> | 'other', string> = {
  health: 'Saúde',
  weight: 'Pesagem',
  reproduction: 'Reprodução',
  movement: 'Movimentação',
  other: 'Acompanhar',
};

export function parseOperationalDay(value: string): { year: number; month: number; day: number } | null {
  const match = ISO_DAY_PATTERN.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const probe = new Date(year, month - 1, day, 12);
  if (probe.getFullYear() !== year || probe.getMonth() !== month - 1 || probe.getDate() !== day) return null;
  return { year, month, day };
}

function toLocalNoon(parts: { year: number; month: number; day: number }): Date {
  return new Date(parts.year, parts.month - 1, parts.day, 12);
}

/** Local today as ISO day; fallback reference when the store has none. */
export function todayLocalIso(): string {
  const now = new Date();
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Calendar-day difference (target - reference) using local noon; no UTC shift. */
export function daysBetweenOperationalDates(referenceIso: string, targetIso: string): number | null {
  const reference = parseOperationalDay(referenceIso);
  const target = parseOperationalDay(targetIso);
  if (!reference || !target) return null;
  const diffMs = toLocalNoon(target).getTime() - toLocalNoon(reference).getTime();
  return Math.round(diffMs / 86400000);
}

export function classifyUrgency(daysUntil: number): OperationalUrgencyLevel {
  if (daysUntil < 0) return 'overdue';
  if (daysUntil === 0) return 'today';
  if (daysUntil <= 3) return 'imminent';
  if (daysUntil <= 7) return 'week';
  if (daysUntil <= 30) return 'month';
  return 'future';
}

export function pluralizePt(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

/** Semantic countdown copy in pt-BR. Returns null past 30 days (caller shows the date). */
export function formatUrgencyLabel(daysUntil: number): string | null {
  if (daysUntil < 0) {
    const overdue = Math.abs(daysUntil);
    return overdue === 1 ? 'Atraso de 1 dia' : `Atraso de ${overdue} dias`;
  }
  if (daysUntil === 0) return 'hoje';
  if (daysUntil === 1) return 'amanhã';
  if (daysUntil <= 30) return `em ${daysUntil} dias`;
  return null;
}

/**
 * Urgency signal for badges/secondary lines in pt-BR.
 * Neutral wording ("Atraso de N dias") avoids gender agreement hacks;
 * callers uppercase via CSS when a badge treatment is needed.
 */
export function overdueSignalLabel(daysUntil: number): string | null {
  if (daysUntil >= 0) return null;
  const overdue = Math.abs(daysUntil);
  return overdue === 1 ? 'Atraso de 1 dia' : `Atraso de ${overdue} dias`;
}

export function domainOfKind(kind: string): UrgencyDomain {
  switch (kind) {
    case 'VACCINATION':
    case 'DEWORMING':
      return 'health';
    case 'WEIGHING':
      return 'weight';
    case 'CALVING':
    case 'BREEDING':
    case 'PREGNANCY_CHECK':
      return 'reproduction';
    case 'MOVEMENT':
      return 'movement';
    default:
      return 'traceability';
  }
}

export function domainIconOf(domain: UrgencyDomain | 'other'): DomainIconName {
  switch (domain) {
    case 'health':
      return 'health';
    case 'weight':
      return 'weight';
    case 'reproduction':
      return 'reproduction';
    case 'movement':
      return 'movement';
    default:
      return 'traceability';
  }
}

const TERMINAL_STATUSES = new Set(['COMPLETED', 'CANCELLED']);

/** Maximum secondary objects shown beside the featured item on the Home. */
export const URGENCY_SECONDARY_LIMIT = 2;

export interface UrgencySpotlight {
  featured: OperationalUrgency | null;
  secondary: OperationalUrgency[];
}

/**
 * Splits the sorted pool into one featured item plus unique secondary items.
 * The featured item is excluded from the secondary list by stable id, so the
 * same event is never rendered twice in the Foco da operação board.
 */
export function selectUrgencySpotlight(
  sortedPool: OperationalUrgency[],
  maxSecondary: number = URGENCY_SECONDARY_LIMIT,
): UrgencySpotlight {
  const [featured = null] = sortedPool;
  if (!featured) return { featured: null, secondary: [] };
  const secondary = sortedPool.filter(item => item.id !== featured.id).slice(0, Math.max(0, maxSecondary));
  return { featured, secondary };
}

function rankUrgency(item: OperationalUrgency): [number, string, string, string] {
  return [URGENCY_LEVEL_RANK[item.level], item.date, item.domain, item.id];
}

function compareUrgencyRank(left: [number, string, string, string], right: [number, string, string, string]): number {
  if (left[0] !== right[0]) return left[0] - right[0];
  if (left[1] !== right[1]) return left[1] < right[1] ? -1 : 1;
  if (left[2] !== right[2]) return left[2] < right[2] ? -1 : 1;
  if (left[3] !== right[3]) return left[3] < right[3] ? -1 : 1;
  return 0;
}

/**
 * Builds the sorted urgency pool from real dated items.
 * Backend status wins for the LEVEL: explicit OVERDUE forces at least -1,
 * keeping the real past magnitude when the date is also past. Terminal
 * COMPLETED/CANCELLED items never enter the pool and never consume the
 * dedupe slot. Dedupes by stable id (attention first) so the same event
 * never appears twice.
 */
export function buildOperationalUrgencies(input: {
  attention: AttentionDto[];
  agenda: AgendaDto[];
  referenceDate: string | null;
}): OperationalUrgency[] {
  const reference = input.referenceDate && parseOperationalDay(input.referenceDate)
    ? input.referenceDate
    : todayLocalIso();
  const seen = new Set<string>();
  const pool: OperationalUrgency[] = [];
  for (const raw of [...input.attention, ...input.agenda]) {
    if (raw.status && TERMINAL_STATUSES.has(raw.status)) continue;
    if (seen.has(raw.stableId)) continue;
    const entry = mapQueueItem(raw);
    const computed = daysBetweenOperationalDates(reference, entry.date);
    if (computed === null) continue;
    seen.add(raw.stableId);
    const daysUntil = raw.status === 'OVERDUE' ? Math.min(computed, -1) : computed;
    pool.push({ ...entry, daysUntil, level: classifyUrgency(daysUntil), domain: domainOfKind(entry.kind) });
  }
  const sorted = pool
    .map(item => ({ item, rank: rankUrgency(item) }))
    .sort((left, right) => compareUrgencyRank(left.rank, right.rank))
    .map(({ item }) => item);
  return sorted;
}

/** Domain eyebrow for the featured/secondary objects (e.g. "Pesagem"). */
export function urgencyDomainEyebrow(domain: UrgencyDomain | 'other'): string {
  return DOMAIN_TITLES[domain === 'traceability' ? 'other' : domain];
}
