import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../auth/auth.store';

export const authGuard: CanActivateFn = async (_, state) => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  await auth.initialize();
  return auth.isAuthenticated()
    ? true
    : router.createUrlTree(['/entrar'], { queryParams: { retorno: state.url } });
};

export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  await auth.initialize();
  return auth.isAuthenticated() ? router.createUrlTree(['/']) : true;
};
