import { describe, expect, it } from 'vitest';
import { ActivityChartComponent } from './activity-chart.component';
import { ActivityBucket } from './dashboard.models';

const bucket = (date: string, movements: number): ActivityBucket => ({ date, births: 0, deaths: 0, sales: 0, movements, weights: 0, healthTreatments: 0, breedings: 0, calvings: 0 });

describe('leitura da série de atividade', () => {
  it('mantém buckets zerados no caminho sem inventar datas', () => {
    const chart = new ActivityChartComponent();
    chart.buckets = [bucket('2026-09-13', 0), bucket('2026-09-14', 4), bucket('2026-09-15', 0)];
    expect(chart.path('movements')).toBe('M0.00,180.00 L400.00,25.00 L800.00,180.00');
    expect(chart.noActivity()).toBe(false);
    chart.buckets = [bucket('2026-09-14', 0), bucket('2026-09-15', 0)];
    expect(chart.noActivity()).toBe(true);
    expect(chart.path('movements')).toContain('L800.00,180.00');
  });
  it('permite percorrer o gráfico por teclado e alternar séries', () => {
    const chart = new ActivityChartComponent();
    chart.buckets = [bucket('2026-09-14', 0), bucket('2026-09-15', 2)];
    const event = { key: 'ArrowRight', preventDefault() {} } as KeyboardEvent;
    chart.onKey(event);
    expect(chart.focused()).toBe(1);
    chart.toggle('movements');
    expect(chart.visible().some(item => item.key === 'movements')).toBe(false);
    expect(chart.description()).toContain('Nascimentos');
  });
});
