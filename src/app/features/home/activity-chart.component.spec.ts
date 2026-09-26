import { describe, expect, it } from 'vitest';
import { ActivityChartComponent } from './activity-chart.component';
import { ActivityBucket } from './dashboard.models';

const bucket = (date: string, movements: number): ActivityBucket => ({ date, births: 0, deaths: 0, sales: 0, movements, weights: 0, healthTreatments: 0, breedings: 0, calvings: 0 });

describe('leitura da série de atividade', () => {
  it('adapta a apresentação para períodos vazios, esparsos e populados', () => {
    const chart = new ActivityChartComponent();
    chart.buckets = [bucket('2026-09-13', 0), bucket('2026-09-14', 4), bucket('2026-09-15', 0)];
    expect(chart.mode()).toBe('sparse');
    expect(chart.events()).toEqual([{ date: '2026-09-14', label: 'Movimentações', value: 4, color: '#326b86' }]);
    chart.buckets = [bucket('2026-09-14', 0), bucket('2026-09-15', 0)];
    expect(chart.mode()).toBe('empty');
    chart.buckets = Array.from({ length: 5 }, (_, index) => bucket(`2026-09-${String(index + 10).padStart(2, '0')}`, 1));
    expect(chart.mode()).toBe('pulse');
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
