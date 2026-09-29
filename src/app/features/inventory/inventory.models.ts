export type InventoryUnit = 'UNIT' | 'KG' | 'G' | 'L' | 'ML' | 'M' | 'M2' | 'M3';
export type InventoryStatus = 'ACTIVE' | 'INACTIVE';
export type InventoryMovementType = 'RECEIPT' | 'ISSUE' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'TRANSFER';
export interface InventoryProduct { id: string; name: string; code: string | null; category: string | null; baseUnit: InventoryUnit; status: InventoryStatus; version: number; createdAt: string; updatedAt: string; }
export interface InventoryLocation { id: string; name: string; code: string | null; status: InventoryStatus; version: number; createdAt: string; updatedAt: string; }
export interface InventoryBalance { productId: string; productName: string; baseUnit: InventoryUnit; locationId: string; locationName: string; quantity: string | number; version: number; updatedAt: string; }
export interface InventoryMovement { id: string; operationId: string; type: InventoryMovementType; productId: string; productName: string; baseUnit: InventoryUnit; sourceLocationId: string | null; sourceLocationName: string | null; destinationLocationId: string | null; destinationLocationName: string | null; quantity: string | number; sourceBalanceAfter: string | number | null; destinationBalanceAfter: string | number | null; occurredOn: string; actorUserId: string; notes: string | null; recordedAt: string; }
export interface InventoryPage<T> { items: T[]; page: number; size: number; totalElements: number; totalPages: number; }
export interface InventoryMovementCommand { operationId: string; type: InventoryMovementType; productId: string; sourceLocationId: string | null; destinationLocationId: string | null; quantity: string; occurredOn: string; notes: string | null; }
export const unitLabels: Record<InventoryUnit, string> = { UNIT: 'un.', KG: 'kg', G: 'g', L: 'L', ML: 'mL', M: 'm', M2: 'm²', M3: 'm³' };
export const movementLabels: Record<InventoryMovementType, string> = { RECEIPT: 'Entrada', ISSUE: 'Saída / consumo', ADJUSTMENT_IN: 'Ajuste de entrada', ADJUSTMENT_OUT: 'Ajuste de saída', TRANSFER: 'Transferência entre depósitos' };
