import { HttpErrorResponse } from '@angular/common/http';
import { AppError, ApiErrorKind, ValidationError } from './api.models';

interface BackendErrorBody {
  code?: unknown;
  message?: unknown;
  status?: unknown;
  requestId?: unknown;
  validationErrors?: unknown;
}

const kindByStatus: Record<number, ApiErrorKind> = {
  400: 'validation', 401: 'unauthorized', 403: 'forbidden', 404: 'not-found',
  409: 'conflict', 503: 'unavailable',
};

const safeMessages: Record<ApiErrorKind, string> = {
  validation: 'Revise as informações enviadas.',
  unauthorized: 'Sua sessão expirou. Entre novamente.',
  forbidden: 'Você não tem permissão para realizar esta ação.',
  'not-found': 'O recurso ou contexto solicitado não está disponível.',
  conflict: 'Os dados foram alterados. Atualize a página e tente novamente.',
  unavailable: 'O serviço está temporariamente indisponível. Tente novamente em instantes.',
  unexpected: 'Ocorreu um erro inesperado.',
};

export function normalizeApiError(error: HttpErrorResponse): AppError {
  const body = isObject(error.error) ? error.error as BackendErrorBody : {};
  const status = typeof body.status === 'number' ? body.status : error.status;
  const kind = kindByStatus[status] ?? 'unexpected';
  const message = typeof body.message === 'string' && body.message.trim() ? body.message : safeMessages[kind];
  const code = typeof body.code === 'string' ? body.code : `http_${status || 'unknown'}`;
  const requestId = typeof body.requestId === 'string'
    ? body.requestId
    : error.headers?.get('X-Correlation-ID') ?? error.headers?.get('X-Request-ID') ?? undefined;
  const validationErrors = Array.isArray(body.validationErrors)
    ? body.validationErrors.filter(isValidationError)
    : [];
  return new AppError(kind, message, status, code, requestId, validationErrors);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isValidationError(value: unknown): value is ValidationError {
  return isObject(value) && typeof value['field'] === 'string' && typeof value['message'] === 'string';
}
