import { Routes } from '@angular/router';
import { environment } from '../environments/environment';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { contextGuard } from './core/guards/context.guard';
import { permissionGuard } from './core/guards/permission.guard';

const unsavedAnimalGuard = (component: { canDeactivate?: () => boolean }) => component.canDeactivate?.() ?? true;

export const routes: Routes = [
  { path: 'entrar', canActivate: [guestGuard], loadComponent: () => import('./features/auth/login-page.component').then((m) => m.LoginPageComponent) },
  { path: 'convites/:token', canActivate: [authGuard], loadComponent: () => import('./features/administration/invitation-acceptance-page.component').then(m => m.InvitationAcceptancePageComponent) },
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
      { path: 'rebanho/saude', data: { title: 'Saúde' }, loadComponent: () => import('./features/herd/health-page.component').then(m => m.HealthPageComponent) },
      { path: 'rebanho/reproducao', data: { title: 'Reprodução' }, loadComponent: () => import('./features/herd/reproduction-page.component').then(m => m.ReproductionPageComponent) },
      { path: 'rebanho/agenda', data: { title: 'Agenda' }, loadComponent: () => import('./features/herd/agenda-page.component').then(m => m.AgendaPageComponent) },
      { path: 'relatorios', data: { title: 'Relatórios' }, loadComponent: () => import('./features/reports/reports-page.component').then(m => m.ReportsPageComponent) },
      { path: 'administracao', data: { title: 'Administração', permission: 'viewAdministration' }, canActivate: [permissionGuard], loadComponent: () => import('./features/administration/administration-page.component').then(m => m.AdministrationPageComponent) },
      { path: 'administracao/fazendas', data: { title: 'Fazendas', permission: 'viewAdministration' }, canActivate: [permissionGuard], loadComponent: () => import('./features/administration/farms-page.component').then(m => m.FarmsPageComponent) },
      { path: 'administracao/pessoas', data: { title: 'Pessoas e acessos', permission: 'manageUsers' }, canActivate: [permissionGuard], loadComponent: () => import('./features/administration/people-page.component').then(m => m.PeoplePageComponent) },
    ],
  },
  { path: '**', redirectTo: '' },
];
