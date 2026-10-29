import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from '../button/button';

/**
 * «No encontrada»: para una ruta que no existe y, desde la fase 4, para una
 * técnica que no existe. Voz impersonal, sin ilustración; lleva al catálogo o al
 * inicio.
 */
@Component({
  selector: 'app-not-found',
  imports: [RouterLink, Button],
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFound {}
