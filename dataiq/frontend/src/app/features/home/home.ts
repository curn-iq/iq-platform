import { ViewportScroller } from '@angular/common';
import {
  afterNextRender,
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { HomeAudience } from './audience/audience';
import { HomeFaq } from './faq/faq';
import { HomeCatalog } from './home-catalog';
import { HomeHero } from './hero/hero';
import { HomeProducts } from './products/products';
import { HomeResearch } from './research/research';
import { HomeSpecialties } from './specialties/specialties';

/**
 * El inicio (`inicio.html`): la portada con la mesa en sus tres vistas, «Tres formas
 * de recorrer una técnica», las técnicas por especialidad, lo que dice la
 * investigación, para quién es y las preguntas frecuentes. La barra y el pie
 * enlazan a sus secciones (`camino`, `investigacion`, `quien` y `preguntas`), cada
 * una con `scroll-margin-top: var(--size-navbar)` para no quedar bajo la barra fija
 * (el router descuenta la barra por su lado, ver `provideAppRouter`). Las secciones
 * alternan `fondo` y `superficie` con un fundido entre ellas (ver «The
 * Fondos Neutros Rule» en `DESIGN.md`).
 *
 * `HomeCatalog` pide las técnicas una sola vez para la ventana de DataIQ y para las
 * especialidades. Esa lista llega después de que el router bajó a la sección y empuja
 * hacia abajo lo que sigue, y no todo navegador lo compensa (Safari no tiene anclaje
 * de scroll): al llegar se vuelve a bajar, salvo que la persona ya se haya movido.
 */
@Component({
  selector: 'app-home',
  imports: [HomeAudience, HomeFaq, HomeHero, HomeProducts, HomeResearch, HomeSpecialties],
  providers: [HomeCatalog],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  constructor() {
    const catalog = inject(HomeCatalog);
    const router = inject(Router);
    const scroller = inject(ViewportScroller);
    const destroyRef = inject(DestroyRef);

    let moved = false;
    afterNextRender(() => {
      const onMove = () => (moved = true);
      const events = ['wheel', 'touchstart', 'keydown', 'mousedown'];
      for (const event of events) window.addEventListener(event, onMove, { passive: true });
      destroyRef.onDestroy(() => {
        for (const event of events) window.removeEventListener(event, onMove);
      });
    });

    afterRenderEffect(() => {
      if (catalog.loading() || moved) return;
      const { fragment } = router.parseUrl(router.url);
      if (fragment) scroller.scrollToAnchor(fragment);
    });
  }
}
