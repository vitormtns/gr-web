import { ApplicationConfig, ErrorHandler, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideLucideIcons, LucideBell, LucideBeef, LucideBoxes, LucideBuilding2, LucideCalendarDays, LucideChartNoAxesCombined, LucideChevronDown, LucideCircleHelp, LucideCircleUserRound, LucideClipboardList, LucideCommand, LucideCreditCard, LucideHeartPulse, LucideHouse, LucideLandPlot, LucideLogOut, LucideMenu, LucideSearch, LucideSettings, LucideShieldCheck, LucideSlidersHorizontal, LucideSprout, LucideUsers, LucideX } from '@lucide/angular';

import { routes } from './app.routes';
import { apiBaseUrlInterceptor, apiErrorInterceptor, authTokenInterceptor, tenantContextInterceptor } from './core/api/api.interceptors';
import { GlobalErrorHandler } from './core/api/global-error-handler';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideHttpClient(withInterceptors([
      apiBaseUrlInterceptor,
      authTokenInterceptor,
      tenantContextInterceptor,
      apiErrorInterceptor,
    ])),
    provideLucideIcons(
      LucideBell, LucideBeef, LucideBoxes, LucideBuilding2, LucideCalendarDays,
      LucideChartNoAxesCombined, LucideChevronDown, LucideCircleHelp, LucideCircleUserRound,
      LucideClipboardList, LucideCommand, LucideCreditCard, LucideHeartPulse, LucideHouse,
      LucideLandPlot, LucideLogOut, LucideMenu, LucideSearch, LucideSettings, LucideShieldCheck,
      LucideSlidersHorizontal, LucideSprout, LucideUsers, LucideX,
    ),
  ],
};
