import { Component, ElementRef, inject, viewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from '../shared-shell/navbar/navbar';
import { Layout } from './core/layout/layout';
import { SessionService } from './core/session/session.service';

@Component({
  imports: [Navbar, RouterOutlet],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly layout = inject(Layout);
  private readonly content = viewChild.required<ElementRef<HTMLElement>>('content');

  constructor() {
    // La entrada y la página del computador son públicas y no pasan por `sessionGuard`: la
    // barra necesita saber si hay sesión para mostrar «Ingresar» o «Mi cuenta».
    void inject(SessionService).check();
  }

  /** «Saltar al contenido»: el foco pasa a la pantalla, sin cambiar la dirección. */
  protected skipToContent(event: Event): void {
    event.preventDefault();
    this.content().nativeElement.focus();
  }
}
