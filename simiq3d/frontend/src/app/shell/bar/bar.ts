import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { SessionService } from '../../core/session/session.service';
import { ShellNavigation } from '../../core/session/shell';
import { initials } from '../../shared/initials';

/** Cómo se llama cada rol en la interfaz (los mismos de DataIQ). */
const ROLE_LABELS: Readonly<Record<string, string>> = {
  user: 'Usuario',
  contributor: 'Colaborador',
  reviewer: 'Revisor',
  admin: 'Admin',
};

/**
 * La barra del shell en SIMIQ3D: la marca, la etiqueta del módulo, «Técnicas»
 * y «Herramientas» (páginas del shell, con navegación completa porque es otra
 * app), «Explorar en 3D» (esta) y «Mi cuenta», con el mismo panel de DataIQ
 * (quién es, su rol y «Cerrar sesión»). Ver «SIMIQ3D: explorar en 3D» en
 * `DESIGN.md`.
 */
@Component({
  selector: 'app-bar',
  imports: [RouterLink],
  templateUrl: './bar.html',
  styleUrl: './bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'close()',
    '(document:pointerdown)': 'outside($event)',
  },
})
export class Bar {
  protected readonly session = inject(SessionService);
  private readonly shellNavigation = inject(ShellNavigation);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly shell = environment.shellUrl;
  /** El panel de «Mi cuenta» está abierto. */
  protected readonly open = signal(false);
  protected readonly leaving = signal(false);
  protected readonly letters = computed(() => {
    const account = this.session.account();
    return account ? initials(account.name) : '';
  });
  protected readonly role = computed(() => {
    const role = this.session.account()?.role;
    return role ? (ROLE_LABELS[role] ?? role) : '';
  });

  protected toggle(): void {
    this.open.update((v) => !v);
  }

  protected close(): void {
    this.open.set(false);
  }

  protected outside(event: Event): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.close();
  }

  /** Sale y lleva al inicio del shell; si no pudo cerrar, el interceptor ya avisó y se queda. */
  protected async exit(): Promise<void> {
    if (this.leaving()) return;
    this.leaving.set(true);
    try {
      await firstValueFrom(this.session.logout());
    } catch {
      return;
    } finally {
      this.leaving.set(false);
    }
    this.close();
    this.shellNavigation.goToHome();
  }
}
