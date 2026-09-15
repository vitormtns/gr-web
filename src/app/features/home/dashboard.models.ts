import { AppError } from '../../core/api/api.models';

export type DashboardPeriod = 'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'CUSTOM';
export interface PeriodSelection { period: DashboardPeriod; from?: string; to?: string }
export interface ResolvedPeriod { period: DashboardPeriod; from: string; to: string; referenceDate: string }
export interface PaddockTotal { id: string; name: string; total: number }
export interface HerdSnapshot { activeAnimals: number; bySex: Record<string, number>; byCategory: Record<string, number>; byPaddock: PaddockTotal[]; unlocatedAnimals: number }
export interface ActivityTotals {
  births: number; deaths: number; sales: number; movements: number; transfersIn: number; transfersOut: number;
  weightMeasurements: number; vaccinations: number; dewormings: number; breedings: number;
  pregnanciesConfirmed: number; pregnanciesTerminated: number; calvings: number; calvesBorn: number;
  plannerCompleted: number; plannerCancelled: number;
}
export interface ActivityBucket { date: string; births: number; deaths: number; sales: number; movements: number; weights: number; healthTreatments: number; breedings: number; calvings: number }
export type InsightKind = 'WEIGHING_COVERAGE' | 'HEALTH_DUE' | 'REPRODUCTION_PIPELINE' | 'CALVING_ATTENTION' | 'PLANNER_EXECUTION' | 'HERD_ACTIVITY';
export interface DashboardInsights {
  weighingCoverage: { type: 'WEIGHING_COVERAGE'; coveredAnimals: number; totalEligibleAnimals: number; coveragePercentage: number };
  healthDue: { type: 'HEALTH_DUE'; vaccinationDue: number; dewormingDue: number };
  reproductionPipeline: { type: 'REPRODUCTION_PIPELINE'; openPossiblePregnancies: number; openConfirmedPregnancies: number; upcomingCalvings: number; overdueCalvings: number; calvingsInPeriod: number; calvesBornInPeriod: number };
  calvingAttention: { type: 'CALVING_ATTENTION'; upcomingCalvings: number; overdueCalvings: number };
  plannerExecution: { type: 'PLANNER_EXECUTION'; completed: number; cancelled: number; currentlyOpen: number; overdueOpen: number };
  herdActivity: { type: 'HERD_ACTIVITY'; births: number; deaths: number; sales: number; movements: number; transfersIn: number; transfersOut: number; from: string; to: string };
}
export interface DashboardOverview { period: ResolvedPeriod; herdSnapshot: HerdSnapshot; periodActivity: ActivityTotals; attention: { vaccinationDue: number; dewormingDue: number; weighingDue: number; calvingUpcoming: number; calvingOverdue: number; openPlannerItems: number; overduePlannerItems: number }; insights: DashboardInsights }
export interface DashboardActivity { period: ResolvedPeriod; totals: ActivityTotals; series: ActivityBucket[] }
export interface AttentionSummary { vaccinationDue: number; dewormingDue: number; weighingDue: number; calvingUpcoming: number; calvingOverdue: number; plannerOpen: number; plannerOverdue: number }
export interface AnimalReference { id: string; identification: string; name: string | null }
export type AgendaSource = 'MANUAL' | 'DERIVED';
export interface AttentionDto { source: AgendaSource; kind: string; operationalDate: string; stableId: string; summary: string; animal: AnimalReference | null; plannerItemId: string | null; pendingWorkType: string | null; pregnancyId: string | null; status: string | null }
export interface DashboardAttention { referenceDate: string; summary: AttentionSummary; preview: AttentionDto[] }
export interface AgendaDto { source: AgendaSource; kind: string; operationalDate: string; stableId: string; animalId: string | null; summary: string; identification: string | null; name: string | null; plannerItemId: string | null; pendingWorkType: string | null; pregnancyId: string | null; status: string | null }
export interface AgendaPage { items: AgendaDto[]; page: number; size: number; totalElements: number; totalPages: number }
export interface PaddockDto { id: string; name: string; code: string | null; status: 'ACTIVE' | 'INACTIVE'; version: number; occupancy: number }
export interface PaddockPage { items: PaddockDto[]; page: number; size: number; totalElements: number; totalPages: number }
export interface TerritoryItem { id: string; name: string; code: string | null; status: string; animals: number }
export interface QueueItem { id: string; source: AgendaSource; kind: string; title: string; date: string; context: string; status: string | null }
export interface SectionState<T> { status: 'idle' | 'loading' | 'ready' | 'error'; value: T | null; error: AppError | null }
export const idleSection = <T>(): SectionState<T> => ({ status: 'idle', value: null, error: null });

export function periodIsValid(selection: PeriodSelection): boolean {
  if (selection.period !== 'CUSTOM') return !selection.from && !selection.to;
  if (!selection.from || !selection.to || !/^\d{4}-\d{2}-\d{2}$/.test(selection.from) || !/^\d{4}-\d{2}-\d{2}$/.test(selection.to)) return false;
  const from = Date.parse(`${selection.from}T00:00:00Z`);
  const to = Date.parse(`${selection.to}T00:00:00Z`);
  return Number.isFinite(from) && Number.isFinite(to) && new Date(from).toISOString().slice(0, 10) === selection.from
    && new Date(to).toISOString().slice(0, 10) === selection.to && to >= from && (to - from) / 86400000 < 366;
}

export function mapTerritory(snapshot: HerdSnapshot, paddocks: PaddockDto[]): TerritoryItem[] {
  const totals = new Map(snapshot.byPaddock.map(item => [item.id, item.total]));
  return paddocks.map(item => ({ id: item.id, name: item.name, code: item.code, status: item.status, animals: totals.get(item.id) ?? 0 }));
}

export function mapQueueItem(item: AttentionDto | AgendaDto): QueueItem {
  const animal = 'animal' in item ? item.animal : item.identification ? { identification: item.identification, name: item.name } : null;
  return { id: item.stableId, source: item.source, kind: item.kind, title: item.summary,
    date: item.operationalDate, context: animal ? [animal.identification, animal.name].filter(Boolean).join(' · ') : '', status: item.status };
}
