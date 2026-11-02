import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { NoticeService } from '../../../../core/notice/notice.service';
import { provideRepositoryTesting, TEST_API_BASE } from '../../../../data/testing';
import type { CommentTarget } from '../../../../domain/review-comments';
import { ReviewComments } from '../review-comments';
import { ReviewDecision, type ReviewedVersion } from './review-decision';

const ID = '019a0c1e-7b3d-7c2a-9e4f-0a1b2c3d4e5f';
const VERSION: ReviewedVersion = {
  id: ID,
  technique: 'Tiroidectomía',
  number: 2,
  author: 'Daniela Ortiz',
};
const OBJECT: CommentTarget = {
  kind: 'object',
  section: 'mayo',
  number: 6,
  name: 'Separador de Senn Miller',
};
const FIELD: CommentTarget = { kind: 'field', key: 'anesthesia', label: 'Anestesia' };

describe('ReviewDecision', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<ReviewDecision>>;
  let root: HTMLElement;
  let http: HttpTestingController;
  let comments: ReviewComments;
  let navigate: ReturnType<typeof vi.spyOn>;
  let conflicts: number;

  async function mount(version: ReviewedVersion = VERSION) {
    TestBed.configureTestingModule({
      providers: [provideRepositoryTesting(), provideRouter([]), ReviewComments],
    });
    http = TestBed.inject(HttpTestingController);
    comments = TestBed.inject(ReviewComments);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(ReviewDecision);
    fixture.componentRef.setInput('version', version);
    conflicts = 0;
    fixture.componentInstance.conflict.subscribe(() => conflicts++);
    root = fixture.nativeElement;
    document.body.appendChild(root);
    await settle();
  }

  async function settle() {
    for (let i = 0; i < 3; i++) {
      await Promise.resolve();
      TestBed.tick();
      fixture.detectChanges();
    }
  }

  const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim();
  const button = (label: string | RegExp) =>
    Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      typeof label === 'string' ? text(b) === label : label.test(text(b)!),
    )!;
  const click = async (label: string | RegExp) => {
    button(label).click();
    await settle();
  };
  const panel = () => root.querySelector('.panel');
  /** El botón que confirma, dentro del panel (el que lo abre dice lo mismo). */
  const confirm = async () => {
    panel()!.querySelector<HTMLButtonElement>('.buttons button')!.click();
    await settle();
  };

  afterEach(() => {
    root?.remove();
    http.verify();
  });

  describe('los botones', () => {
    it('sin comentarios dicen «Devolver con comentarios» y «Aprobar y publicar»', async () => {
      await mount();

      expect(Array.from(root.querySelectorAll('.actions button')).map((b) => text(b))).toEqual([
        'Devolver con comentarios',
        'Aprobar y publicar',
      ]);
      expect(panel()).toBeNull();
    });

    it('«Devolver» cuenta los comentarios', async () => {
      await mount();
      comments.compose(OBJECT);
      comments.add('Uno.');
      await settle();
      expect(text(root.querySelector('.actions button'))).toBe('Devolver con 1 comentario');

      comments.compose(FIELD);
      comments.add('Dos.');
      await settle();
      expect(text(root.querySelector('.actions button'))).toBe('Devolver con 2 comentarios');
    });

    it('cada uno abre su panel y avisa si está abierto', async () => {
      await mount();
      const [giveBack, approve] = Array.from(
        root.querySelectorAll<HTMLButtonElement>('.actions button'),
      );

      await click('Devolver con comentarios');
      expect(giveBack.getAttribute('aria-expanded')).toBe('true');
      expect(approve.getAttribute('aria-expanded')).toBe('false');
      expect(panel()!.id).toBe('panel-return');

      await click('Aprobar y publicar');
      expect(panel()!.id).toBe('panel-approve');
      expect(giveBack.getAttribute('aria-expanded')).toBe('false');
      expect(approve.getAttribute('aria-expanded')).toBe('true');
    });

    it('tocar el botón del panel abierto lo cierra', async () => {
      await mount();
      await click('Devolver con comentarios');

      await click('Devolver con comentarios');

      expect(panel()).toBeNull();
    });
  });

  describe('devolver', () => {
    beforeEach(async () => {
      await mount();
      await click('Devolver con comentarios');
    });

    it('dice a quién se devuelve y qué pasa con la versión', () => {
      expect(text(panel()!.querySelector('h2'))).toBe('Devolver a Daniela Ortiz');
      expect(text(panel()!.querySelector('p'))).toBe(
        'La versión vuelve a sus borradores con estos comentarios, cada uno en su sección.',
      );
    });

    it('sin comentarios lo dice, y «Devolver» está apagado', () => {
      expect(text(panel()!.querySelector('.none'))).toBe(
        'Todavía no hay comentarios. Se agregan en cada sección o tocando una pieza de la mesa propuesta.',
      );
      expect(button('Devolver').disabled).toBe(true);
    });

    it('con la nota general ya se puede devolver', async () => {
      const area = panel()!.querySelector('textarea')!;
      area.value = 'Revisar con la fuente.';
      area.dispatchEvent(new Event('input'));
      await settle();

      expect(button('Devolver').disabled).toBe(false);
      expect(text(panel()!.querySelector('label'))).toBe('Nota general (opcional)');
    });

    it('lista las líneas del motivo tal como se enviarán', async () => {
      comments.compose(OBJECT);
      comments.add('Va en la columna 3.');
      comments.compose(FIELD);
      comments.add('Falta la dosis.');
      await settle();

      expect(Array.from(panel()!.querySelectorAll('.summary li')).map((li) => text(li))).toEqual([
        'Datos clínicos · Anestesia: Falta la dosis.',
        'Mesa de Mayo · 6 Separador de Senn Miller: Va en la columna 3.',
      ]);
      expect(button('Devolver').disabled).toBe(false);
    });

    it('«Devolver» manda el motivo, avisa y vuelve a Por revisar', async () => {
      comments.compose(OBJECT);
      comments.add('Va en la columna 3.');
      comments.note.set('Revisar con la fuente.');
      await settle();

      await click('Devolver');

      const request = http.expectOne(`${TEST_API_BASE}/versions/${ID}/reject`);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({
        reason:
          'Nota general: Revisar con la fuente.\nMesa de Mayo · 6 Separador de Senn Miller: Va en la columna 3.',
      });
      request.flush(null, { status: 204, statusText: 'No Content' });
      await settle();

      expect(
        TestBed.inject(NoticeService)
          .notices()
          .map((n) => [n.kind, n.messages]),
      ).toEqual([['confirmation', ['Tiroidectomía versión 2 devuelta a Daniela Ortiz.']]]);
      expect(navigate).toHaveBeenCalledWith('/gestion/revision');
    });

    it('mientras va dice «Devolviendo…» y no se puede tocar otra vez', async () => {
      comments.note.set('Falta la fuente.');
      await settle();

      await click('Devolver');

      expect(text(button(/Devolviendo/))).toBe('Devolviendo…');
      expect(button(/Devolviendo/).disabled).toBe(true);
      expect(button('Cancelar').disabled).toBe(true);
      expect(
        Array.from(root.querySelectorAll<HTMLButtonElement>('.actions button')).every(
          (b) => b.disabled,
        ),
      ).toBe(true);
      http.expectOne(`${TEST_API_BASE}/versions/${ID}/reject`).flush(null, {
        status: 204,
        statusText: 'No Content',
      });
    });

    it('sin nada que decir no manda nada', async () => {
      button('Devolver').click();
      await settle();

      http.expectNone(`${TEST_API_BASE}/versions/${ID}/reject`);
    });

    it('«Cancelar» cierra el panel y conserva lo escrito', async () => {
      comments.note.set('Una nota.');
      await settle();

      await click('Cancelar');

      expect(panel()).toBeNull();
      expect(comments.note()).toBe('Una nota.');
    });

    it('si la API rechaza, el panel se queda como estaba y se puede intentar otra vez', async () => {
      comments.note.set('Falta la fuente.');
      await settle();
      await click('Devolver');

      http
        .expectOne(`${TEST_API_BASE}/versions/${ID}/reject`)
        .flush('', { status: 500, statusText: 'Server Error' });
      await settle();

      expect(panel()).not.toBeNull();
      expect(button('Devolver').disabled).toBe(false);
      expect(conflicts).toBe(0);
      expect(navigate).not.toHaveBeenCalled();
    });

    it('un 409 (otro revisor ya decidió) cierra el panel y pide volver a mirar la versión', async () => {
      comments.note.set('Falta la fuente.');
      await settle();
      await click('Devolver');

      http
        .expectOne(`${TEST_API_BASE}/versions/${ID}/reject`)
        .flush({ detail: 'x' }, { status: 409, statusText: 'Conflict' });
      await settle();

      expect(conflicts).toBe(1);
      expect(panel()).toBeNull();
      expect(navigate).not.toHaveBeenCalled();
    });
  });

  describe('aprobar', () => {
    it('en una edición dice que la anterior queda como reemplazada', async () => {
      await mount();
      await click('Aprobar y publicar');

      expect(text(panel()!.querySelector('h2'))).toBe('Aprobar y publicar la versión 2');
      expect(text(panel()!.querySelector('p'))).toBe(
        'Pasa a ser la versión que ven estudiantes, SIVRI y SIMIQ3D; la versión 1 queda como reemplazada.',
      );
    });

    it('en la versión 1 dice que la técnica entra al catálogo', async () => {
      await mount({ ...VERSION, number: 1 });
      await click('Aprobar y publicar');

      expect(text(panel()!.querySelector('p'))).toBe(
        'La técnica entra al catálogo y la ven estudiantes, SIVRI y SIMIQ3D.',
      );
    });

    it('el foco pasa al botón de confirmar', async () => {
      await mount();
      await click('Aprobar y publicar');

      expect(document.activeElement).toBe(panel()!.querySelector('.buttons button'));
    });

    it('confirmar aprueba, avisa y vuelve a Por revisar', async () => {
      await mount();
      await click('Aprobar y publicar');

      await confirm();

      const request = http.expectOne(`${TEST_API_BASE}/versions/${ID}/approve`);
      expect(request.request.method).toBe('POST');
      request.flush(null, { status: 204, statusText: 'No Content' });
      await settle();

      expect(
        TestBed.inject(NoticeService)
          .notices()
          .map((n) => [n.kind, n.messages]),
      ).toEqual([['confirmation', ['Tiroidectomía versión 2 publicada.']]]);
      expect(navigate).toHaveBeenCalledWith('/gestion/revision');
    });

    it('mientras va dice «Aprobando…»', async () => {
      await mount();
      await click('Aprobar y publicar');
      await confirm();

      expect(text(button(/Aprobando/))).toBe('Aprobando…');
      expect(button(/Aprobando/).disabled).toBe(true);
      http.expectOne(`${TEST_API_BASE}/versions/${ID}/approve`).flush(null, {
        status: 204,
        statusText: 'No Content',
      });
    });

    it('«Cancelar» cierra el panel sin aprobar y devuelve el foco al botón', async () => {
      await mount();
      await click('Aprobar y publicar');

      await click('Cancelar');

      expect(panel()).toBeNull();
      http.expectNone(`${TEST_API_BASE}/versions/${ID}/approve`);
      expect(document.activeElement).toBe(
        Array.from(root.querySelectorAll('.actions button')).find(
          (b) => text(b) === 'Aprobar y publicar',
        ),
      );
    });

    it('Escape cierra el panel', async () => {
      await mount();
      await click('Aprobar y publicar');

      panel()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await settle();

      expect(panel()).toBeNull();
    });

    it('un 409 cierra el panel y pide volver a mirar la versión', async () => {
      await mount();
      await click('Aprobar y publicar');
      await confirm();

      http
        .expectOne(`${TEST_API_BASE}/versions/${ID}/approve`)
        .flush({ detail: 'x' }, { status: 409, statusText: 'Conflict' });
      await settle();

      expect(conflicts).toBe(1);
      expect(panel()).toBeNull();
      expect(navigate).not.toHaveBeenCalled();
    });
  });
});
