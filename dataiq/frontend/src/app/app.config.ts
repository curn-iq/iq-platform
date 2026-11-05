import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { routes } from './app.routes';
import { provideApi } from './core/http/api.providers';
import { provideAppRouter } from './core/router/router.providers';
import { provideSession } from './core/session/session.providers';
import { provideTitle } from './core/title/title.providers';
import { provideShellHost } from './shell/shell-host';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAppRouter(routes),
    provideApi(),
    provideSession(),
    provideTitle(),
    provideShellHost(),
  ],
};
