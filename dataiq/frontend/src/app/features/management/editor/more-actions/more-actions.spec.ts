import { HttpTestingController } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { NoticeService } from '../../../../core/notice/notice.service';
import { provideRepositoryTesting, TEST_API_BASE } from '../../../../data/testing';
import { DiscardableVersion, MoreActions } from './more-actions';

@Component({ template: '' })
class Blank {}

const DRAFT: DiscardableVersion = {
  id: 'v-2',
  technique: 'Colecistectomía',
  number: 2,
  state: 'draft',
};

describe('MoreActions', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<MoreActions>;
  let router: Router;
  let notices: NoticeService;
  let root: HTMLElement;

  async function settle(): Promise<void> {
    for (let i = 0; i < 3; i++) {
      await Promise.resolve();
      TestBed.tick();
    }
    fixture.detectChanges();
  }

  async function mount(version: DiscardableVersion = DRAFT): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideRepositoryTesting(),
        provideRouter([{ path: 'gestion/borradores', component: Blank }]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    notices = TestBed.inject(NoticeService);
    fixture = TestBed.createComponent(MoreActions);
    fixture.componentRef.setInput('version', version);
    root = fixture.nativeElement;
    await settle();
  }

  const trigger = () => root.querySelector<HTMLButtonElement>('.trigger')!;
  const panel = () => root.querySelector<HTMLElement>('.panel');
  const item = () => root.querySelector<HTMLButtonElement>('.item')!;
  const confirm = () => root.querySelector<HTMLElement>('.confirm');
  const buttons = () => Array.from(root.querySelectorAll<HTMLButtonElement>('.confirm button'));
  const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim();

  async function click(element: HTMLElement): Promise<void> {
    element.click();
    await settle();
  }

  async function openConfirmation(version?: DiscardableVersion): Promise<void> {
    await mount(version);
    await click(trigger());
    await click(item());
  }

  afterEach(() => http.verify());

  describe('el botón y el panel', () => {
    it('«Más acciones» empieza cerrado, con su nombre para quien no lo ve', async () => {
      await mount();

      expect(trigger().getAttribute('aria-label')).toBe('Más acciones');
      expect(trigger().getAttribute('aria-expanded')).toBe('false');
      expect(panel()).toBeNull();
    });

    it('al tocarlo abre el panel con «Descartar borrador», enlazado con aria-controls', async () => {
      await mount();

      await click(trigger());

      expect(trigger().getAttribute('aria-expanded')).toBe('true');
      expect(panel()!.id).toBe(trigger().getAttribute('aria-controls'));
      expect(text(item())).toBe('Descartar borrador');
      expect(item().getAttribute('aria-disabled')).toBeNull();
    });

    it('tocarlo con el panel abierto lo cierra', async () => {
      await mount();
      await click(trigger());

      await click(trigger());

      expect(panel()).toBeNull();
    });

    it('Escape lo cierra y el foco vuelve al botón', async () => {
      await mount();
      await click(trigger());

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await settle();

      expect(panel()).toBeNull();
      expect(document.activeElement).toBe(trigger());
    });

    it('un clic fuera lo cierra, y uno dentro no', async () => {
      await mount();
      await click(trigger());

      panel()!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await settle();
      expect(panel()).not.toBeNull();

      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await settle();
      expect(panel()).toBeNull();
    });

    it('al cerrarlo y abrirlo otra vez vuelve a la lista de acciones, no a la confirmación', async () => {
      await openConfirmation();

      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await settle();
      await click(trigger());

      expect(confirm()).toBeNull();
      expect(item()).not.toBeNull();
    });
  });

  describe('la confirmación', () => {
    it('dice, en el mismo panel, qué se descarta: un borrador posterior a la 1 no toca lo publicado', async () => {
      await openConfirmation();

      expect(root.querySelector('.item')).toBeNull();
      expect(text(confirm()!.querySelector('p'))).toBe(
        'Descartar Colecistectomía. Se borra este borrador y no se puede recuperar; la versión publicada no cambia.',
      );
      expect(confirm()!.querySelector('b')!.textContent).toBe('Colecistectomía');
    });

    it('la versión 1 de una técnica nunca publicada avisa que también se borra la técnica', async () => {
      await openConfirmation({ ...DRAFT, number: 1 });

      expect(text(confirm()!.querySelector('p'))).toBe(
        'Descartar Colecistectomía. Se borra este borrador y también la técnica, porque nunca se publicó. No se puede recuperar.',
      );
    });

    it('tiene «Descartar» y «Cancelar», y el foco va a «Descartar»', async () => {
      await openConfirmation();

      expect(buttons().map((b) => text(b))).toEqual(['Descartar', 'Cancelar']);
      expect(document.activeElement).toBe(buttons()[0]);
    });

    it('«Cancelar» cierra el panel y devuelve el foco al botón, sin pedir nada', async () => {
      await openConfirmation();

      await click(buttons()[1]);

      expect(panel()).toBeNull();
      expect(document.activeElement).toBe(trigger());
      http.expectNone(() => true);
    });
  });

  describe('versión en revisión', () => {
    const IN_REVIEW: DiscardableVersion = { ...DRAFT, state: 'in_review' };

    it('la opción queda atenuada y dice que solo se descarta un borrador', async () => {
      await mount(IN_REVIEW);
      await click(trigger());

      expect(item().getAttribute('aria-disabled')).toBe('true');
      expect(text(item().querySelector('small'))).toBe('Solo se descarta un borrador.');
    });

    it('tocarla no abre la confirmación ni pide nada', async () => {
      await mount(IN_REVIEW);
      await click(trigger());

      await click(item());

      expect(confirm()).toBeNull();
      http.expectNone(() => true);
    });

    it('un borrador no lleva esa nota', async () => {
      await mount();
      await click(trigger());

      expect(root.querySelector('.item small')).toBeNull();
    });
  });

  describe('descartar', () => {
    it('pide DELETE de la versión, avisa «Borrador descartado.» y vuelve a Mis borradores', async () => {
      await openConfirmation();

      await click(buttons()[0]);
      const request = http.expectOne(`${TEST_API_BASE}/versions/v-2`);
      expect(request.request.method).toBe('DELETE');
      expect(buttons()[0].getAttribute('aria-busy')).toBe('true');
      request.flush(null, { status: 204, statusText: 'No Content' });
      await settle();
      await fixture.whenStable();

      expect(router.url).toBe('/gestion/borradores');
      expect(notices.notices().map((n) => [n.kind, n.messages])).toEqual([
        ['confirmation', ['Borrador descartado.']],
      ]);
    });

    it('un segundo toque mientras va el primero no pide otra vez', async () => {
      await openConfirmation();

      buttons()[0].click();
      buttons()[0].click();
      await settle();

      http.expectOne(`${TEST_API_BASE}/versions/v-2`).flush(null, {
        status: 204,
        statusText: 'No Content',
      });
      await settle();
    });

    it('si la API lo rechaza (409), no avisa de que se descartó, no se va y deja volver a intentar', async () => {
      await openConfirmation();

      await click(buttons()[0]);
      http
        .expectOne(`${TEST_API_BASE}/versions/v-2`)
        .flush({ detail: 'Solo se descarta un borrador' }, { status: 409, statusText: 'Conflict' });
      await settle();

      expect(router.url).toBe('/');
      expect(notices.notices()).toEqual([]);
      expect(confirm()).not.toBeNull();
      expect(buttons()[0].getAttribute('aria-busy')).toBe('false');

      await click(buttons()[0]);
      http.expectOne(`${TEST_API_BASE}/versions/v-2`).flush(null, {
        status: 204,
        statusText: 'No Content',
      });
      await settle();
    });
  });
});
