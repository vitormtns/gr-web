import { PendingWorkType } from './herd-operations.models';

export function pendingNavigation(animalId: string, type: PendingWorkType | null, pregnancyId: string | null) {
  if ((type === 'CALVING_UPCOMING' || type === 'CALVING_OVERDUE') && pregnancyId) {
    return { path: '/rebanho/reproducao', query: { tab: 'pregnancies', pregnancyId, action: 'view' } };
  }
  if (type && ['VACCINATION_DUE', 'DEWORMING_DUE', 'BRUCELLOSIS_DUE', 'BRUCELLOSIS_WINDOW_MISSED'].includes(type)) {
    return { path: '/rebanho/saude', query: { tab: 'pending', pendingType: type, animalId } };
  }
  return { path: `/rebanho/animais/${animalId}`, query: { section: type === 'WEIGHING_DUE' ? 'weight' : 'overview' } };
}
