import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { AppError } from '../../core/api/api.models';
import { ContextStore } from '../../core/context/context.store';
import { DashboardApiClient } from './dashboard-api.service';
import { ActivityBucket, ActivityTotals, DashboardOverview, HerdSnapshot, PeriodSelection, ResolvedPeriod } from './dashboard.models';

// Apenas para revisão visual em desenvolvimento; a Home de produção usa exclusivamente o gr-service.
const empty = typeof location !== 'undefined' && new URLSearchParams(location.search).get('estado') === 'vazio';
const sparse = typeof location !== 'undefined' && new URLSearchParams(location.search).get('estado') === 'esparso';
const partial = typeof location !== 'undefined' && new URLSearchParams(location.search).get('estado') === 'falha';
const now = new Date('2026-09-15T12:00:00Z');
const date = (offset: number) => new Date(now.getTime() + offset * 86400000).toISOString().slice(0, 10);
const snapshot: HerdSnapshot = sparse
  ? { activeAnimals: 1, bySex: {}, byCategory: {}, byPaddock: [{ id: 'n', name: 'Piquete Norte', total: 0 }, { id: 's', name: 'Piquete Sul', total: 0 }], unlocatedAnimals: 1 }
  : { activeAnimals: empty ? 0 : 428, bySex: {}, byCategory: {}, byPaddock: empty ? [] : [{ id: 'n', name: 'Piquete Norte', total: 126 }, { id: 's', name: 'Piquete Sul', total: 84 }, { id: 'c', name: 'Piquete Central', total: 118 }, { id: 'l', name: 'Lote 04', total: 97 }], unlocatedAnimals: empty ? 0 : 3 };
const totals: ActivityTotals = { births: empty || sparse ? 0 : 12, deaths: empty || sparse ? 0 : 1, sales: empty || sparse ? 0 : 6, movements: sparse ? 1 : empty ? 0 : 28, transfersIn: 0, transfersOut: 0, weightMeasurements: empty || sparse ? 0 : 62, vaccinations: empty || sparse ? 0 : 17, dewormings: 0, breedings: 0, pregnanciesConfirmed: 0, pregnanciesTerminated: 0, calvings: empty || sparse ? 0 : 8, calvesBorn: empty || sparse ? 0 : 12, plannerCompleted: empty || sparse ? 0 : 9, plannerCancelled: 0 };
const paddockNames = [['n', 'Piquete Norte', 126], ['s', 'Piquete Sul', 84], ['c', 'Piquete Central', 118], ['l', 'Lote 04', 97], ['r', 'Reserva', 0], ['m', 'Maternidade', 0]] as const;
const overview: DashboardOverview = { period: { period: 'LAST_30_DAYS', from: date(-29), to: date(0), referenceDate: date(0) }, herdSnapshot: snapshot, periodActivity: totals, attention: { vaccinationDue: sparse ? 1 : empty ? 0 : 24, dewormingDue: empty || sparse ? 0 : 4, weighingDue: empty || sparse ? 0 : 18, calvingUpcoming: empty || sparse ? 0 : 3, calvingOverdue: empty || sparse ? 0 : 1, openPlannerItems: empty || sparse ? 0 : 7, overduePlannerItems: empty || sparse ? 0 : 2 },
  insights: { weighingCoverage: { type: 'WEIGHING_COVERAGE', coveredAnimals: empty ? 0 : 410, totalEligibleAnimals: snapshot.activeAnimals, coveragePercentage: empty ? 0 : 95.79 }, healthDue: { type: 'HEALTH_DUE', vaccinationDue: empty ? 0 : 24, dewormingDue: empty ? 0 : 4 }, reproductionPipeline: { type: 'REPRODUCTION_PIPELINE', openPossiblePregnancies: 0, openConfirmedPregnancies: empty ? 0 : 36, upcomingCalvings: empty ? 0 : 3, overdueCalvings: 0, calvingsInPeriod: 8, calvesBornInPeriod: 12 }, calvingAttention: { type: 'CALVING_ATTENTION', upcomingCalvings: empty ? 0 : 3, overdueCalvings: 0 }, plannerExecution: { type: 'PLANNER_EXECUTION', completed: totals.plannerCompleted, cancelled: 0, currentlyOpen: empty ? 0 : 7, overdueOpen: 2 }, herdActivity: { type: 'HERD_ACTIVITY', births: totals.births, deaths: totals.deaths, sales: totals.sales, movements: totals.movements, transfersIn: 0, transfersOut: 0, from: date(-29), to: date(0) } } };
