import { ChangeDetectionStrategy, Component } from '@angular/core';
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
 * una con `scroll-margin-top: var(--size-navbar)` para no quedar bajo la barra fija.
 * Las secciones alternan `fondo` y `superficie` con un fundido entre ellas (ver «The
 * Fondos Neutros Rule» en `DESIGN.md`).
 *
 * `HomeCatalog` pide las técnicas una sola vez para la ventana de DataIQ y para las
 * especialidades.
 */
@Component({
  selector: 'app-home',
  imports: [HomeAudience, HomeFaq, HomeHero, HomeProducts, HomeResearch, HomeSpecialties],
  providers: [HomeCatalog],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {}
