import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
} from '@angular/core';

/** Lo que el componente necesita saber de un aviso (el `Notice` de `core/notice` cumple esta forma). */
export interface NoticeView {
  readonly id: number;
  readonly kind: 'error' | 'confirmation';
  readonly messages: readonly string[];
}

/** Lo que dura en pantalla una confirmación (`aviso-ok` de los mockups). */
export const CONFIRMATION_MS = 3200;

/**
 * Los avisos en pantalla, abajo al centro. El error es neutro (nunca rojo) y
 * se queda hasta que se cierra; la confirmación es oscura y se va sola. Ver
 * «Avisos» en `DESIGN.md`. No sabe de dónde vienen: recibe la lista y avisa con
 * `dismissed` cuál quitar.
 */
@Component({
  selector: 'app-notice-stack',
  templateUrl: './notice-stack.html',
  styleUrl: './notice-stack.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoticeStack {
  readonly notices = input.required<readonly NoticeView[]>();
  readonly dismissed = output<number>();

  protected readonly errors = computed(() => this.notices().filter((n) => n.kind === 'error'));
  protected readonly confirmations = computed(() =>
    this.notices().filter((n) => n.kind === 'confirmation'),
  );

  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.timers.forEach((timer) => clearTimeout(timer)));

    // Cada confirmación que aparece arranca su cuenta; la que ya no está, la suelta.
    effect(() => {
      const visible = new Set(this.confirmations().map((n) => n.id));
      for (const [id, timer] of this.timers) {
        if (!visible.has(id)) {
          clearTimeout(timer);
          this.timers.delete(id);
        }
      }
      for (const id of visible) {
        if (this.timers.has(id)) continue;
        this.timers.set(
          id,
          setTimeout(() => {
            this.timers.delete(id);
            this.dismissed.emit(id);
          }, CONFIRMATION_MS),
        );
      }
    });
  }
}
