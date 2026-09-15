import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ContextStore } from '../context/context.store';
import { AuthStore } from '../auth/auth.store';

export const contextGuard: CanActivateFn = async (_, state) => {
  const context = inject(ContextStore);
  const router = inject(Router);
  const auth = inject(AuthStore);
  // Guards no mesmo canActivate podem iniciar em paralelo; o contexto nunca deve
  // requisitar a API antes de o token persistido ser restaurado.
  await auth.initialize();
  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/entrar'], { queryParams: { retorno: state.url } });
  }
  try {
    await context.initialize();
    return true;
  } catch {
    return auth.isAuthenticated()
      ? true
      : router.createUrlTree(['/entrar'], { queryParams: { motivo: 'sessao-expirada' } });
  }
};
