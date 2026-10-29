import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { TitleStrategy } from '@angular/router';
import { PageTitleStrategy } from './page-title.strategy';

/** Pone el título de la pestaña en cada navegación (ver `PageTitleStrategy`). */
export function provideTitle(): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: TitleStrategy, useExisting: PageTitleStrategy }]);
}
