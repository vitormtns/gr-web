import { describe, expect, it } from 'vitest';
import { convertToParamMap } from '@angular/router';
import { defaultFilters, parseFilters, periodIssue } from './reports-page.component';
import { reportQuery } from './reports-api.service';

describe('mapeamento dos relatórios',()=>{
  it('envia somente filtros aceitos pelo relatório ativo',()=>{
    const query=reportQuery({...defaultFilters('movements'),animalId:'31fd93ce-60ef-4e30-bcea-94315f685b27',sourcePaddockId:'03803f1a-0f0e-4bb2-acd1-dfb292ab5ac4',direction:'IN',treatmentType:'VACCINATION'});
    expect(query).toContain('animalId=31fd93ce-60ef-4e30-bcea-94315f685b27');
    expect(query).toContain('sourcePaddockId=03803f1a-0f0e-4bb2-acd1-dfb292ab5ac4');
    expect(query).not.toContain('direction');
    expect(query).not.toContain('treatmentType');
  });
  it('não força período no snapshot da posição atual',()=>{
    const query=reportQuery({...defaultFilters('herd-position'),sex:'FEMALE'});
    expect(query).toBe('sex=FEMALE&page=0&size=20');
  });
  it('mapeia motherId no relatório reprodutivo',()=>{
    const query=reportQuery({...defaultFilters('reproduction'),animalId:'31fd93ce-60ef-4e30-bcea-94315f685b27',pregnancyStatus:'CONFIRMED'});
    expect(query).toContain('motherId=31fd93ce-60ef-4e30-bcea-94315f685b27');
    expect(query).toContain('pregnancyStatus=CONFIRMED');
    expect(query).not.toContain('animalId=');
  });
});

describe('período dos relatórios',()=>{
  it('aceita datas inclusivas e rejeita ordem invertida',()=>{
    expect(periodIssue('2026-09-01','2026-09-17')).toBe('');
    expect(periodIssue('2026-09-18','2026-09-17')).toContain('inicial');
  });
  it('respeita o limite real de 3.650 dias do backend',()=>{
    expect(periodIssue('2016-09-21','2026-09-17')).toBe('');
    expect(periodIssue('2016-09-19','2026-09-17')).toContain('3.650');
  });
  it('restaura estado válido da URL e sanitiza valores inválidos',()=>{
    const filters=parseFilters(convertToParamMap({report:'health',from:'2026-09-01',to:'2026-09-17',treatmentType:'VACCINATION',animalId:'31fd93ce-60ef-4e30-bcea-94315f685b27',page:'2',size:'50'}));
    expect(filters).toMatchObject({report:'health',from:'2026-09-01',to:'2026-09-17',treatmentType:'VACCINATION',page:2,size:50});
    expect(parseFilters(convertToParamMap({report:'finance',animalId:'inválido',page:'-1'}))).toMatchObject({report:'herd-position',animalId:'',page:0});
  });
});
