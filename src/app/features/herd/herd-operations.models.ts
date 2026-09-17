import { Animal, Page } from './herd.models';

export type HealthTreatmentType = 'VACCINATION' | 'DEWORMING';
export type ReproductionServiceType = 'INSEMINATION' | 'NATURAL_SERVICE';
export type PregnancyStatus = 'POSSIBLE' | 'CONFIRMED' | 'CALVED' | 'TERMINATED';
export type PregnancyTerminationReason = 'NOT_PREGNANT' | 'PREGNANCY_LOSS' | 'ABORTION' | 'OTHER';
export type PendingWorkType = 'VACCINATION_DUE' | 'DEWORMING_DUE' | 'WEIGHING_DUE' | 'CALVING_UPCOMING' | 'CALVING_OVERDUE';
export type PlannerType = 'GENERAL' | 'WEIGHING' | 'VACCINATION' | 'DEWORMING' | 'BREEDING' | 'PREGNANCY_CHECK' | 'CALVING' | 'MOVEMENT';
export type PlannerStatus = 'OPEN' | 'COMPLETED' | 'CANCELLED';
export type AgendaSource = 'MANUAL' | 'DERIVED';

export interface AnimalReference { id: string; identification: string; name: string | null }
export interface OperationResult { operationId: string; animals: { animalId: string; resultingVersion: number }[]; replayed: boolean }
export interface WeightMeasurement { id: string; operationId: string; measuredOn: string; weightKg: string; notes: string | null; recordedAt: string }
export interface WeightPage extends Page<WeightMeasurement> {}
export interface HealthTreatment { id: string; operationId?: string; animal?: AnimalReference; type?: HealthTreatmentType; treatmentType?: HealthTreatmentType; occurredOn: string; product: string | null; protocol: string | null; nextDueOn: string | null; notes?: string | null; recordedAt: string }
export interface HealthReport extends Page<HealthTreatment> { summary: { treatmentsCount: number; animalsTreated: number; countsByTreatmentType: Partial<Record<HealthTreatmentType, number>> } }
export interface Pregnancy { id: string; motherId: string; serviceType: ReproductionServiceType; serviceOn: string; sireReference: string | null; expectedCalvingOn: string | null; status: PregnancyStatus; confirmedOn: string | null; endedOn: string | null; terminationReason: PregnancyTerminationReason | null; calfAnimalId: string | null; version: number }
export interface PregnancyPage extends Page<Pregnancy> {}
export interface ReproductionEvent { id: string; mother: AnimalReference; action: 'BREEDING_RECORDED'|'PREGNANCY_CONFIRMED'|'PREGNANCY_TERMINATED'|'CALVED'|'BORN'; occurredOn: string; recordedAt: string; pregnancyId: string | null; serviceType: ReproductionServiceType | null; expectedCalvingOn: string | null; calfId: string | null; terminationReason: PregnancyTerminationReason | null }
export interface ReproductionReport extends Page<ReproductionEvent> { summary: { servicesRecorded: number; pregnanciesConfirmed: number; pregnanciesTerminated: number; calvings: number; calvesBorn: number; openPossiblePregnancies: number; openConfirmedPregnancies: number } }
export interface PendingWorkItem { type: PendingWorkType; animalId: string; identification: string; name: string | null; farmId: string; dueOn: string | null; expectedOn: string | null; daysOverdue: number | null; daysUntil: number | null; pregnancyId: string | null; treatmentType: HealthTreatmentType | null; lastPerformedOn: string | null; lastWeightOn: string | null }
export interface PendingWorkPage extends Page<PendingWorkItem> {}
export interface PlannerItem { id: string; operationId: string | null; type: PlannerType; title: string; notes: string | null; scheduledFor: string; status: PlannerStatus; animalId: string | null; version: number; createdAt: string; updatedAt: string; completedAt: string | null; cancelledAt: string | null; replay: boolean }
export interface PlannerPage extends Page<PlannerItem> {}
export interface AgendaItem { source: AgendaSource; kind: string; operationalDate: string; stableId: string; animalId: string | null; summary: string; identification: string | null; name: string | null; plannerItemId: string | null; pendingWorkType: PendingWorkType | null; pregnancyId: string | null; status: PlannerStatus | null }
export interface AgendaPage extends Page<AgendaItem> {}
export interface CalvingResult { mother: Animal; calf: Animal; pregnancy: Pregnancy | null; replay: boolean }

export const healthLabels: Record<HealthTreatmentType, string> = { VACCINATION: 'Vacinação', DEWORMING: 'Vermifugação' };
export const serviceLabels: Record<ReproductionServiceType, string> = { INSEMINATION: 'Inseminação', NATURAL_SERVICE: 'Monta natural' };
export const pregnancyLabels: Record<PregnancyStatus, string> = { POSSIBLE: 'Em acompanhamento', CONFIRMED: 'Confirmada', CALVED: 'Parto realizado', TERMINATED: 'Encerrada' };
export const plannerTypeLabels: Record<PlannerType, string> = { GENERAL:'Atividade geral', WEIGHING:'Pesagem', VACCINATION:'Vacinação', DEWORMING:'Vermifugação', BREEDING:'Cobertura', PREGNANCY_CHECK:'Diagnóstico de gestação', CALVING:'Parto', MOVEMENT:'Movimentação' };
export const pendingLabels: Record<PendingWorkType, string> = { VACCINATION_DUE:'Vacinação pendente', DEWORMING_DUE:'Vermifugação pendente', WEIGHING_DUE:'Pesagem pendente', CALVING_UPCOMING:'Parto próximo', CALVING_OVERDUE:'Parto após a data esperada' };
