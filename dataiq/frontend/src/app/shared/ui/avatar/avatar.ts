import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { initials } from '../../initials';

/** `small` (32 px) va en la barra; `medium` (44 px), en el panel de «Mi cuenta». */
export type AvatarSize = 'small' | 'medium';

/**
 * El avatar redondo con las iniciales de la persona, en `marca-claro`. Es
 * decorativo: el nombre siempre está al lado, en texto.
 */
@Component({
  selector: 'app-avatar',
  template: '{{ letters() }}',
  styleUrl: './avatar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', '[attr.data-size]': 'size()' },
})
export class Avatar {
  readonly name = input.required<string>();
  readonly size = input<AvatarSize>('small');

  protected readonly letters = computed(() => initials(this.name()));
}
