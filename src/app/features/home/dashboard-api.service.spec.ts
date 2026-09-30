import { describe, expect, it } from 'vitest';
import { DashboardApiClient, periodQuery } from './dashboard-api.service';
import { of } from 'rxjs';

describe('requisições de período', () => {
  it('envia apenas period para períodos relativos', () => {
    expect(periodQuery({ period: 'TODAY' })).toBe('?period=TODAY');
    expect(periodQuery({ period: 'LAST_7_DAYS' })).toBe('?period=LAST_7_DAYS');
    expect(periodQuery({ period: 'LAST_30_DAYS' })).toBe('?period=LAST_30_DAYS');
  });
  it('envia from/to somente no CUSTOM', () => {
    expect(periodQuery({ period: 'CUSTOM', from: '2026-09-01', to: '2026-09-15' })).toBe('?period=CUSTOM&from=2026-09-01&to=2026-09-15');
  });
});

describe('janela da agenda',()=>{
  it('envia from/to e paginação de 100 itens ao backend',()=>{
    let path='';
    const client=new DashboardApiClient({get:(value:string)=>{path=value;return of({items:[]});}} as never);
    client.agendaPage('2026-09-29','2026-10-05',1).subscribe();
    expect(path).toBe('/api/v1/herd/agenda?from=2026-09-29&to=2026-10-05&page=1&size=100');
  });
});
