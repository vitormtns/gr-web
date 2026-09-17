import { describe, expect, it } from 'vitest';
import { AdminFarm, accessSummary, canManageMember, roleDescriptions, roleLabels } from './administration.models';

const farms:AdminFarm[]=[
  {id:'farm-a',organizationId:'org-a',name:'Santa Helena',status:'ACTIVE',version:0},
  {id:'farm-b',organizationId:'org-a',name:'São Bento',status:'ACTIVE',version:0},
  {id:'farm-c',organizationId:'org-a',name:'Horizonte',status:'ACTIVE',version:0},
];

describe('linguagem de acesso administrativo',()=>{
  it('traduz papéis técnicos sem alterar sua semântica e preserva a nomenclatura do Portal',()=>{expect(roleLabels).toMatchObject({OWNER:'Proprietário',ADMIN:'Administrador',MANAGER:'Gerente',OPERATOR:'Operador',VIEWER:'Visualizador'});expect(roleDescriptions.ADMIN).toContain('proprietários e administradores');});
  it('explica todas as fazendas sem renderizar checkboxes redundantes',()=>expect(accessSummary('ALL_FARMS',[],farms)).toBe('Todas as fazendas'));
  it('resume escopo selecionado por nomes e escala para listas maiores',()=>{expect(accessSummary('SELECTED_FARMS',['farm-a','farm-b'],farms)).toBe('Santa Helena, São Bento');expect(accessSummary('SELECTED_FARMS',['farm-a','farm-b','farm-c'],farms)).toBe('3 fazendas · Santa Helena, São Bento e mais 1');});
});

describe('proteção hierárquica no frontend',()=>{
  it('permite ao proprietário administrar qualquer papel',()=>expect(canManageMember('OWNER','OWNER')).toBe(true));
  it('impede administrador de editar proprietário ou outro administrador',()=>{expect(canManageMember('ADMIN','OWNER')).toBe(false);expect(canManageMember('ADMIN','ADMIN')).toBe(false);expect(canManageMember('ADMIN','MANAGER')).toBe(true);});
  it('não oferece mutação de pessoas a papéis operacionais',()=>expect(canManageMember('MANAGER','VIEWER')).toBe(false));
});
