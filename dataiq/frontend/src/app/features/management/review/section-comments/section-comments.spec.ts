import { TestBed } from '@angular/core/testing';
import type { CommentTarget } from '../../../../domain/review-comments';
import type { SectionKey } from '../../../../domain/version-progress';
import { ReviewComments } from '../review-comments';
import { SectionComments } from './section-comments';

const OBJECT: CommentTarget = {
  kind: 'object',
  section: 'mayo',
  number: 6,
  name: 'Separador de Senn Miller',
};
const FIELD: CommentTarget = { kind: 'field', key: 'anesthesia', label: 'Anestesia' };

describe('SectionComments', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<SectionComments>>;
  let root: HTMLElement;
  let comments: ReviewComments;

  async function mount(section: SectionKey = 'mayo') {
    TestBed.configureTestingModule({ providers: [ReviewComments] });
    comments = TestBed.inject(ReviewComments);
    fixture = TestBed.createComponent(SectionComments);
    fixture.componentRef.setInput('section', section);
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
  const items = () =>
    Array.from(root.querySelectorAll('.comment')).map(
      (li) => `${text(li.querySelector('.head'))} | ${text(li.querySelector('.text'))}`,
    );
  const textarea = () => root.querySelector<HTMLTextAreaElement>('textarea');
  const buttons = () => Array.from(root.querySelectorAll('button')).map((b) => text(b));

  async function write(value: string) {
    const area = textarea()!;
    area.value = value;
    area.dispatchEvent(new Event('input'));
    await settle();
  }

  const click = async (label: string) => {
    Array.from(root.querySelectorAll('button'))
      .find((b) => text(b) === label)!
      .click();
    await settle();
  };

  afterEach(() => root?.remove());

  it('sin comentarios solo ofrece comentar la sección', async () => {
    await mount();

    expect(items()).toEqual([]);
    expect(buttons()).toEqual(['Comentar la sección']);
    expect(textarea()).toBeNull();
    expect(root.querySelector('section')!.getAttribute('aria-label')).toBe(
      'Comentarios de Mesa de Mayo',
    );
  });

  it('«Comentar la sección» abre el redactor sobre la sección, con el cursor en el texto', async () => {
    await mount();

    await click('Comentar la sección');

    expect(comments.composing()).toEqual({ kind: 'section', section: 'mayo' });
    expect(text(root.querySelector('label'))).toBe('Comentario sobre la sección');
    expect(textarea()!.placeholder).toBe('Qué hay que corregir y por qué.');
    expect(document.activeElement).toBe(textarea());
    expect(buttons()).toEqual(['Guardar comentario', 'Cancelar']);
  });

  it('guardar agrega el comentario a la lista, con sobre qué trata, y cierra el redactor', async () => {
    await mount();
    comments.compose(OBJECT);
    await settle();

    await write('Va en la columna 3.');
    await click('Guardar comentario');

    expect(items()).toEqual(['Comentario · sobre Separador de Senn Miller | Va en la columna 3.']);
    expect(textarea()).toBeNull();
    expect(buttons()).toContain('Comentar la sección');
  });

  it('el redactor de un objeto dice sobre cuál es', async () => {
    await mount();
    comments.compose(OBJECT);
    await settle();

    expect(text(root.querySelector('label'))).toBe('Comentario sobre Separador de Senn Miller');
  });

  it('sin texto no guarda y deja el cursor en el campo', async () => {
    await mount();
    comments.compose(OBJECT);
    await settle();
    await write('   ');

    await click('Guardar comentario');

    expect(items()).toEqual([]);
    expect(textarea()).not.toBeNull();
    expect(document.activeElement).toBe(textarea());
  });

  it('cancelar cierra el redactor sin guardar nada', async () => {
    await mount();
    comments.compose(OBJECT);
    await settle();
    await write('Algo.');

    await click('Cancelar');

    expect(items()).toEqual([]);
    expect(textarea()).toBeNull();
  });

  it('Escape también lo cierra', async () => {
    await mount();
    comments.compose(OBJECT);
    await settle();

    root
      .querySelector('.composer')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await settle();

    expect(textarea()).toBeNull();
  });

  it('el redactor empieza vacío cada vez', async () => {
    await mount();
    comments.compose(OBJECT);
    await settle();
    await write('Un borrador.');
    comments.compose({ kind: 'object', section: 'mayo', number: 7, name: 'Pinza de Allis' });
    await settle();

    expect(textarea()!.value).toBe('');
  });

  it('quitar un comentario lo saca de la lista', async () => {
    await mount();
    comments.compose(OBJECT);
    comments.add('Uno.');
    comments.compose({ kind: 'section', section: 'mayo' });
    comments.add('Dos.');
    await settle();

    root.querySelector<HTMLButtonElement>('.remove')!.click();
    await settle();

    expect(items()).toEqual(['Comentario · sobre la sección | Dos.']);
    expect(root.querySelector('.remove')!.getAttribute('aria-label')).toBe('Quitar comentario');
  });

  it('muestra solo los de su sección, y su redactor solo si es sobre ella', async () => {
    await mount('clinical');
    comments.compose(FIELD);
    comments.add('De Datos clínicos.');
    comments.compose(OBJECT);
    comments.add('De la mesa de Mayo.');
    await settle();

    expect(items()).toEqual(['Comentario · sobre Anestesia | De Datos clínicos.']);

    comments.compose(OBJECT);
    await settle();
    expect(textarea()).toBeNull();
    expect(buttons()).toContain('Comentar la sección');
  });

  it('un campo clínico se redacta en Datos clínicos', async () => {
    await mount('clinical');
    comments.compose(FIELD);
    await settle();

    expect(text(root.querySelector('label'))).toBe('Comentario sobre Anestesia');
  });

  it('respeta los saltos de línea del comentario al mostrarlo', async () => {
    await mount();
    comments.compose(OBJECT);
    comments.add('Primero.\nSegundo.');
    await settle();

    expect(root.querySelector('.text')!.textContent).toBe('Primero.\nSegundo.');
  });
});
