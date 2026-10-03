import { AgeBand } from './parity.models';
import { Page } from './herd.models';

export interface AnimalAge {
  birthDate: string;
  referenceDate: string;
  completedMonths: number;
  completedDays: number;
  currentBand: AgeBand;
  nextBand: AgeBand | null;
  transitionOn: string | null;
  daysUntilTransition: number | null;
  boundaryMonths: number | null;
  policy: 'COMPLETED_CALENDAR_MONTHS_V1';
}
export interface AgeTransitions extends Page<{
  animalId: string;
  identification: string;
  name: string | null;
  age: AnimalAge;
}> {
  referenceDate: string;
  horizonDays: number;
}
/** Apenas formata a idade recebida; a regra e a referência pertencem ao serviço. */
export function ageLabel(age: AnimalAge | null | undefined): string {
  if (!age) return 'Idade não informada';
  if (age.completedMonths === 0) {
    return `${age.completedDays} ${age.completedDays === 1 ? 'dia' : 'dias'}`;
  }
  const years = Math.floor(age.completedMonths / 12);
  const months = age.completedMonths % 12;
  const yearText = `${years} ${years === 1 ? 'ano' : 'anos'}`;
  const monthText = `${months} ${months === 1 ? 'mês' : 'meses'}`;
  return years && months ? `${yearText} e ${monthText}` : years ? yearText : monthText;
}
