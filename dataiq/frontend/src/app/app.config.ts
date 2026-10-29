import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideApi } from './core/http/api.providers';
import { provideSession } from './core/session/session.providers';
import { provideTitle } from './core/title/title.providers';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideApi(),
    provideSession(),
    provideTitle(),
  ],
};
