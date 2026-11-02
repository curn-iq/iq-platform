import { HttpTestingController } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SessionService } from '../../../../core/session/session.service';
import { provideRepositoryTesting, TEST_API_BASE } from '../../../../data/testing';
import { EditPublished } from './edit-published';

describe('EditPublished', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<EditPublished>;
  let root: HTMLElement;

  const button = () => root.querySelector<HTMLButtonElement>('button[app-button]')!;
  const panel = () => root.querySelector('app-published-panel');

  async function settle(): Promise<void> {
    for (let i = 0; i < 3; i++) {
      await Promise.resolve();
      TestBed.tick();
    }
    fixture.detectChanges();
  }

  /** Abre el panel y responde lo que pide. */
  async function openPanel(): Promise<void> {
    button().click();
    await settle();
    http.expectOne(`${TEST_API_BASE}/techniques`).flush([]);
    http.expectOne(`${TEST_API_BASE}/specialties`).flush([]);
    http.expectOne((r) => r.url === `${TEST_API_BASE}/versions`).flush([]);
    await settle();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRepositoryTesting(),
        provideRouter([]),
        { provide: SessionService, useValue: { account: signal({ id: 'u-1' }) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EditPublished);
    root = fixture.nativeElement;
    await settle();
  });

  afterEach(() => http.verify());

  it('el botón dice «Editar una publicada» y el panel no está ni pide nada hasta que se abre', () => {
    expect(button().textContent!.trim()).toBe('Editar una publicada');
    expect(button().getAttribute('aria-expanded')).toBe('false');
    expect(panel()).toBeNull();
    http.expectNone(() => true);
  });

  it('al tocarlo abre el panel, enlazado con aria-controls', async () => {
    await openPanel();

    expect(button().getAttribute('aria-expanded')).toBe('true');
    expect(panel()!.id).toBe(button().getAttribute('aria-controls'));
  });

  it('tocarlo con el panel abierto lo cierra', async () => {
    await openPanel();

    button().click();
    await settle();

    expect(panel()).toBeNull();
    expect(button().getAttribute('aria-expanded')).toBe('false');
  });

  it('Escape lo cierra y el foco vuelve al botón', async () => {
    await openPanel();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await settle();

    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(button());
  });

  it('Escape con el panel cerrado no hace nada', async () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await settle();

    expect(panel()).toBeNull();
    expect(document.activeElement).not.toBe(button());
  });

  it('un clic fuera lo cierra, y uno dentro no', async () => {
    await openPanel();

    panel()!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle();
    expect(panel()).not.toBeNull();

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle();
    expect(panel()).toBeNull();
  });

  it('al abrirlo otra vez vuelve a pedir las técnicas', async () => {
    await openPanel();
    button().click();
    await settle();

    await openPanel();
  });
});
