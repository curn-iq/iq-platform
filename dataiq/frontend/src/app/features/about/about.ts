import { IMAGE_LOADER, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArrowLink } from '../../shared/ui/arrow-link/arrow-link';
import { aboutImageLoader, CAROUSEL_PHOTOS, PROGRAM_SRCSET, PROGRAMS, TEAM } from './about-photos';
import { PhotoCarousel } from './photo-carousel/photo-carousel';
import { TeamGroupSection } from './team-group/team-group';

/**
 * La página «Nosotros» (`/nosotros`): quiénes hacen IQ Platform. Pública y sin API. Va, de arriba
 * abajo, la presentación (titular, entradilla y «Ver cómo funciona»), el carrusel, «Los dos
 * programas» y «Conoce al equipo»; cada sección entra en su casilla de la fase 10 de
 * `dataiq/docs/checklist-frontend.md`. Ver «Nosotros (página)» en `DESIGN.md`.
 */
@Component({
  selector: 'app-about',
  imports: [ArrowLink, NgOptimizedImage, PhotoCarousel, RouterLink, TeamGroupSection],
  // Las fotos de los programas; el carrusel trae su propio cargador
  providers: [{ provide: IMAGE_LOADER, useValue: aboutImageLoader(1423) }],
  templateUrl: './about.html',
  styleUrl: './about.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class About {
  protected readonly carouselPhotos = CAROUSEL_PHOTOS;
  protected readonly programs = PROGRAMS;
  protected readonly programSrcset = PROGRAM_SRCSET;
  protected readonly team = TEAM;
}
