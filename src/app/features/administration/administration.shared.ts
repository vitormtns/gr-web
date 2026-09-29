import { AppError } from '../../core/api/api.models';
import { managementError } from '../management/management.shared';

export function administrationError(error: unknown, fallback: string): string {
  if (error instanceof AppError && error.kind === 'not-found') return 'O cadastro não está disponível para o seu acesso. Recarregue os dados.';
  return managementError(error, fallback);
}
