import { Pipe, PipeTransform } from '@angular/core';

const decimalFields = new Set(['amount', 'quantity', 'sourceBalanceAfter', 'destinationBalanceAfter', 'pendingIncome', 'pendingExpense', 'settledIncome', 'settledExpense', 'netSettled', 'overdueIncome', 'overdueExpense']);

/** O reviver recebe a representação original do número JSON, antes da perda de precisão de Number. */
export function parseManagementJson<T>(json: string): T {
  return JSON.parse(json, (key: string, value: unknown, context?: { source?: string }) => {
    if (!decimalFields.has(key) || typeof value !== 'number') return value;
    if (!context?.source) throw new Error('O navegador não permite preservar a precisão dos valores recebidos.');
    return context.source;
  }) as T;
}

@Pipe({ name: 'grDecimal' })
export class ExactDecimalPipe implements PipeTransform {
  transform(value: string | number | null | undefined, minimumFraction = 0): string {
    if (value === null || value === undefined) return '—';
    const text = String(value);
    if (!/^-?\d+(\.\d+)?$/.test(text)) return 'Valor indisponível';
    const [whole, fraction = ''] = text.split('.');
    const decimals = fraction.replace(/0+$/, '').padEnd(minimumFraction, '0');
    return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}${decimals ? `,${decimals}` : ''}`;
  }
}
