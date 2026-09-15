import { TestBed } from '@angular/core/testing';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthStore } from './auth.store';
import { SUPABASE_CLIENT } from './supabase-client';

const session = { access_token:'token-seguro', user:{email:'gestor@fazenda.com.br'} } as unknown as Session;

describe('AuthStore', () => {
  let getSession:ReturnType<typeof vi.fn>;let signIn:ReturnType<typeof vi.fn>;let signOut:ReturnType<typeof vi.fn>;
  let authChange:(event:string,session:Session|null)=>void;
  beforeEach(() => {
    getSession=vi.fn().mockResolvedValue({data:{session},error:null});
    signIn=vi.fn().mockResolvedValue({data:{session},error:null});
    signOut=vi.fn().mockResolvedValue({error:null});
    const client={auth:{getSession,signInWithPassword:signIn,signOut,onAuthStateChange:vi.fn((callback:typeof authChange)=>{authChange=callback;return {data:{subscription:{unsubscribe:vi.fn()}}};})}} as unknown as SupabaseClient;
    TestBed.configureTestingModule({providers:[AuthStore,{provide:SUPABASE_CLIENT,useValue:client}]});
  });
  it('restaura uma sessão válida', async()=>{const store=TestBed.inject(AuthStore);await store.initialize();expect(store.isAuthenticated()).toBe(true);expect(store.getAccessToken()).toBe('token-seguro');});
  it('trata sessão ausente como anônima',async()=>{getSession.mockResolvedValue({data:{session:null},error:null});const store=TestBed.inject(AuthStore);await store.initialize();expect(store.status()).toBe('anonymous');});
  it('descarta uma sessão que não pode ser restaurada',async()=>{getSession.mockRejectedValue(new Error('sessão expirada'));const store=TestBed.inject(AuthStore);await store.initialize();expect(store.status()).toBe('anonymous');expect(store.session()).toBeNull();});
  it('autentica com e-mail e senha',async()=>{const store=TestBed.inject(AuthStore);await store.signIn('gestor@fazenda.com.br','senha');expect(signIn).toHaveBeenCalledWith({email:'gestor@fazenda.com.br',password:'senha'});expect(store.isAuthenticated()).toBe(true);});
  it('limpa a sessão no logout',async()=>{const store=TestBed.inject(AuthStore);await store.initialize();await store.signOut();expect(signOut).toHaveBeenCalledWith({scope:'local'});expect(store.session()).toBeNull();});
  it('substitui o JWT quando o Supabase renova a sessão',async()=>{const store=TestBed.inject(AuthStore);await store.initialize();authChange('TOKEN_REFRESHED',{...session,access_token:'token-renovado'});expect(store.getAccessToken()).toBe('token-renovado');expect(store.isAuthenticated()).toBe(true);});
  it('remove a sessão após evento externo de logout',async()=>{const store=TestBed.inject(AuthStore);await store.initialize();authChange('SIGNED_OUT',null);expect(store.getAccessToken()).toBeNull();expect(store.status()).toBe('anonymous');});
});
