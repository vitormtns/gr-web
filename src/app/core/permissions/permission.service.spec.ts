import { signal } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { MembershipRole } from '../api/api.models';
import { ContextStore } from '../context/context.store';
import { PermissionService } from './permission.service';

describe('PermissionService', () => {
  const create = (value: MembershipRole) => new PermissionService({role:signal<MembershipRole|null>(value)} as unknown as ContextStore);
  it.each(['OWNER','ADMIN'] as MembershipRole[])('permite gestão de usuários para %s', role => expect(create(role).can('manageUsers')).toBe(true));
  it.each(['MANAGER','OPERATOR','VIEWER'] as MembershipRole[])('nega gestão de usuários para %s', role => expect(create(role).can('manageUsers')).toBe(false));
  it.each(['OWNER','ADMIN','MANAGER','OPERATOR'] as MembershipRole[])('permite mutação operacional para %s', role => expect(create(role).can('mutateHerd')).toBe(true));
  it.each(['OWNER','ADMIN','MANAGER'] as MembershipRole[])('permite transferência de custódia para %s', role => expect(create(role).can('transferHerd')).toBe(true));
  it('mantém transferência indisponível para operador', () => expect(create('OPERATOR').can('transferHerd')).toBe(false));
  it.each(['OWNER','ADMIN','MANAGER'] as MembershipRole[])('permite administrar grupos para %s', role => expect(create(role).can('manageHerdGroups')).toBe(true));
  it.each(['OPERATOR','VIEWER'] as MembershipRole[])('nega administrar grupos para %s', role => expect(create(role).can('manageHerdGroups')).toBe(false));
  it('mantém VIEWER somente leitura', () => expect(create('VIEWER').can('mutateFinance')).toBe(false));
  it.each(['OWNER','ADMIN','MANAGER','OPERATOR','VIEWER'] as MembershipRole[])('permite leitura da administração para %s',role=>expect(create(role).can('viewAdministration')).toBe(true));
  it('limita a correção da organização ao proprietário',()=>{expect(create('OWNER').can('manageOrganization')).toBe(true);expect(create('ADMIN').can('manageOrganization')).toBe(false);});
  it.each(['OWNER','ADMIN','MANAGER'] as MembershipRole[])('permite administrar catálogos para %s', role => {
    expect(create(role).can('manageInventoryCatalog')).toBe(true);
    expect(create(role).can('manageFinanceCategories')).toBe(true);
  });
  it('operador movimenta estoque e lança valores sem administrar catálogos', () => {
    const service = create('OPERATOR');
    expect(service.can('mutateInventory')).toBe(true); expect(service.can('mutateFinance')).toBe(true);
    expect(service.can('manageInventoryCatalog')).toBe(false); expect(service.can('manageFinanceCategories')).toBe(false);
  });
  it('visualizador consulta catálogos sem alterações', () => {
    const service = create('VIEWER');
    for (const permission of ['mutateInventory','mutateFinance','manageInventoryCatalog','manageFinanceCategories'] as const) expect(service.can(permission)).toBe(false);
  });
});
