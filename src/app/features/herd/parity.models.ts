import { Animal, AnimalSex, AnimalStatus, Page } from './herd.models';
import { HealthProcedureCode, ReproductionServiceType } from './herd-operations.models';

export interface CountedPage<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
}
export type SaleChannel = 'DIRECT' | 'AUCTION' | 'SLAUGHTERHOUSE';
export const saleChannelLabels: Record<SaleChannel, string> = {
  DIRECT: 'Venda direta',
  AUCTION: 'Leilão',
  SLAUGHTERHOUSE: 'Frigorífico',
};
export interface VersionedCommand {
  operationId: string;
  expectedVersion: number;
}
export interface LifecycleCommand extends VersionedCommand {
  occurredOn: string;
  notes: string | null;
  deathReason?: string | null;
  saleChannel?: SaleChannel | null;
  saleBuyer?: string | null;
  saleAmount?: number | null;
}
export interface NoteCommand extends VersionedCommand {
  occurredOn: string;
  notes: string;
}
export interface NoteResult {
  animalId: string;
  operationId: string;
  occurredOn: string;
  notes: string;
  version: number;
  replayed: boolean;
}
export interface MotherCommand extends VersionedCommand {
  motherId: string | null;
}
export interface MotherResult {
  animalId: string;
  motherId: string | null;
  version: number;
  replayed: boolean;
}
export interface ImportRow {
  id: string;
  identification: string;
  name: string | null;
  sex: AnimalSex;
  status: 'ACTIVE';
  birthDate: string | null;
  motherIdentification: string | null;
}
export interface ImportCommand {
  operationId: string;
  animals: ImportRow[];
}
export interface ImportResult {
  animalIds: string[];
  replayed: boolean;
}
export interface BreedingBatchCommand {
  operationId: string;
  serviceType: ReproductionServiceType;
  serviceOn: string;
  sireReference: string | null;
  notes: string | null;
  mothers: { id: string; expectedVersion: number }[];
}
export interface BreedingBatchResult {
  items: { motherId: string; pregnancyId: string }[];
  replayed: boolean;
}
export type GroupKind = 'MANUAL' | 'SMART';
export interface GroupRules {
  sex: AnimalSex | null;
  status: AnimalStatus | null;
  minAgeMonths: number | null;
  maxAgeMonths: number | null;
  onlyReproductionActive: boolean;
  onlyMissingProfile: boolean;
}
export interface HerdGroup {
  id: string;
  name: string;
  kind: GroupKind;
  status: 'ACTIVE' | 'ARCHIVED';
  rules: GroupRules;
  version: number;
}
export interface CreateGroup {
  id: string;
  name: string;
  kind: GroupKind;
  rules: GroupRules;
}
export interface CreateGroupWithAnimalsCommand {
  operationId: string;
  id: string;
  name: string;
  animalIds: string[];
}
export interface GroupMembershipBatchCommand extends VersionedCommand {
  animalIds: string[];
}
export interface GroupMembershipBatchResult {
  group: HerdGroup;
  addedCount: number;
  alreadyMemberCount: number;
  replayed: boolean;
}
export interface UpdateGroup {
  expectedVersion: number;
  name: string;
  rules: GroupRules;
}
export interface GroupAnimals extends Page<Animal> {
  positionSemantics: 'CURRENT_STATE_AGED_AT_REFERENCE';
}
export function emptyGroupRules(): GroupRules {
  return {
    sex: null,
    status: null,
    minAgeMonths: null,
    maxAgeMonths: null,
    onlyReproductionActive: false,
    onlyMissingProfile: false,
  };
}
export type MilkSession = 'MORNING' | 'AFTERNOON' | 'EVENING';
export type MilkTrend = 'UP' | 'DOWN' | 'STABLE' | 'INSUFFICIENT_DATA';
export const milkSessionLabels: Record<MilkSession, string> = {
  MORNING: 'Manhã',
  AFTERNOON: 'Tarde',
  EVENING: 'Noite',
};
export const milkTrendLabels: Record<MilkTrend, string> = {
  UP: 'Em alta',
  DOWN: 'Em queda',
  STABLE: 'Estável',
  INSUFFICIENT_DATA: 'Dados insuficientes',
};
export interface MilkCommand extends VersionedCommand {
  recordedOn: string;
  liters: number;
  session: MilkSession | null;
  notes: string | null;
}
export interface MilkRecord {
  id: string;
  operationId: string;
  animalId: string;
  recordedOn: string;
  liters: number;
  session: MilkSession | null;
  notes: string | null;
  actorUserId: string | null;
  recordedAt: string;
}
export interface MilkOverview {
  litersToday: number;
  femalesWithRecordToday: number;
  averageLitersPerRecordLast7Days: number | null;
}
export interface MilkSummary {
  lastRecord: MilkRecord | null;
  averageLitersLast7Days: number | null;
  recordsLast7Days: number;
  trend: MilkTrend;
}
export type AgeBand =
  'MONTHS_0_2' | 'MONTHS_3_8' | 'MONTHS_9_12' | 'MONTHS_13_24' | 'MONTHS_25_36' | 'MONTHS_37_PLUS';
export const ageBandLabels: Record<AgeBand, string> = {
  MONTHS_0_2: '0 a 2 meses',
  MONTHS_3_8: '3 a 8 meses',
  MONTHS_9_12: '9 a 12 meses',
  MONTHS_13_24: '13 a 24 meses',
  MONTHS_25_36: '25 a 36 meses',
  MONTHS_37_PLUS: '37 meses ou mais',
};
export interface AgeSexBalance {
  referenceDate: string;
  positionSemantics:
    'CURRENT_STATE_AGED_AT_REFERENCE' | 'RECORDED_FARM_EVENTS_WITH_CURRENTLY_CORRECTED_PROFILE';
  totalActiveAnimals: number;
  unknownBirthDate: number;
  cells: { ageBand: AgeBand; sex: AnimalSex; count: number }[];
}
export interface PeriodReconciliation {
  from: string;
  to: string;
  positionSemantics: 'RECORDED_FARM_EVENT_LEDGER';
  balance: {
    openingAnimals: number;
    registeredAnimals: number;
    births: number;
    transfersIn: number;
    sales: number;
    deaths: number;
    transfersOut: number;
    closingAnimals: number;
  };
}
export interface ProcedureCoverage {
  procedureCode: HealthProcedureCode;
  referenceDate: string;
  positionSemantics: 'CURRENT_STATE_AGED_AT_REFERENCE_EFFECTIVE_RECORDED_TREATMENTS';
  totalActiveAnimals: number;
  withRecordedTreatment: number;
  withoutRecordedTreatment: number;
  unknownBirthDate: number;
  cells: {
    ageBand: AgeBand;
    sex: AnimalSex;
    withRecordedTreatment: number;
    withoutRecordedTreatment: number;
  }[];
}

export interface AgeSexPeriodCell {
  ageBand: AgeBand | null; sex: AnimalSex;
  openingAnimals: number; registeredAnimals: number; births: number; transfersIn: number;
  sales: number; deaths: number; transfersOut: number; closingAnimals: number; ageBandChange: number;
}
export interface AgeSexPeriod {
  from: string; to: string; positionSemantics: string;
  cells: AgeSexPeriodCell[]; totals: Omit<AgeSexPeriodCell, 'ageBand' | 'sex'>;
}
export interface AgeSexAnimals extends Page<{ animal: { id: string; identification: string | null; name: string | null }; sex: AnimalSex; birthDate: string | null; availableInCurrentFarm: boolean }> {
  referenceDate: string; positionSemantics: string;
}
