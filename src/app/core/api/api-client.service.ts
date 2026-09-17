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

  delete<T>(path: string, requiresContext = false): Observable<T> {
    return this.http.delete<T>(path, {
      context: new HttpContext().set(REQUIRES_TENANT_CONTEXT, requiresContext),
    });
  }
}
