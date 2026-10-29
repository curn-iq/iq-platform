import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Injector,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CATALOG_ROUTE, NavMenu, NavOption } from './nav-menus';
import { SpecialtiesNav } from './specialties-nav';
import { ToolPictogram } from './tool-pictogram';

/** Cuántas técnicas de una especialidad nombra su opción antes de los puntos suspensivos. */
const HINT_TECHNIQUES = 2;

/**
 * El desplegable de un menú de la barra: a la izquierda su nombre y su línea, al
 * centro las opciones y a la derecha una vista previa que responde a la opción
 * señalada. Lo dibuja `Navbar` en un overlay. Ver «Desplegables» en
 * «Navigation» de `DESIGN.md`.
 */
@Component({
  selector: 'app-nav-panel',
  imports: [NgTemplateOutlet, RouterLink, ToolPictogram],
  templateUrl: './nav-panel.html',
  styleUrl: './nav-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    id: 'nav-panel',
    role: 'region',
    '[attr.aria-label]': 'menu().label',
    '(click)': 'onClick($event)',
  },
})
export class NavPanel {
  readonly menu = input.required<NavMenu>();
  /** Se eligió una opción (o el enlace del encabezado): el desplegable se cierra. */
  readonly chosen = output<void>();

  private readonly injector = inject(Injector);
  /** La opción señalada (con el puntero o el teclado); sin señalar, la vista previa muestra la primera. */
  protected readonly pointed = signal<number | null>(null);

  // Las especialidades se piden la primera vez que se abre ese desplegable.
  private readonly specialties = computed(() =>
    this.menu().preview.kind === 'specialties' ? this.injector.get(SpecialtiesNav).entries() : [],
  );

  protected readonly options = computed<readonly NavOption[]>(() => {
    const menu = this.menu();
    if (menu.preview.kind !== 'specialties') return menu.options ?? [];
    return this.specialties().map((specialty) => ({
      label: specialty.name,
      hint: this.hint(specialty.techniques),
      target: { route: CATALOG_ROUTE, queryParams: { especialidad: specialty.id } },
    }));
  });

  /** La opción que la vista previa muestra. */
  protected readonly previewed = computed(() => {
    const options = this.options();
    return options[Math.min(this.pointed() ?? 0, options.length - 1)];
  });

  protected readonly previewedSpecialty = computed(
    () => this.specialties()[Math.min(this.pointed() ?? 0, this.specialties().length - 1)],
  );

  protected readonly phrase = computed(() => {
    const preview = this.menu().preview;
    return preview.kind === 'phrase' ? preview : undefined;
  });

  protected readonly questions = computed(() => {
    const preview = this.menu().preview;
    return preview.kind === 'questions' ? preview : undefined;
  });

  protected onClick(event: Event): void {
    if ((event.target as Element).closest('a')) this.chosen.emit();
  }

  private hint(techniques: readonly string[]): string {
    const names = techniques.slice(0, HINT_TECHNIQUES).join(', ');
    return techniques.length > HINT_TECHNIQUES ? `${names}…` : names;
  }
}
