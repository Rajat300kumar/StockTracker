import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './auth-interceptor';
import { provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts';
// AG Grid imports
import { ModuleRegistry } from 'ag-grid-community';  // <-- Import ModuleRegistry
import { AllCommunityModule } from 'ag-grid-community';  // <-- Corrected to use AllCommunityModule

// Register AG Grid modules globally in the application configuration
ModuleRegistry.registerModules([AllCommunityModule]);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideEchartsCore({ echarts }),
  ]
};


