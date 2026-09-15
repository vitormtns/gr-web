import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthStore } from '../../core/auth/auth.store';
import { ContextStore } from '../../core/context/context.store';
import { LoginPageComponent } from './login-page.component';

describe('LoginPageComponent', () => {
  let auth: { signIn: ReturnType<typeof vi.fn>; isAuthenticated: ReturnType<typeof vi.fn> };
  let context: { clear: ReturnType<typeof vi.fn>; initialize: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn>; navigateByUrl: ReturnType<typeof vi.fn> };
  let returnUrl: string | null;

  beforeEach(() => {
    returnUrl = null;
    auth = { signIn: vi.fn().mockResolvedValue(undefined), isAuthenticated: vi.fn(() => true) };
    context = { clear: vi.fn(), initialize: vi.fn().mockResolvedValue(undefined) };
    router = { navigate: vi.fn().mockResolvedValue(true), navigateByUrl: vi.fn().mockResolvedValue(true) };
    TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [
        { provide: AuthStore, useValue: auth },
        { provide: ContextStore, useValue: context },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: {
          snapshot: { queryParamMap: { get: (key: string) => key === 'retorno' ? returnUrl : null } },
        } },
      ],
    });
  });

  it('mostra o formulário com textos naturais em português', () => {
    const fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();
    const content = fixture.nativeElement.textContent as string;
    expect(content).toContain('Entre no portal');
    expect(content).toContain('Organizações, fazendas e operações');
    expect(content).toContain('Senha');
    expect(fixture.nativeElement.querySelector('.access h1')?.textContent).toBe('Entre no portal');
  });

  it('não confunde falha de contexto com credenciais inválidas após autenticar', async () => {
    context.initialize.mockRejectedValue(new Error('Serviço indisponível'));
    const fixture = TestBed.createComponent(LoginPageComponent);
    fixture.componentInstance.form.setValue({ email: 'gestor@fazenda.com.br', password: 'senha-segura' });
    await fixture.componentInstance.submit();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
    expect(fixture.componentInstance.error()).toBe('');
  });

  it('ignora URL de retorno que começa com duas barras', async () => {
    returnUrl = '//evil.test';
    const fixture = TestBed.createComponent(LoginPageComponent);
    fixture.componentInstance.form.setValue({ email: 'gestor@fazenda.com.br', password: 'senha-segura' });
    await fixture.componentInstance.submit();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });
});
