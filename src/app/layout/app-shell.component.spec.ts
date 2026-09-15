import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { AuthStore } from '../core/auth/auth.store';
import { ContextStore } from '../core/context/context.store';
import { PermissionService } from '../core/permissions/permission.service';
import { ToastService } from '../design-system/feedback/feedback';
import { AppShellComponent } from './app-shell.component';

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
});
