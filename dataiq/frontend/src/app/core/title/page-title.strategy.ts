import { inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

/** Nombre del producto: cierra el título de cada pestaña del navegador. */
export const APP_NAME = 'IQ Platform';

/**
 * El título de la pestaña del navegador: «<título de la ruta> · IQ Platform»,
 * como en los mockups. La ruta lo da en `title`; una ruta sin título (el inicio)
 * lleva solo el nombre del producto.
 */
@Injectable({ providedIn: 'root' })
export class PageTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const routeTitle = this.buildTitle(snapshot);
    this.title.setTitle(routeTitle ? `${routeTitle} · ${APP_NAME}` : APP_NAME);
  }
}
