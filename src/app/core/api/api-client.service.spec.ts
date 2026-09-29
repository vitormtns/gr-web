import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { expect, it } from 'vitest';
import { AuthStore } from '../auth/auth.store';
import { ContextStore } from '../context/context.store';
import { ApiClient } from './api-client.service';
import {
  apiBaseUrlInterceptor,
  authTokenInterceptor,
  tenantContextInterceptor,
} from './api.interceptors';

it('consulta fazenda autorizada de destino sem sobrescrever ou trocar o contexto atual', () => {
  const farm = signal({ farmId: 'source' });
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(
        withInterceptors([apiBaseUrlInterceptor, authTokenInterceptor, tenantContextInterceptor]),
      ),
      provideHttpClientTesting(),
      { provide: AuthStore, useValue: { getAccessToken: () => 'jwt' } },
      {
        provide: ContextStore,
        useValue: { selectedOrganization: signal({ organizationId: 'org' }), selectedFarm: farm },
      },
    ],
  });
  const api = TestBed.inject(ApiClient);
  const http = TestBed.inject(HttpTestingController);
  expect(() =>
    api.getInFarm('https://external.test/api/v1/herd/paddocks', 'org', 'destination'),
  ).toThrow();
  api.getInFarm('/api/v1/herd/paddocks', 'org', 'destination').subscribe();
  const request = http.expectOne('http://localhost:8080/api/v1/herd/paddocks');
  expect(request.request.method).toBe('GET');
  expect(request.request.headers.get('Authorization')).toBe('Bearer jwt');
  expect(request.request.headers.get('X-Farm-Id')).toBe('destination');
  expect(request.request.headers.get('X-Organization-Id')).toBe('org');
  expect(farm().farmId).toBe('source');
  request.flush({});
  http.verify();
});
