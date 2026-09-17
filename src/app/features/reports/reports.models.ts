export type ReportId = 'herd-position'|'lifecycle'|'movements'|'transfers'|'weights'|'health'|'reproduction'|'planner';
export type LifecycleEvent = 'CREATED'|'BORN'|'SOLD'|'DECEASED';
export type TransferDirection = 'IN'|'OUT'|'ALL';
export type HealthTreatmentType = 'VACCINATION'|'DEWORMING';
export type ReproductionServiceType = 'INSEMINATION'|'NATURAL_SERVICE';
export type PregnancyStatus = 'POSSIBLE'|'CONFIRMED'|'CALVED'|'TERMINATED';
export type ReproductionAction = 'BREEDING_RECORDED'|'PREGNANCY_CONFIRMED'|'PREGNANCY_TERMINATED'|'CALVED'|'BORN';
export type PlannerStatus = 'OPEN'|'COMPLETED'|'CANCELLED';
export type PlannerType = 'GENERAL'|'WEIGHING'|'VACCINATION'|'DEWORMING'|'BREEDING'|'PREGNANCY_CHECK'|'CALVING'|'MOVEMENT';
export type HerdCategory = 'UNCLASSIFIED';
export type AnimalSex = 'FEMALE'|'MALE';

export interface ReportPage<S,I>{summary:S;items:I[];page:number;size:number;totalElements:number;totalPages:number}
export interface AnimalReference{id:string;identification:string;name:string|null}
export interface PaddockReference{id:string;name:string}
export interface FarmReference{id:string;name:string}

export interface HerdPositionSummary{totalActiveAnimals:number;totalsByCategory:Partial<Record<HerdCategory,number>>;totalsBySex:Partial<Record<AnimalSex,number>>;totalsByPaddock:{paddock:PaddockReference;total:number}[];unlocatedCount:number}
export interface HerdPositionItem{animal:AnimalReference;category:HerdCategory;sex:AnimalSex;birthDate:string|null;paddock:PaddockReference|null}
export type HerdPositionPage=ReportPage<HerdPositionSummary,HerdPositionItem>;

export interface LifecycleSummary{countsByEventType:Partial<Record<LifecycleEvent,number>>;totalAffectedAnimals:number}
export interface LifecycleItem{id:string;animal:AnimalReference;event:LifecycleEvent;occurredOn:string;recordedAt:string;notes:string|null}
export type LifecyclePage=ReportPage<LifecycleSummary,LifecycleItem>;

export interface MovementSummary{movementCount:number;distinctAnimalsMoved:number}
export interface MovementItem{id:string;animal:AnimalReference;occurredOn:string;recordedAt:string;sourcePaddock:PaddockReference|null;destinationPaddock:PaddockReference;notes:string|null}
export type MovementPage=ReportPage<MovementSummary,MovementItem>;

export interface TransferSummary{transferCount:number;inboundCount:number;outboundCount:number;distinctAnimalsTransferred:number}
export interface TransferItem{id:string;animal:AnimalReference;direction:'IN'|'OUT';occurredOn:string;recordedAt:string;sourceFarm:FarmReference|null;destinationFarm:FarmReference|null;destinationPaddock:PaddockReference|null;notes:string|null}
export type TransferPage=ReportPage<TransferSummary,TransferItem>;

export interface WeightSummary{measurementCount:number;animalsMeasured:number;averageWeight:string|null;minimumWeight:string|null;maximumWeight:string|null}
export interface WeightItem{id:string;animal:AnimalReference;occurredOn:string;recordedAt:string;weight:string}
export type WeightPage=ReportPage<WeightSummary,WeightItem>;

export interface HealthSummary{treatmentsCount:number;animalsTreated:number;countsByTreatmentType:Partial<Record<HealthTreatmentType,number>>}
export interface HealthItem{id:string;animal:AnimalReference;treatmentType:HealthTreatmentType;occurredOn:string;recordedAt:string;product:string|null;protocol:string|null;nextDueOn:string|null}
export type HealthPage=ReportPage<HealthSummary,HealthItem>;

