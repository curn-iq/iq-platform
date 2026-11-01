import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { SessionService } from '../../core/session/session.service';
import { APP_NAME } from '../../core/title/page-title.strategy';
import { TechniquesRepository } from '../../data/techniques.repository';
import { findTechniqueTab, TECHNIQUE_TABS } from '../../domain/technique-tabs';
import { isUuid } from '../../domain/uuid';
import { NotFound } from '../../shared/ui/not-found/not-found';
import { TabItem, Tabs } from '../../shared/ui/tabs/tabs';
import { TechniqueColumn } from './technique-column/technique-column';

/**
 * El detalle de una técnica (`/tecnicas/:id/:pestana`, `tecnica.html`): a la izquierda
 * la columna de técnicas y a la derecha el nombre de la técnica con su especialidad,
 * las pestañas y la hoja de la elegida. Una técnica que no existe, o una pestaña que
 * no es una de las cuatro, muestra «No encontrada».
 *
 * La pestaña vive en la URL, así que se puede compartir y Atrás la recuerda.
 * `/tecnicas/:id` redirige a los datos clínicos (ver `app.routes.ts`).
 */
@Component({
  selector: 'app-technique',
  imports: [NotFound, Tabs, TechniqueColumn],
  templateUrl: './technique.html',
  styleUrl: './technique.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TechniqueDetail {
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly session = inject(SessionService);

  private readonly params = toSignal(inject(ActivatedRoute).paramMap, { requireSync: true });

  /** El `id` de la URL; un texto que no puede ser un id no se pide a la API. */
  protected readonly techniqueId = computed(() => {
    const id = this.params().get('id');
    return id !== null && isUuid(id) ? id : undefined;
  });
  protected readonly tab = computed(() => findTechniqueTab(this.params().get('pestana')));

  // Con una pestaña que no existe no hay técnica que pedir. Es un `computed` para que cambiar
  // de pestaña, que deja el mismo id, no vuelva a pedir la técnica.
  private readonly requestedId = computed(() => (this.tab() ? this.techniqueId() : undefined));
  private readonly resource = inject(TechniquesRepository).get(() => this.requestedId());

  /** Los datos clínicos, cuando llegan. */
  protected readonly technique = computed(() =>
    this.resource.hasValue() ? this.resource.value() : undefined,
  );

  /** La API respondió 404, la URL no es de una técnica o la pestaña no existe. */
  protected readonly notFound = computed(() => {
    if (this.techniqueId() === undefined || this.tab() === undefined) return true;
    const error = this.resource.error();
    return error instanceof HttpErrorResponse && error.status === 404;
  });

  /** Sin sesión, las pestañas que piden cuenta llevan un candado (solo cuando ya se sabe que no hay). */
  protected readonly locked = computed(() => this.session.loaded() && !this.session.isLoggedIn());

  protected readonly tabItems = computed<TabItem[]>(() =>
    TECHNIQUE_TABS.map((tab) => ({
      key: tab.slug,
      label: tab.label,
      link: ['/tecnicas', this.techniqueId(), tab.slug],
      locked: this.locked() && tab.requiresAccount,
    })),
  );

  // El router pone el título genérico de la ruta al navegar, justo antes de
  // `NavigationEnd`; este efecto lo cambia por el nombre de la técnica cuando
  // llega y lo vuelve a poner si se cambia de pestaña.
  private readonly navigated = toSignal(
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)),
  );

  constructor() {
    effect(() => {
      this.navigated();
      const name = this.notFound() ? 'No encontrada' : this.technique()?.name;
      if (name) this.title.setTitle(`${name} · ${APP_NAME}`);
    });
  }
}
