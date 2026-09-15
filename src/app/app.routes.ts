import { Routes } from '@angular/router';
import { environment } from '../environments/environment';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { contextGuard } from './core/guards/context.guard';
import { permissionGuard } from './core/guards/permission.guard';

const placeholder = () => import('./features/placeholder/feature-placeholder.component').then((m) => m.FeaturePlaceholderComponent);

export const routes: Routes = [
  { path: 'entrar', canActivate: [guestGuard], loadComponent: () => import('./features/auth/login-page.component').then((m) => m.LoginPageComponent) },
  ...(environment.production ? [] : [{ path: 'dev/design-system', loadComponent: () => import('./features/design-system/design-system-page.component').then((m) => m.DesignSystemPageComponent) } satisfies Routes[number]]),
  {
    path: '',
    loadComponent: () => import('./layout/app-shell.component').then((m) => m.AppShellComponent),
    canActivate: [authGuard, contextGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'visao-geral' },
      { path: 'visao-geral', loadComponent: () => import('./features/home/home-page.component').then((m) => m.HomePageComponent) },
      { path: 'rebanho/animais', data: { title: 'Animais', phase: 'Phase 03 — Herd Core' }, loadComponent: placeholder },
      { path: 'rebanho/movimentacoes', data: { title: 'Movimentações', phase: 'Phase 04 — Herd Intelligence & Operations' }, loadComponent: placeholder },
      { path: 'rebanho/saude', data: { title: 'Saúde', phase: 'Phase 04 — Herd Intelligence & Operations' }, loadComponent: placeholder },
      { path: 'rebanho/reproducao', data: { title: 'Reprodução', phase: 'Phase 04 — Herd Intelligence & Operations' }, loadComponent: placeholder },
      { path: 'rebanho/agenda', data: { title: 'Agenda', phase: 'Phase 04 — Herd Intelligence & Operations' }, loadComponent: placeholder },
      { path: 'operacao/estoque', data: { title: 'Estoque', phase: 'Phase 05 — Inventory & Inputs' }, loadComponent: placeholder },
      { path: 'operacao/financeiro', data: { title: 'Financeiro', phase: 'Phase 06 — Rural Finance' }, loadComponent: placeholder },
      { path: 'gestao/fazendas', data: { title: 'Fazendas', phase: 'Phase 07 — SaaS Administration' }, loadComponent: placeholder },
      { path: 'gestao/usuarios', data: { title: 'Usuários', phase: 'Phase 07 — SaaS Administration', permission: 'manageUsers' }, canActivate: [permissionGuard], loadComponent: placeholder },
      { path: 'gestao/configuracoes', data: { title: 'Configurações', phase: 'Phase 07 — SaaS Administration' }, loadComponent: placeholder },
    ],
  },
  { path: '**', redirectTo: '' },
];
