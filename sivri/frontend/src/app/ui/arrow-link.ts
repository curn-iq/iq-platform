import { booleanAttribute, Component, input } from '@angular/core';

/**
 * El enlace con flecha: texto en tinta 650 y una flecha de 16 px que avanza 3 px al pasar. En
 * SIVRI va en tinta y no en verde (`design/README.md`, «SIVRI: celular y computador (mockups)»). Se usa
 * sobre `<a appArrowLink>` y `<button appArrowLink>`.
 */
@Component({
  selector: 'a[appArrowLink], button[appArrowLink]',
  template: `
    <ng-content />
    @if (!noArrow()) {
      <svg class="arrow" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <path
          d="M3 8h10M9 4l4 4-4 4"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    }
  `,
  styleUrl: './arrow-link.scss',
})
export class ArrowLink {
  /** Sin la flecha: para volver («‹ Resultado»). */
  readonly noArrow = input(false, { transform: booleanAttribute });
}
