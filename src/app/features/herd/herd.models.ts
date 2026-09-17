import { AppError, FarmOption } from '../../core/api/api.models';

export type AnimalSex = 'FEMALE' | 'MALE';
export type AnimalStatus = 'ACTIVE' | 'SOLD' | 'DECEASED' | 'TRANSFERRED' | 'ARCHIVED';
export interface PaddockRef { id: string; name: string; code: string | null; status: 'ACTIVE' | 'INACTIVE'; version: number; occupancy?: number }
export interface Animal { id: string; identification: string; name: string | null; sex: AnimalSex; birthDate: string | null; status: AnimalStatus; version: number; paddock: PaddockRef | null }
export interface Page<T> { items: T[]; page: number; size: number; totalElements: number; totalPages: number }
export interface AnimalFilters { search: string; sex: AnimalSex | ''; status: AnimalStatus | ''; page: number; size: number }
export interface FieldChange { before: unknown; after: unknown }
export interface AnimalEvent { id: string; type: string; occurredOn: string; recordedAt: string; resultingVersion: number; actorUserId: string | null; details: Record<string, unknown> }
export interface AnimalHistory extends Page<AnimalEvent> {}
export interface MovementItem { id: string; animal: { id: string; identification: string; name: string | null }; occurredOn: string; recordedAt: string; sourcePaddock: { id: string; name: string } | null; destinationPaddock: { id: string; name: string }; notes: string | null }
export interface MovementPage extends Page<MovementItem> { summary: { movementCount: number; distinctAnimalsMoved: number } }
export interface BatchResult { operationId: string; movedCount: number; animals: { id: string; version: number }[]; destinationPaddock: PaddockRef }
export interface TransferResult { operationId: string; sourceFarm: { id: string; name: string }; destinationFarm: { id: string; name: string }; destinationPaddock: PaddockRef | null; transferredCount: number; animals: { id: string; version: number }[] }
export interface ViewState<T> { status: 'loading' | 'ready' | 'error'; value: T | null; error: AppError | null }
export interface TransferOption extends FarmOption {}

export const statusLabels: Record<AnimalStatus, string> = { ACTIVE: 'Ativo', SOLD: 'Vendido', DECEASED: 'Baixado', TRANSFERRED: 'Transferido', ARCHIVED: 'Arquivado' };
export const sexLabels: Record<AnimalSex, string> = { FEMALE: 'Fêmea', MALE: 'Macho' };
export const terminalStatuses: AnimalStatus[] = ['SOLD', 'DECEASED', 'TRANSFERRED', 'ARCHIVED'];

export function animalTone(status: AnimalStatus): 'success' | 'warning' | 'danger' | 'neutral' {
  return status === 'ACTIVE' ? 'success' : status === 'DECEASED' ? 'danger' : status === 'SOLD' ? 'warning' : 'neutral';
}

export function newUuid(): string {
  return globalThis.crypto?.randomUUID?.() ?? 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16);
  });
}
