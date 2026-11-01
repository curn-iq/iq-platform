import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArrowLink } from '../../../shared/ui/arrow-link/arrow-link';
import { Button } from '../../../shared/ui/button/button';
import { HeroStage } from '../hero-stage/hero-stage';

/**
 * La portada del inicio: el titular a la izquierda con la acción principal (Crear
 * cuenta gratis) y, a la derecha, el escenario de la mesa en sus tres vistas. Ver
 * «Layout» y «Escenario de la mesa» en `DESIGN.md`.
 */
@Component({
  selector: 'app-home-hero',
  imports: [ArrowLink, Button, HeroStage, RouterLink],
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeHero {}
