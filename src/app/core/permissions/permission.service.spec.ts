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
  it('mantém VIEWER somente leitura', () => expect(create('VIEWER').can('mutateFinance')).toBe(false));
});
