import { HttpClient, HttpContext, HttpContextToken } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export const REQUIRES_TENANT_CONTEXT = new HttpContextToken<boolean>(() => false);

@Injectable({ providedIn: 'root' })
export class ApiClient {
  constructor(private readonly http: HttpClient) {}

  get<T>(path: string, requiresContext = false): Observable<T> {
    return this.http.get<T>(path, {
      context: new HttpContext().set(REQUIRES_TENANT_CONTEXT, requiresContext),
    });
  }

  /** Consulta uma fazenda de destino sem alterar o contexto operacional do usuário. */
  getInFarm<T>(path: string, organizationId: string, farmId: string): Observable<T> {
    if (!path.startsWith('/api/v1/')) throw new Error('A consulta contextual deve usar a API do portal.');
    return this.http.get<T>(path, {
      headers: { 'X-Organization-Id': organizationId, 'X-Farm-Id': farmId },
    });
  }

  requestText(method: 'GET' | 'POST' | 'PATCH', path: string, body: unknown = undefined, requiresContext = false): Observable<string> {
    return this.http.request(method, path, {
      body, responseType: 'text',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      context: new HttpContext().set(REQUIRES_TENANT_CONTEXT, requiresContext),
    });
  }

  post<T>(path: string, body: unknown, requiresContext = false): Observable<T> {
    return this.http.post<T>(path, body, {
      context: new HttpContext().set(REQUIRES_TENANT_CONTEXT, requiresContext),
    });
  }

  patch<T>(path: string, body: unknown, requiresContext = false): Observable<T> {
    return this.http.patch<T>(path, body, {
      context: new HttpContext().set(REQUIRES_TENANT_CONTEXT, requiresContext),
    });
  }

  put<T>(path: string, body: unknown, requiresContext = false): Observable<T> {
    return this.http.put<T>(path, body, { context: new HttpContext().set(REQUIRES_TENANT_CONTEXT, requiresContext) });
  }

  delete<T>(path: string, requiresContext = false, body?: unknown): Observable<T> {
    return this.http.delete<T>(path, {
      body,
      context: new HttpContext().set(REQUIRES_TENANT_CONTEXT, requiresContext),
    });
  }
}
