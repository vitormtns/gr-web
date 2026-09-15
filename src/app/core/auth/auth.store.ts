import { Inject, Injectable, computed, signal } from '@angular/core';
import { AuthError, Session, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from './supabase-client';

export type AuthStatus = 'idle' | 'restoring' | 'authenticated' | 'anonymous';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private initialization?: Promise<void>;

  readonly session = signal<Session | null>(null);
  readonly status = signal<AuthStatus>('idle');
  readonly isAuthenticated = computed(() => this.status() === 'authenticated' && !!this.session());
  readonly userEmail = computed(() => this.session()?.user.email ?? '');

  constructor(@Inject(SUPABASE_CLIENT) private readonly client: SupabaseClient) {
    this.client.auth.onAuthStateChange((event, session) => {
      this.session.set(session);
      this.status.set(session ? 'authenticated' : 'anonymous');
      if (event === 'TOKEN_REFRESHED' && !session) this.status.set('anonymous');
    });
  }

  initialize(): Promise<void> {
    if (this.initialization) return this.initialization;
    this.status.set('restoring');
    this.initialization = this.client.auth.getSession().then(({ data, error }) => {
      if (error) throw error;
      this.session.set(data.session);
      this.status.set(data.session ? 'authenticated' : 'anonymous');
    }).catch(() => {
      this.session.set(null);
      this.status.set('anonymous');
    });
    return this.initialization;
  }

  async signIn(email: string, password: string): Promise<void> {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw this.friendlyAuthError(error);
    this.session.set(data.session);
    this.status.set('authenticated');
  }

  async signOut(): Promise<void> {
    await this.client.auth.signOut({ scope: 'local' });
    this.clearSession();
  }

  clearSession(): void {
    this.session.set(null);
    this.status.set('anonymous');
  }

  getAccessToken(): string | null {
    return this.session()?.access_token ?? null;
  }

  private friendlyAuthError(error: AuthError): Error {
    if (error.status === 400 || error.status === 401) return new Error('Usuário ou senha inválidos.');
    if (error.status === 429) return new Error('Muitas tentativas. Aguarde um momento e tente novamente.');
    return new Error('Não foi possível entrar agora. Tente novamente.');
  }
}
