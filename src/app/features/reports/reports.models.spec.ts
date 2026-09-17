import { describe, expect, it } from 'vitest';
import { WeightPage, reportDefinitions } from './reports.models';

describe('contratos analíticos',()=>{
  it('expõe exatamente os oito relatórios pecuários',()=>{
    expect(reportDefinitions.map(item=>item.id)).toEqual(['herd-position','lifecycle','movements','transfers','weights','health','reproduction','planner']);
  });
  it('preserva a precisão decimal recebida em pesagens',()=>{
    const page:WeightPage={summary:{measurementCount:1,animalsMeasured:1,averageWeight:'428.375',minimumWeight:'428.375',maximumWeight:'428.375'},items:[{id:'w',animal:{id:'a',identification:'B-1',name:null},occurredOn:'2026-09-17',recordedAt:'2026-09-17T12:00:00Z',weight:'428.375'}],page:0,size:20,totalElements:1,totalPages:1};
    expect(page.items[0].weight).toBe('428.375');
    expect(page.summary.averageWeight).toBe('428.375');
  });
  it('mantém movimentação interna e transferência como leituras distintas',()=>{
    expect(reportDefinitions.find(item=>item.id==='movements')?.description).toContain('piquetes');
    expect(reportDefinitions.find(item=>item.id==='transfers')?.description).toContain('fazendas');
  });
});
