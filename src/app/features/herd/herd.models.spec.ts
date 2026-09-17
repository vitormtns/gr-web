import { describe, expect, it } from 'vitest';
import { animalTone, newUuid, sexLabels, statusLabels, terminalStatuses } from './herd.models';
import { animalListQuery } from './herd-api.service';
import { formatDate } from './herd.shared';

describe('contratos de apresentação do rebanho', () => {
  it('traduz estados e sexo sem depender apenas de cor', () => {
    expect(statusLabels.ACTIVE).toBe('Ativo');
    expect(statusLabels.DECEASED).toBe('Baixado');
    expect(sexLabels.FEMALE).toBe('Fêmea');
    expect(animalTone('ACTIVE')).toBe('success');
    expect(animalTone('SOLD')).toBe('warning');
    expect(terminalStatuses).toContain('TRANSFERRED');
  });
  it('formata datas civis sem deslocamento de fuso', () => {
    expect(formatDate('2026-09-17')).toBe('17/09/2026');
    expect(formatDate(null)).toBe('Não informada');
  });
  it('gera UUIDs válidos para intenções idempotentes', () => {
    expect(newUuid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });
});

describe('estado de URL da lista', () => {
  it('envia apenas filtros reais com paginação server-side', () => {
    expect(animalListQuery({ search:'Aurora', sex:'FEMALE', status:'ACTIVE', page:2, size:20 })).toBe('page=2&size=20&search=Aurora&sex=FEMALE&status=ACTIVE');
  });
  it('omite filtros vazios e preserva a página', () => {
    expect(animalListQuery({ search:'', sex:'', status:'', page:0, size:50 })).toBe('page=0&size=50');
  });
});
