import { Routes } from '@angular/router';
import { dashboardShowcaseProviders } from './dashboard-showcase';

export const dashboardShowcaseRoutes: Routes = [
  { path: '', providers: dashboardShowcaseProviders, loadComponent: () => import('./home-page.component').then((m) => m.HomePageComponent) },
];
