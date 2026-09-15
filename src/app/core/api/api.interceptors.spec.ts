import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AuthStore } from '../auth/auth.store';
import { ContextStore } from '../context/context.store';
import { REQUIRES_TENANT_CONTEXT } from './api-client.service';
import { apiBaseUrlInterceptor, authTokenInterceptor, tenantContextInterceptor } from './api.interceptors';

describe('interceptors de API',()=>{
  let http:HttpClient;let controller:HttpTestingController;const farm=signal<{farmId:string}|null>({farmId:'farm-a'});
  beforeEach(()=>{TestBed.configureTestingModule({providers:[provideHttpClient(withInterceptors([apiBaseUrlInterceptor,authTokenInterceptor,tenantContextInterceptor])),provideHttpClientTesting(),{provide:AuthStore,useValue:{getAccessToken:()=> 'jwt-token'}},{provide:ContextStore,useValue:{selectedOrganization:signal({organizationId:'org-a'}),selectedFarm:farm}}]});http=TestBed.inject(HttpClient);controller=TestBed.inject(HttpTestingController);farm.set({farmId:'farm-a'});});
  afterEach(()=>controller.verify());
  it('anexa JWT a requests do gr-service',()=>{http.get('/api/v1/me').subscribe();const req=controller.expectOne('http://localhost:8080/api/v1/me');expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-token');req.flush({});});
  it('anexa organization e farm somente quando o contrato exige contexto',()=>{const context=new HttpContext().set(REQUIRES_TENANT_CONTEXT,true);http.get('/api/v1/context',{context}).subscribe();const req=controller.expectOne('http://localhost:8080/api/v1/context');expect(req.request.headers.get('X-Organization-Id')).toBe('org-a');expect(req.request.headers.get('X-Farm-Id')).toBe('farm-a');req.flush({});});
  it('não envia farm antiga depois da limpeza de contexto',()=>{farm.set(null);const context=new HttpContext().set(REQUIRES_TENANT_CONTEXT,true);http.get('/api/v1/herd/animals',{context}).subscribe();const req=controller.expectOne('http://localhost:8080/api/v1/herd/animals');expect(req.request.headers.has('X-Farm-Id')).toBe(false);req.flush({});});
});
