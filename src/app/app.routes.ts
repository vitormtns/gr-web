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
      { path: 'rebanho/animais', data: { title: 'Animais' }, loadComponent: placeholder },
      { path: 'rebanho/movimentacoes', data: { title: 'Movimentações' }, loadComponent: placeholder },
      { path: 'rebanho/saude', data: { title: 'Saúde' }, loadComponent: placeholder },
      { path: 'rebanho/reproducao', data: { title: 'Reprodução' }, loadComponent: placeholder },
      { path: 'rebanho/agenda', data: { title: 'Agenda' }, loadComponent: placeholder },
      { path: 'operacao/estoque', data: { title: 'Estoque' }, loadComponent: placeholder },
      { path: 'operacao/financeiro', data: { title: 'Financeiro' }, loadComponent: placeholder },
      { path: 'gestao/fazendas', data: { title: 'Fazendas' }, loadComponent: placeholder },
      { path: 'gestao/usuarios', data: { title: 'Usuários', permission: 'manageUsers' }, canActivate: [permissionGuard], loadComponent: placeholder },
      { path: 'gestao/configuracoes', data: { title: 'Configurações' }, loadComponent: placeholder },
    ],
  },
  { path: '**', redirectTo: '' },
];
