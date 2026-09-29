export type FinanceType = 'INCOME' | 'EXPENSE';
export type CategoryKind = FinanceType | 'BOTH';
export type CategoryStatus = 'ACTIVE' | 'INACTIVE';
export type EntryStatus = 'PENDING' | 'SETTLED' | 'CANCELLED';
export interface FinanceCategory { id: string; name: string; code: string | null; kind: CategoryKind; status: CategoryStatus; version: number; createdAt: string; updatedAt: string }
export interface CategorySummary { id: string; name: string; kind: CategoryKind }
export interface FinanceEntry { id: string; operationId: string; type: FinanceType; status: EntryStatus; category: CategorySummary; description: string; amount: string | number; dueOn: string; settledOn: string | null; notes: string | null; version: number; createdAt: string; updatedAt: string }
export interface FinanceEvent { id: string; operationId: string | null; type: 'CREATED' | 'CORRECTED' | 'SETTLED' | 'CANCELLED'; actorUserId: string; occurredOn: string | null; details: Record<string, unknown>; recordedAt: string }
export interface FinancePage { items: FinanceEntry[]; page: number; size: number; totalElements: number; totalPages: number }
export interface FinanceSummary { pendingIncome: string | number; pendingExpense: string | number; settledIncome: string | number; settledExpense: string | number; netSettled: string | number; overdueIncome: string | number; overdueExpense: string | number }
export interface CategoryTotals { category: CategorySummary; settledIncome: string | number; settledExpense: string | number; pendingIncome: string | number; pendingExpense: string | number }
export interface FinanceCreate { operationId: string; type: FinanceType; categoryId: string; description: string; amount: string; dueOn: string; notes: string | null }
export interface FinancePatch { expectedVersion: number; categoryId: string; categoryIdSet: true; description: string; descriptionSet: true; amount: string; amountSet: true; dueOn: string; dueOnSet: true; notes: string | null; notesSet: true }
export interface CategoryPatch { expectedVersion: number; name: string; nameSet: true; code: string | null; codeSet: true; kind: CategoryKind; kindSet: true; status: CategoryStatus; statusSet: true }
export const financeTypeLabels: Record<FinanceType, string> = { INCOME: 'Receita', EXPENSE: 'Despesa' };
export const categoryKindLabels: Record<CategoryKind, string> = { ...financeTypeLabels, BOTH: 'Receitas e despesas' };
export const financeStatusLabels: Record<EntryStatus, string> = { PENDING: 'Pendente', SETTLED: 'Liquidado', CANCELLED: 'Cancelado' };
export const financeEventLabels: Record<FinanceEvent['type'], string> = { CREATED: 'Lançamento criado', CORRECTED: 'Lançamento corrigido', SETTLED: 'Lançamento liquidado', CANCELLED: 'Lançamento cancelado' };
