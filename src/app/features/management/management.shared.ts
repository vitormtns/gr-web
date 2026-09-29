import { DestroyRef } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { AppError } from '../../core/api/api.models';

/** A troca de contexto cancela consultas e invalida respostas de operações anteriores. */
export class ContextRequestScope {
  private epoch = 0;
  private subscriptions = new Subscription();
  constructor(destroy: DestroyRef) { destroy.onDestroy(() => this.reset()); }
  reset(): void { this.epoch++; this.subscriptions.unsubscribe(); this.subscriptions = new Subscription(); }
  run<T>(request: Observable<T>, next: (value: T) => void, error: (failure: unknown) => void): void {
    const epoch = this.epoch;
    this.subscriptions.add(request.subscribe({
      next: value => { if (epoch === this.epoch) next(value); },
      error: failure => { if (epoch === this.epoch) error(failure); },
    }));
  }
}

export function queryString(values: Record<string, string | number | boolean | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== '') query.set(key, String(value));
  }
  return query.toString();
}

/** Preserva o decimal no comando, sem arredondar dinheiro ou quantidade no navegador. */
export function positiveDecimal(value: string, scale: number): string | null {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const [whole, fraction = ''] = normalized.split('.');
  const digits = whole.replace(/^0+/, '') + fraction;
  if (fraction.length > scale || digits.length > 19 || whole.replace(/^0+/, '').length > 19 - scale || !/[1-9]/.test(digits)) return null;
  return `${whole.replace(/^0+(?=\d)/, '')}${fraction ? `.${fraction}` : ''}`;
}

/** Escreve o decimal como número JSON, mantendo todos os dígitos digitados. */
export function decimalCommandJson<T extends object>(body: T, field: keyof T, scale: number): string {
  const decimal = body[field];
  if (typeof decimal !== 'string' || positiveDecimal(decimal, scale) !== decimal) throw new Error('Decimal inválido no comando.');
  return `{${Object.entries(body).map(([key, value]) => `${JSON.stringify(key)}:${key === field ? decimal : JSON.stringify(value)}`).join(',')}}`;
}

export function managementError(error: unknown, fallback: string): string {
  if (!(error instanceof AppError)) return fallback;
  if (error.kind === 'conflict') return 'Os dados mudaram ou a operação não é permitida neste estado. Recarregue e revise antes de tentar novamente.';
  if (error.kind === 'forbidden') return 'Seu acesso não permite esta operação. Recarregue seu contexto de acesso.';
  if (error.kind === 'validation') return 'Revise os campos e as datas informadas antes de tentar novamente.';
  if (error.kind === 'not-found') return 'O registro não está disponível nesta fazenda. Recarregue os dados.';
  return fallback;
}

export function managementTimestamp(value: string | null | undefined, timeZone?: string): string {
  if (!value) return 'Não informado';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Não informado';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone }).format(date);
}
