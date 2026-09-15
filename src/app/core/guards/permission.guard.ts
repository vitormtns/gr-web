import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Permission, PermissionService } from '../permissions/permission.service';

export const permissionGuard: CanActivateFn = (route) => {
  const permission = route.data['permission'] as Permission | undefined;
  if (!permission || inject(PermissionService).can(permission)) return true;
  return inject(Router).createUrlTree(['/visao-geral'], { queryParams: { aviso: 'acesso-negado' } });
};
