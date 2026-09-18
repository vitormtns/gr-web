import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthStore } from '../auth/auth.store';
import { ContextStore } from '../context/context.store';
import { REQUIRES_TENANT_CONTEXT } from './api-client.service';
import { normalizeApiError } from './error-normalizer';

export const apiBaseUrlInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith('/api/')) return next(request);
  const baseUrl = environment.apiBaseUrl.replace(/\/$/, '');
  return next(request.clone({ url: `${baseUrl}${request.url}` }));
};

export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
  const token = inject(AuthStore).getAccessToken();
  const apiUrl = environment.apiBaseUrl.replace(/\/$/, '');
  if (!token || !request.url.startsWith(`${apiUrl}/api/`)) return next(request);
  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};

export const tenantContextInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.context.get(REQUIRES_TENANT_CONTEXT)) return next(request);
  const apiUrl = environment.apiBaseUrl.replace(/\/$/, '');
  if (!request.url.startsWith(`${apiUrl}/api/`)) return next(request);
  const context = inject(ContextStore);
  const organization = context.selectedOrganization();
  const farm = context.selectedFarm();
  if (!organization || !farm) return next(request);
  return next(request.clone({ setHeaders: {
    'X-Organization-Id': organization.organizationId,
    'X-Farm-Id': farm.farmId,
  } }));
};

export const apiErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthStore);
  const context = inject(ContextStore);
  const router = inject(Router);
  return next(request).pipe(catchError((error: unknown) => {
    if (!(error instanceof HttpErrorResponse)) return throwError(() => error);
    const normalized = normalizeApiError(error);
    if (normalized.status === 401 && auth.isAuthenticated()) {
      auth.clearSession();
      void auth.signOut().catch(() => undefined);
      context.clear();
      void router.navigate(['/entrar'], { queryParams: { motivo: 'sessao-expirada' } });
    }
    return throwError(() => normalized);
  }));
};
