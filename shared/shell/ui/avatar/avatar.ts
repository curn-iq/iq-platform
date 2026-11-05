import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";
import { initials } from "../../initials";

/**
 * `small` (32 px) va en la barra y en las filas de Usuarios y roles; `medium` (44 px), en el panel
 * de «Mi cuenta»; `large` (52 px), en la ficha de Usuarios y roles.
 */
export type AvatarSize = "small" | "medium" | "large";

/**
 * El avatar redondo con las iniciales de la persona, en `marca-claro`. Es
 * decorativo: el nombre siempre está al lado, en texto.
 */
@Component({
  selector: "app-avatar",
  template: "{{ letters() }}",
  styleUrl: "./avatar.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "aria-hidden": "true", "[attr.data-size]": "size()" },
})
export class Avatar {
  readonly name = input.required<string>();
  readonly size = input<AvatarSize>("small");

  protected readonly letters = computed(() => initials(this.name()));
}
