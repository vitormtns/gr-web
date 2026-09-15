import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthStore } from '../auth/auth.store';
import { ContextStore } from '../context/context.store';
import { REQUIRES_TENANT_CONTEXT } from './api-client.service';
import { apiBaseUrlInterceptor, apiErrorInterceptor, authTokenInterceptor, tenantContextInterceptor } from './api.interceptors';

describe('interceptors de API',()=>{
  let http:HttpClient;let controller:HttpTestingController;const farm=signal<{farmId:string}|null>({farmId:'farm-a'});
  beforeEach(()=>{TestBed.configureTestingModule({providers:[provideHttpClient(withInterceptors([apiBaseUrlInterceptor,authTokenInterceptor,tenantContextInterceptor])),provideHttpClientTesting(),{provide:AuthStore,useValue:{getAccessToken:()=> 'jwt-token'}},{provide:ContextStore,useValue:{selectedOrganization:signal({organizationId:'org-a'}),selectedFarm:farm}}]});http=TestBed.inject(HttpClient);controller=TestBed.inject(HttpTestingController);farm.set({farmId:'farm-a'});});
  afterEach(()=>controller.verify());
  it('anexa JWT a requests do gr-service',()=>{http.get('/api/v1/me').subscribe();const req=controller.expectOne('http://localhost:8080/api/v1/me');expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-token');req.flush({});});
  it('anexa organization e farm somente quando o contrato exige contexto',()=>{const context=new HttpContext().set(REQUIRES_TENANT_CONTEXT,true);http.get('/api/v1/context',{context}).subscribe();const req=controller.expectOne('http://localhost:8080/api/v1/context');expect(req.request.headers.get('X-Organization-Id')).toBe('org-a');expect(req.request.headers.get('X-Farm-Id')).toBe('farm-a');req.flush({});});
  it('não envia farm antiga depois da limpeza de contexto',()=>{farm.set(null);const context=new HttpContext().set(REQUIRES_TENANT_CONTEXT,true);http.get('/api/v1/herd/animals',{context}).subscribe();const req=controller.expectOne('http://localhost:8080/api/v1/herd/animals');expect(req.request.headers.has('X-Farm-Id')).toBe(false);req.flush({});});
  it('não envia JWT ou contexto para URL externa com prefixo parecido',()=>{const context=new HttpContext().set(REQUIRES_TENANT_CONTEXT,true);http.get('http://localhost:8080.evil.test/api/v1/me',{context}).subscribe();const req=controller.expectOne('http://localhost:8080.evil.test/api/v1/me');expect(req.request.headers.has('Authorization')).toBe(false);expect(req.request.headers.has('X-Organization-Id')).toBe(false);expect(req.request.headers.has('X-Farm-Id')).toBe(false);req.flush({});});
  it('usa somente a nova fazenda nas requests após a troca',()=>{farm.set({farmId:'farm-b'});const context=new HttpContext().set(REQUIRES_TENANT_CONTEXT,true);http.get('/api/v1/context',{context}).subscribe();const req=controller.expectOne('http://localhost:8080/api/v1/context');expect(req.request.headers.get('X-Farm-Id')).toBe('farm-b');expect(req.request.headers.get('X-Farm-Id')).not.toBe('farm-a');req.flush({});});
});

describe('interceptor central de erros',()=>{
  let http:HttpClient;let controller:HttpTestingController;
  let auth:{getAccessToken:ReturnType<typeof vi.fn>;isAuthenticated:ReturnType<typeof vi.fn>;signOut:ReturnType<typeof vi.fn>;clearSession:ReturnType<typeof vi.fn>};
  let context:{clear:ReturnType<typeof vi.fn>};let router:{navigate:ReturnType<typeof vi.fn>};
  beforeEach(()=>{auth={getAccessToken:vi.fn(()=> 'jwt-token'),isAuthenticated:vi.fn(()=>true),signOut:vi.fn().mockResolvedValue(undefined),clearSession:vi.fn()};context={clear:vi.fn()};router={navigate:vi.fn().mockResolvedValue(true)};TestBed.configureTestingModule({providers:[provideHttpClient(withInterceptors([apiBaseUrlInterceptor,authTokenInterceptor,apiErrorInterceptor])),provideHttpClientTesting(),{provide:AuthStore,useValue:auth},{provide:ContextStore,useValue:context},{provide:Router,useValue:router}]});http=TestBed.inject(HttpClient);controller=TestBed.inject(HttpTestingController);});
  afterEach(()=>controller.verify());
  it('limpa autenticação e contexto quando a API retorna 401',()=>{const failure=vi.fn();http.get('/api/v1/me').subscribe({error:failure});controller.expectOne('http://localhost:8080/api/v1/me').flush({code:'AUTH_INVALID',status:401},{status:401,statusText:'Unauthorized'});expect(failure.mock.calls[0][0].kind).toBe('unauthorized');expect(auth.signOut).toHaveBeenCalled();expect(context.clear).toHaveBeenCalled();expect(router.navigate).toHaveBeenCalledWith(['/entrar'],{queryParams:{motivo:'sessao-expirada'}});});
  it('classifica backend indisponível sem remover uma sessão válida',()=>{const failure=vi.fn();http.get('/api/v1/me').subscribe({error:failure});controller.expectOne('http://localhost:8080/api/v1/me').error(new ProgressEvent('error'));expect(failure.mock.calls[0][0].kind).toBe('unavailable');expect(auth.signOut).not.toHaveBeenCalled();expect(context.clear).not.toHaveBeenCalled();});
});
