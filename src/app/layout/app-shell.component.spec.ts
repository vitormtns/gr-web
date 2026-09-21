import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { AuthStore } from '../core/auth/auth.store';
import { ContextStore } from '../core/context/context.store';
import { PermissionService } from '../core/permissions/permission.service';
import { ToastService } from '../design-system/feedback/feedback';
import { AppShellComponent } from './app-shell.component';
import { appConfig } from '../app.config';

@Component({ template: '' })
class EmptyRouteComponent {}

function shellHarness() {
  const status = signal<'authenticated' | 'anonymous'>('authenticated');
  const context = { clear: vi.fn() };
  const auth = { status, signOut: vi.fn(async () => { status.set('anonymous'); }) };
  const router = { navigate: vi.fn().mockResolvedValue(true) };
  const toast = { show: vi.fn() };
  const shell = TestBed.runInInjectionContext(() => new AppShellComponent(
    context as unknown as ContextStore,
    {} as PermissionService,
    auth as unknown as AuthStore,
    router as unknown as Router,
    toast as unknown as ToastService,
  ));
  return { shell, status, context, auth, router };
}

describe('AppShellComponent', () => {
  it('limpa o contexto e retorna ao login após logout explícito', async () => {
    const harness = shellHarness();
    await harness.shell.logout();
    TestBed.tick();
    expect(harness.auth.signOut).toHaveBeenCalled();
    expect(harness.context.clear).toHaveBeenCalled();
    expect(harness.router.navigate).toHaveBeenCalledWith(['/entrar']);
    expect(harness.router.navigate).not.toHaveBeenCalledWith(['/entrar'], {
      queryParams: { motivo: 'sessao-expirada' },
    });
  });

  it('limpa o contexto se o Supabase encerrar a sessão externamente', () => {
    const harness = shellHarness();
    harness.status.set('anonymous');
    TestBed.tick();
    expect(harness.context.clear).toHaveBeenCalled();
    expect(harness.router.navigate).toHaveBeenCalledWith(['/entrar'], {
      queryParams: { motivo: 'sessao-expirada' },
    });
  });

  it('marca a navegação ativa e oculta o conteúdo anterior durante a troca de contexto', async () => {
    const pending = signal(false);
    const context = {
      status: signal('ready'), retry: vi.fn(),
      transitionPending: pending,
      organizations: signal([]), farms: signal([]), selectedOrganization: signal(null), selectedFarm: signal(null),
      user: signal({ displayName: 'Vítor Martins', email: 'vitor@fazenda.com.br' }), role: signal('OWNER'), clear: vi.fn(),
    };
    TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [
        ...appConfig.providers.filter(provider => provider && typeof provider === 'object' && !('ɵproviders' in provider)),
        provideRouter([{ path: 'visao-geral', component: EmptyRouteComponent }]),
        { provide: ContextStore, useValue: context },
        { provide: AuthStore, useValue: { status: signal('authenticated'), userEmail: signal('vitor@fazenda.com.br') } },
        { provide: PermissionService, useValue: { can: () => true } },
        { provide: ToastService, useValue: { show: vi.fn(), toasts: signal([]) } },
      ],
    });
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/visao-geral');
    await fixture.whenStable();
    fixture.detectChanges();
    const active = fixture.nativeElement.querySelector('a[href="/visao-geral"]') as HTMLAnchorElement;
    expect(active.getAttribute('aria-current')).toBe('page');
    expect(fixture.nativeElement.querySelector('.account-trigger strong')?.textContent).toBe('Vítor Martins');
    pending.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('main')?.getAttribute('aria-busy')).toBe('true');
    expect(fixture.nativeElement.querySelector('.route-content.context-hidden')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Atualizando contexto');
  });

  it('usa os assets oficiais da marca conforme o estado do menu', async () => {
    const pending = signal(false);
    const context = {
      status: signal('ready'), retry: vi.fn(),
      transitionPending: pending,
      organizations: signal([]), farms: signal([]), selectedOrganization: signal(null), selectedFarm: signal(null),
      user: signal({ displayName: 'Vítor Martins', email: 'vitor@fazenda.com.br' }), role: signal('OWNER'), clear: vi.fn(),
    };
    TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [
        ...appConfig.providers.filter(provider => provider && typeof provider === 'object' && !('ɵproviders' in provider)),
        provideRouter([{ path: 'visao-geral', component: EmptyRouteComponent }]),
        { provide: ContextStore, useValue: context },
        { provide: AuthStore, useValue: { status: signal('authenticated'), userEmail: signal('vitor@fazenda.com.br') } },
        { provide: PermissionService, useValue: { can: () => true } },
        { provide: ToastService, useValue: { show: vi.fn(), toasts: signal([]) } },
      ],
    });
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    const full = fixture.nativeElement.querySelector('.brand-logo-full') as HTMLImageElement;
    expect(full?.getAttribute('src')).toBe('/images/brand/ebov/sidebar-logo.png');
    expect(full?.getAttribute('alt')).toBe('eBov');
    expect(fixture.nativeElement.querySelector('.brand .brand-fallback-name')).toBeNull();
    expect(fixture.nativeElement.querySelector('.brand .brand-badge')?.textContent).toBe('PRO');
    fixture.componentInstance.collapsed.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.brand-logo-full')).toBeNull();
    const symbol = fixture.nativeElement.querySelector('.brand-logo-symbol') as HTMLImageElement;
    expect(symbol?.getAttribute('src')).toBe('/images/brand/ebov/symbol.svg');
    expect(symbol?.getAttribute('alt')).toBe('eBov');
    fixture.componentInstance.collapsed.set(false);
    fixture.detectChanges();
    const reloaded = fixture.nativeElement.querySelector('.brand-logo-full') as HTMLImageElement;
    reloaded.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.brand-logo-full')).toBeNull();
    expect(fixture.nativeElement.querySelector('.brand .brand-fallback-name')?.textContent).toBe('eBov');
    expect(fixture.nativeElement.querySelector('.brand .brand-badge')?.textContent).toBe('PRO');
  });
});
