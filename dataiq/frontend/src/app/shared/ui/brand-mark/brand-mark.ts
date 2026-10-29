import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * La marca de IQ Platform: un cuadrado de 30 px y 8 px de radio en `marca` con
 * rejilla blanca. Va en la barra y en el pie, junto al nombre. Es decorativa: el
 * nombre siempre está al lado, en texto.
 */
@Component({
  selector: 'app-brand-mark',
  templateUrl: './brand-mark.html',
  styleUrl: './brand-mark.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
})
export class BrandMark {}
