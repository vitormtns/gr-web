import { Routes } from '@angular/router';
import { environment } from '../environments/environment';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { contextGuard } from './core/guards/context.guard';
import { permissionGuard } from './core/guards/permission.guard';

const unsavedAnimalGuard = (component: { canDeactivate?: () => boolean }) => component.canDeactivate?.() ?? true;

const placeholder = () => import('./features/placeholder/feature-placeholder.component').then((m) => m.FeaturePlaceholderComponent);

export const routes: Routes = [
  { path: 'entrar', canActivate: [guestGuard], loadComponent: () => import('./features/auth/login-page.component').then((m) => m.LoginPageComponent) },
  ...(environment.production ? [] : [{ path: 'dev/design-system', loadComponent: () => import('./features/design-system/design-system-page.component').then((m) => m.DesignSystemPageComponent) } satisfies Routes[number]]),
  ...(environment.production ? [] : [{ path: 'dev/dashboard', loadChildren: () => import('./features/home/dashboard-showcase.routes').then((m) => m.dashboardShowcaseRoutes) } satisfies Routes[number]]),
  ...(environment.production ? [] : [{ path: 'dev/herd', loadComponent: () => import('./features/herd/herd-showcase.component').then((m) => m.HerdShowcaseComponent) } satisfies Routes[number]]),
  {
    path: '',
    loadComponent: () => import('./layout/app-shell.component').then((m) => m.AppShellComponent),
    canActivate: [authGuard, contextGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'visao-geral' },
      { path: 'visao-geral', loadComponent: () => import('./features/home/home-page.component').then((m) => m.HomePageComponent) },
      { path: 'rebanho/animais', data: { title: 'Animais' }, loadComponent: () => import('./features/herd/animal-list-page.component').then((m) => m.AnimalListPageComponent) },
      { path: 'rebanho/animais/novo', data: { title: 'Cadastrar animal' }, canDeactivate: [unsavedAnimalGuard], loadComponent: () => import('./features/herd/animal-create-page.component').then((m) => m.AnimalCreatePageComponent) },
      { path: 'rebanho/animais/:animalId', data: { title: 'Perfil do animal' }, loadComponent: () => import('./features/herd/animal-profile-page.component').then((m) => m.AnimalProfilePageComponent) },
      { path: 'rebanho/movimentacoes', data: { title: 'Movimentações' }, loadComponent: () => import('./features/herd/movements-page.component').then((m) => m.MovementsPageComponent) },
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
