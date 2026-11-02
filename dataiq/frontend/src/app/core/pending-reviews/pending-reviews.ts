import { computed, inject, Injectable, linkedSignal } from '@angular/core';
import { VersionsRepository } from '../../data/versions.repository';
import { hasAtLeast } from '../../domain/role';
import { toQueueRows } from '../../domain/review-queue';
import { SessionService } from '../session/session.service';

/**
 * Las versiones de otras personas que esperan revisión: las que lista «Por revisar» y la cifra
 * junto a ese acceso en «Mi cuenta» y en el menú de celular. Es una sola petición
 * (`GET /versions?state=in_review`) que comparten las tres.
 *
 * No pide nada hasta que alguien la necesita (`refresh()`): un visitante o una persona sin rol de
 * revisor nunca la pide, y un revisor la pide al abrir el menú o la pantalla, no en cada página.
 * Al cambiar de cuenta se olvida lo pedido, así que una cuenta nueva no hereda la lista de la
 * anterior.
 */
@Injectable({ providedIn: 'root' })
export class PendingReviews {
  private readonly session = inject(SessionService);

  /**
   * Alguien la pidió con esta cuenta; al cambiar de cuenta vuelve a `false`. Si se pidió antes de
   * saber quién es (la sesión aún no llegaba), la petición se conserva para la cuenta que llegue.
   */
  private readonly requested = linkedSignal<string | undefined, boolean>({
    source: () => this.session.account()?.id,
    computation: (_id, previous) => (previous?.source === undefined ? !!previous?.value : false),
  });

  private readonly resource = inject(VersionsRepository).list(() => {
    const role = this.session.role();
    return this.requested() && role !== null && hasAtLeast(role, 'reviewer')
      ? { state: ['in_review'] }
      : undefined;
  });

  /** Las filas de «Por revisar»: de otras personas, la que lleva más esperando primero. */
  readonly rows = computed(() => {
    const owner = this.session.account()?.id;
    return owner !== undefined && this.resource.hasValue()
      ? toQueueRows(this.resource.value() ?? [], owner)
      : [];
  });

  /** Llegó la lista. Sigue en `true` mientras se vuelve a pedir. */
  readonly loaded = computed(() => this.resource.hasValue());

  /** No llegó por un error (el interceptor ya avisó): no se sabe cuántas hay. */
  readonly failed = computed(
    () => !this.loaded() && !this.resource.isLoading() && this.resource.error() !== undefined,
  );

  /** Cuántas esperan, o `null` mientras no se sabe. */
  readonly count = computed(() => (this.loaded() ? this.rows().length : null));

  /**
   * Pide la lista, o la vuelve a pedir si ya estaba pedida (la anterior se sigue mostrando hasta
   * que llegue la nueva). Con una cuenta que no es de revisor no pide nada.
   */
  refresh(): void {
    if (!this.requested()) this.requested.set(true);
    else this.resource.reload();
  }
}
