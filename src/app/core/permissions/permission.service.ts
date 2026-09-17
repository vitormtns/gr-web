import { Injectable, computed } from '@angular/core';
import { ContextStore } from '../context/context.store';
import { MembershipRole } from '../api/api.models';

export type Permission = 'viewAdministration' | 'manageOrganization' | 'manageUsers' | 'manageFarms' | 'mutateHerd' | 'transferHerd' | 'sellHerd' | 'mutateInventory' | 'mutateFinance';

const permissions: Record<Permission, readonly MembershipRole[]> = {
  viewAdministration: ['OWNER', 'ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'],
  manageOrganization: ['OWNER'],
  manageUsers: ['OWNER', 'ADMIN'],
  manageFarms: ['OWNER', 'ADMIN'],
  mutateHerd: ['OWNER', 'ADMIN', 'MANAGER', 'OPERATOR'],
  transferHerd: ['OWNER', 'ADMIN', 'MANAGER'],
  sellHerd: ['OWNER', 'ADMIN', 'MANAGER'],
  mutateInventory: ['OWNER', 'ADMIN', 'MANAGER', 'OPERATOR'],
  mutateFinance: ['OWNER', 'ADMIN', 'MANAGER', 'OPERATOR'],
};

@Injectable({ providedIn: 'root' })
export class PermissionService {
  readonly canManageUsers = computed(() => this.can('manageUsers'));
  readonly canViewAdministration = computed(() => this.can('viewAdministration'));
  readonly canManageOrganization = computed(() => this.can('manageOrganization'));
  readonly canManageFarms = computed(() => this.can('manageFarms'));
  readonly canMutateHerd = computed(() => this.can('mutateHerd'));
  readonly canTransferHerd = computed(() => this.can('transferHerd'));
  readonly canSellHerd = computed(() => this.can('sellHerd'));
  readonly canMutateInventory = computed(() => this.can('mutateInventory'));
  readonly canMutateFinance = computed(() => this.can('mutateFinance'));

  constructor(private readonly context: ContextStore) {}

  can(permission: Permission): boolean {
    const role = this.context.role();
    return role ? permissions[permission].includes(role) : false;
  }
}
