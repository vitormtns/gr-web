import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ContextStore } from '../context/context.store';
import { AuthStore } from '../auth/auth.store';

export const contextGuard: CanActivateFn = async () => {
  const context = inject(ContextStore);
  const router = inject(Router);
  const auth = inject(AuthStore);
  try {
    await context.initialize();
    return true;
  } catch {
    return auth.isAuthenticated()
      ? true
      : router.createUrlTree(['/entrar'], { queryParams: { motivo: 'sessao-expirada' } });
  }
};