export interface ReproductionSummary{servicesRecorded:number;pregnanciesConfirmed:number;pregnanciesTerminated:number;calvings:number;calvesBorn:number;openPossiblePregnancies:number;openConfirmedPregnancies:number}
export interface ReproductionItem{id:string;mother:AnimalReference;action:ReproductionAction;occurredOn:string;recordedAt:string;pregnancyId:string|null;serviceType:ReproductionServiceType|null;expectedCalvingOn:string|null;calfId:string|null;terminationReason:string|null}
export type ReproductionPage=ReportPage<ReproductionSummary,ReproductionItem>;

export interface PlannerSummary{open:number;completed:number;cancelled:number;overdueOpen:number}
export interface PlannerItem{id:string;type:PlannerType;title:string;notes:string|null;scheduledFor:string;status:PlannerStatus;animal:AnimalReference|null;version:number;createdAt:string;updatedAt:string}
export type PlannerPage=ReportPage<PlannerSummary,PlannerItem>;

export type AnyReportPage=HerdPositionPage|LifecyclePage|MovementPage|TransferPage|WeightPage|HealthPage|ReproductionPage|PlannerPage;
export interface ReportFilters{report:ReportId;from:string;to:string;animalId:string;category:HerdCategory|'';sex:AnimalSex|'';paddockId:string;event:LifecycleEvent|'';sourcePaddockId:string;destinationPaddockId:string;direction:TransferDirection;treatmentType:HealthTreatmentType|'';motherId:string;serviceType:ReproductionServiceType|'';pregnancyStatus:PregnancyStatus|'';plannerStatus:PlannerStatus|'';plannerType:PlannerType|'';page:number;size:number}

export const reportDefinitions:{id:ReportId;label:string;group:'Rebanho'|'Operação'|'Cuidado';description:string;period:boolean}[]=[
  {id:'herd-position',label:'Posição do rebanho',group:'Rebanho',description:'Composição ativa e distribuição atual.',period:false},
  {id:'lifecycle',label:'Ciclo do rebanho',group:'Rebanho',description:'Eventos que alteraram o rebanho no período.',period:true},
  {id:'movements',label:'Movimentações',group:'Operação',description:'Deslocamentos internos entre piquetes.',period:true},
  {id:'transfers',label:'Transferências',group:'Operação',description:'Entradas e saídas entre fazendas.',period:true},
  {id:'weights',label:'Pesagens',group:'Cuidado',description:'Medições e amplitude de peso.',period:true},
  {id:'health',label:'Saúde',group:'Cuidado',description:'Tratamentos efetivamente realizados.',period:true},
  {id:'reproduction',label:'Reprodução',group:'Cuidado',description:'Fatos do processo reprodutivo.',period:true},
  {id:'planner',label:'Execução do planejamento',group:'Operação',description:'Situação das atividades planejadas.',period:true},
];

export const lifecycleLabels:Record<LifecycleEvent,string>={CREATED:'Entrada por cadastro',BORN:'Nascimento',SOLD:'Venda',DECEASED:'Baixa por morte'};
export const healthLabels:Record<HealthTreatmentType,string>={VACCINATION:'Vacinação',DEWORMING:'Vermifugação'};
export const reproductionLabels:Record<ReproductionAction,string>={BREEDING_RECORDED:'Serviço registrado',PREGNANCY_CONFIRMED:'Gestação confirmada',PREGNANCY_TERMINATED:'Gestação encerrada',CALVED:'Parto',BORN:'Nascimento'};
export const plannerLabels:Record<PlannerType,string>={GENERAL:'Atividade geral',WEIGHING:'Pesagem',VACCINATION:'Vacinação',DEWORMING:'Vermifugação',BREEDING:'Cobertura',PREGNANCY_CHECK:'Diagnóstico de gestação',CALVING:'Parto',MOVEMENT:'Movimentação'};
export const plannerStatusLabels:Record<PlannerStatus,string>={OPEN:'Em aberto',COMPLETED:'Concluída',CANCELLED:'Cancelada'};
export const serviceLabels:Record<ReproductionServiceType,string>={INSEMINATION:'Inseminação',NATURAL_SERVICE:'Monta natural'};