const series: ActivityBucket[] = Array.from({ length: 30 }, (_, index) => ({ date: date(index - 29), births: empty || sparse ? 0 : index % 5 === 0 ? 2 : 0, deaths: 0, sales: 0, movements: sparse ? index === 29 ? 1 : 0 : empty ? 0 : index % 5 === 0 ? 4 : index % 7 === 0 ? 1 : 0, weights: empty || sparse ? 0 : index === 0 ? 14 : index % 8 === 0 ? 16 : 0, healthTreatments: empty || sparse ? 0 : index % 6 === 0 ? 3 : 0, breedings: 0, calvings: 0 }));
const planned = (id: string, title: string, offset: number) => ({ source: 'MANUAL' as const, kind: 'VACCINATION', operationalDate: date(offset), stableId: id, summary: title, animal: null, plannerItemId: id, pendingWorkType: null, pregnancyId: null, status: 'OPEN' });
const derived = (id: string, title: string, offset: number) => ({ source: 'DERIVED' as const, kind: 'WEIGHING', operationalDate: date(offset), stableId: id, summary: title, animal: { id, identification: 'BR-204', name: 'Lote Norte' }, plannerItemId: null, pendingWorkType: 'WEIGHING_DUE', pregnancyId: null, status: null });
const preview = empty ? [] : sparse ? [planned('1', 'Vacinação programada', 0)] : [planned('1', 'Vacinação do lote Norte', 0), derived('2', 'Pesagem pendente', 1), planned('3', 'Revisar manejo da maternidade', 2), derived('4', 'Animal sem pesagem recente', 4)];
const unavailable = () => throwError(() => new AppError('unavailable', 'O serviço está temporariamente indisponível.', 503, 'UNAVAILABLE', 'demo-503'));
function resolved(selection: PeriodSelection): ResolvedPeriod {
  const from = selection.period === 'CUSTOM' ? selection.from! : selection.period === 'TODAY' ? date(0) : selection.period === 'LAST_7_DAYS' ? date(-6) : date(-29);
  return { period: selection.period, from, to: selection.period === 'CUSTOM' ? selection.to! : date(0), referenceDate: date(0) };
}
function demoActivity(selection: PeriodSelection) {
  const period = resolved(selection);
  const buckets = series.filter(bucket => bucket.date >= period.from && bucket.date <= period.to);
  return { period, totals: { ...totals, births: buckets.reduce((sum, bucket) => sum + bucket.births, 0), movements: buckets.reduce((sum, bucket) => sum + bucket.movements, 0), weightMeasurements: buckets.reduce((sum, bucket) => sum + bucket.weights, 0) }, series: buckets };
}

export const dashboardShowcaseProviders = [
  { provide: ContextStore, useFactory: () => ({ status: signal('ready'), transitionPending: signal(false), contextVersion: signal(1), selectedOrganization: signal({ organizationId: 'demo', organizationName: 'Grupo Santa Helena', role: 'VIEWER' }), selectedFarm: signal({ farmId: 'demo', farmName: 'Fazenda Santa Helena' }), user: signal({ displayName: 'Vítor' }) }) },
  { provide: DashboardApiClient, useFactory: () => ({
    overview: (selection: PeriodSelection) => {
      const activity = demoActivity(selection);
      return of({ ...overview, period: activity.period, periodActivity: activity.totals, insights: { ...overview.insights, herdActivity: { ...overview.insights.herdActivity, births: activity.totals.births, movements: activity.totals.movements, from: activity.period.from, to: activity.period.to } } });
    },
    activity: (selection: PeriodSelection) => partial ? unavailable() : of(demoActivity(selection)),
    attention: () => of({ referenceDate: date(0), summary: {}, preview }),
    agenda: () => of({ items: preview.map(item => ({ ...item, animalId: item.animal?.id ?? null, identification: item.animal?.identification ?? null, name: item.animal?.name ?? null })), totalPages: 1 }),
    paddocks: () => of({ items: empty ? [] : (sparse ? paddockNames.slice(0, 2) : paddockNames).map(([id, name, occupancy]) => ({ id, name, code: null, status: 'ACTIVE', version: 1, occupancy })), totalPages: 1 }),
  }) },
];
