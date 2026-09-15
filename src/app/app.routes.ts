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
      { path: 'rebanho/animais', data: { title: 'Animais', phase: 'Etapa 03 — Rebanho' }, loadComponent: placeholder },
      { path: 'rebanho/movimentacoes', data: { title: 'Movimentações', phase: 'Etapa 04 — Inteligência e operação do rebanho' }, loadComponent: placeholder },
      { path: 'rebanho/saude', data: { title: 'Saúde', phase: 'Etapa 04 — Inteligência e operação do rebanho' }, loadComponent: placeholder },
      { path: 'rebanho/reproducao', data: { title: 'Reprodução', phase: 'Etapa 04 — Inteligência e operação do rebanho' }, loadComponent: placeholder },
      { path: 'rebanho/agenda', data: { title: 'Agenda', phase: 'Etapa 04 — Inteligência e operação do rebanho' }, loadComponent: placeholder },
      { path: 'operacao/estoque', data: { title: 'Estoque', phase: 'Etapa 05 — Estoque e insumos' }, loadComponent: placeholder },
      { path: 'operacao/financeiro', data: { title: 'Financeiro', phase: 'Etapa 06 — Finanças rurais' }, loadComponent: placeholder },
      { path: 'gestao/fazendas', data: { title: 'Fazendas', phase: 'Etapa 07 — Administração' }, loadComponent: placeholder },
      { path: 'gestao/usuarios', data: { title: 'Usuários', phase: 'Etapa 07 — Administração', permission: 'manageUsers' }, canActivate: [permissionGuard], loadComponent: placeholder },
      { path: 'gestao/configuracoes', data: { title: 'Configurações', phase: 'Etapa 07 — Administração' }, loadComponent: placeholder },
    ],
  },
  { path: '**', redirectTo: '' },
];
