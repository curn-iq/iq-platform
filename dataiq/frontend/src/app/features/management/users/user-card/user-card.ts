import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { NoticeService } from '../../../../core/notice/notice.service';
import { UsersRepository } from '../../../../data/users.repository';
import { ROLES, type Role } from '../../../../domain/role';
import {
  activityLine,
  describeRoleChange,
  formatPersonDate,
  type Person,
} from '../../../../domain/user-board';
import { ROLE_LABELS } from '../../../../shared/role-labels';
import { Avatar } from '../../../../shared/ui/avatar/avatar';
import { Button } from '../../../../shared/ui/button/button';
import { CheckboxField } from '../../../../shared/ui/checkbox-field/checkbox-field';
import {
  SegmentedControl,
  type SegmentOption,
} from '../../../../shared/ui/segmented-control/segmented-control';

/** Los cuatro roles, de menor a mayor, como opciones del selector. */
const ROLE_OPTIONS: readonly SegmentOption[] = ROLES.map((role) => ({
  key: role,
  label: ROLE_LABELS[role],
}));

/**
 * La ficha de una persona en Usuarios y roles, según «Usuarios y roles (página)» de `DESIGN.md`
 * y Resuelto 63 de `dataiq/docs/checklist-frontend.md`: su nombre y correo, el selector de rol,
 * y «Cuenta» con cuándo se registró, qué versión del aviso de privacidad aceptó y su actividad en
 * DataIQ.
 *
 * **Cambiar el rol** pide confirmación en un panel bajo el selector: dice qué podrá hacer la cuenta
 * con el rol nuevo y, para Revisor o Admin, exige marcar lo que el admin verificó por fuera antes de
 * habilitar el botón. Mientras va la petición el botón dice «Cambiando…» y la ficha no responde a
 * otro cambio. Con éxito avisa y entrega la cuenta actualizada con `changed`; con error avisa el
 * interceptor y el panel se queda. Suspender y el historial de roles no están en el MVP.
 */
@Component({
  selector: 'app-user-card',
  imports: [Avatar, Button, CheckboxField, SegmentedControl],
  templateUrl: './user-card.html',
  styleUrl: './user-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserCard {
  readonly person = input.required<Person>();
  /** La cuenta con su rol nuevo, cuando la API confirmó el cambio. */
  readonly changed = output<Person>();
  /** «Volver a la lista»: solo se ve donde la ficha queda bajo el tablero. */
  readonly back = output<void>();

  private readonly users = inject(UsersRepository);
  private readonly notices = inject(NoticeService);
  private readonly now = new Date();

  protected readonly roleOptions = ROLE_OPTIONS;
  protected readonly roleLabels = ROLE_LABELS;

  /** El rol que se propone, o `null` si no se propone ninguno. Cambiar de cuenta lo borra. */
  protected readonly proposed = linkedSignal<Person, Role | null>({
    source: this.person,
    computation: () => null,
  });
  /** Lo que el admin marcó haber verificado. Proponer otro rol lo borra. */
  protected readonly verified = linkedSignal<Role | null, boolean>({
    source: this.proposed,
    computation: () => false,
  });
  /** La petición va. Sigue así hasta que llega la cuenta actualizada (o falla). */
  protected readonly busy = linkedSignal<Person, boolean>({
    source: this.person,
    computation: () => false,
  });

  /** El rol que muestra el selector: el propuesto o, si no hay, el de la cuenta. */
  protected readonly shownRole = computed(() => this.proposed() ?? this.person().role);

  /** La confirmación, mientras se propone un rol distinto al de la cuenta. */
  protected readonly change = computed(() => {
    const role = this.proposed();
    return role === null ? null : describeRoleChange(this.person().role, role);
  });

  protected readonly canApply = computed(() => {
    const change = this.change();
    return change !== null && !this.busy() && (change.verification === null || this.verified());
  });

  protected readonly registered = computed(() =>
    formatPersonDate(new Date(this.person().created_at), this.now),
  );
  protected readonly policy = computed(() => {
    const { policy_version, policy_accepted_at } = this.person();
    return `Aceptó la versión ${policy_version} el ${formatPersonDate(new Date(policy_accepted_at), this.now)}`;
  });
  protected readonly activity = computed(() => activityLine(this.person().activity));

  protected propose(key: string): void {
    if (this.busy()) return;
    const role = ROLES.find((candidate) => candidate === key);
    // Elegir otra vez el rol de la cuenta es desistir
    this.proposed.set(role === undefined || role === this.person().role ? null : role);
  }

  protected cancel(): void {
    if (!this.busy()) this.proposed.set(null);
  }

  protected apply(): void {
    const change = this.change();
    if (change === null || !this.canApply()) return;
    this.busy.set(true);
    this.users.changeRole(this.person().id, change.to).subscribe({
      next: (user) => {
        this.notices.show('confirmation', [`Rol cambiado a ${ROLE_LABELS[change.to]}.`]);
        this.changed.emit(user);
      },
      // El interceptor ya avisó; el panel se queda para intentarlo de nuevo o cancelar
      error: () => this.busy.set(false),
    });
  }
}
