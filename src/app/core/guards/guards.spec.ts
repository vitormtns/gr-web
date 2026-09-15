import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { AuthStore } from '../auth/auth.store';
import { ContextStore } from '../context/context.store';
import { PermissionService } from '../permissions/permission.service';
import { authGuard, guestGuard } from './auth.guard';
import { contextGuard } from './context.guard';
import { permissionGuard } from './permission.guard';

const route={} as ActivatedRouteSnapshot;
const state={url:'/visao-geral'} as RouterStateSnapshot;

describe('route guards',()=>{
  it('envia usuário anônimo para o login com retorno',async()=>{const router={createUrlTree:vi.fn(()=> 'login')};TestBed.configureTestingModule({providers:[{provide:AuthStore,useValue:{initialize:()=>Promise.resolve(),isAuthenticated:()=>false}},{provide:Router,useValue:router}]});const result=await TestBed.runInInjectionContext(()=>authGuard(route,state));expect(result).toBe('login');expect(router.createUrlTree).toHaveBeenCalledWith(['/entrar'],{queryParams:{retorno:'/visao-geral'}});});
  it('permite que uma sessão autenticada entre no shell',async()=>{TestBed.configureTestingModule({providers:[{provide:AuthStore,useValue:{initialize:()=>Promise.resolve(),isAuthenticated:()=>true}},{provide:Router,useValue:{}}]});expect(await TestBed.runInInjectionContext(()=>authGuard(route,state))).toBe(true);});
  it('evita exibir login para sessão autenticada',async()=>{TestBed.configureTestingModule({providers:[{provide:AuthStore,useValue:{initialize:()=>Promise.resolve(),isAuthenticated:()=>true}},{provide:Router,useValue:{createUrlTree:()=> 'home'}}]});expect(await TestBed.runInInjectionContext(()=>guestGuard(route,state))).toBe('home');});
  it('aguarda a restauração do JWT antes de carregar o contexto',async()=>{let release!:()=>void;const pending=new Promise<void>(resolve=>release=resolve);const initialize=vi.fn(()=>Promise.resolve());TestBed.configureTestingModule({providers:[{provide:AuthStore,useValue:{initialize:()=>pending,isAuthenticated:()=>true}},{provide:ContextStore,useValue:{initialize}},{provide:Router,useValue:{}}]});const activation=TestBed.runInInjectionContext(()=>contextGuard(route,state));expect(initialize).not.toHaveBeenCalled();release();expect(await activation).toBe(true);expect(initialize).toHaveBeenCalledOnce();});
  it('não consulta o contexto quando a sessão restaurada é anônima',async()=>{const initialize=vi.fn();const router={createUrlTree:vi.fn(()=> 'login')};TestBed.configureTestingModule({providers:[{provide:AuthStore,useValue:{initialize:()=>Promise.resolve(),isAuthenticated:()=>false}},{provide:ContextStore,useValue:{initialize}},{provide:Router,useValue:router}]});expect(await TestBed.runInInjectionContext(()=>contextGuard(route,state))).toBe('login');expect(initialize).not.toHaveBeenCalled();expect(router.createUrlTree).toHaveBeenCalledWith(['/entrar'],{queryParams:{retorno:'/visao-geral'}});});
  it('bloqueia rota sem permissão e retorna à visão geral',()=>{const restricted={data:{permission:'manageUsers'}} as unknown as ActivatedRouteSnapshot;TestBed.configureTestingModule({providers:[{provide:PermissionService,useValue:{can:()=>false}},{provide:Router,useValue:{createUrlTree:()=> 'home'}}]});expect(TestBed.runInInjectionContext(()=>permissionGuard(restricted,state))).toBe('home');});
});
