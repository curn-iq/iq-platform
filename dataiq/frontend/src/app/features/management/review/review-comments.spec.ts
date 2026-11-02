import { TestBed } from '@angular/core/testing';
import type { CommentTarget } from '../../../domain/review-comments';
import { ReviewComments } from './review-comments';

const OBJECT: CommentTarget = {
  kind: 'object',
  section: 'mayo',
  number: 6,
  name: 'Separador de Senn Miller',
};
const FIELD: CommentTarget = { kind: 'field', key: 'anesthesia', label: 'Anestesia' };

describe('ReviewComments', () => {
  let comments: ReviewComments;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [ReviewComments] });
    comments = TestBed.inject(ReviewComments);
  });

  it('empieza sin comentarios, sin nota y sin escribir nada', () => {
    expect(comments.count()).toBe(0);
    expect(comments.note()).toBe('');
    expect(comments.composing()).toBeNull();
    expect(comments.canReturn()).toBe(false);
    expect(comments.reason()).toBe('');
  });

  it('empezar un comentario lo deja abierto sobre su objetivo, y solo uno a la vez', () => {
    comments.compose(OBJECT);
    comments.compose(FIELD);

    expect(comments.composing()).toEqual(FIELD);
  });

  it('cancelar cierra lo que se estaba escribiendo', () => {
    comments.compose(OBJECT);

    comments.cancel();

    expect(comments.composing()).toBeNull();
    expect(comments.count()).toBe(0);
  });

  it('guardar agrega el comentario con su objetivo y cierra el redactor', () => {
    comments.compose(OBJECT);

    expect(comments.add('  Va en la columna 3.  ')).toBe(true);

    expect(comments.comments()).toEqual([{ id: 1, target: OBJECT, text: 'Va en la columna 3.' }]);
    expect(comments.composing()).toBeNull();
  });

  it('sin texto no guarda nada y sigue abierto', () => {
    comments.compose(OBJECT);

    expect(comments.add(' \n ')).toBe(false);

    expect(comments.count()).toBe(0);
    expect(comments.composing()).toEqual(OBJECT);
  });

  it('sin redactor abierto no guarda nada', () => {
    expect(comments.add('texto')).toBe(false);
    expect(comments.count()).toBe(0);
  });

  it('quitar saca solo ese comentario', () => {
    comments.compose(OBJECT);
    comments.add('uno');
    comments.compose(FIELD);
    comments.add('dos');

    comments.remove(1);

    expect(comments.comments().map((c) => c.text)).toEqual(['dos']);
  });

  it('los comentarios de una sección van en el orden en que se escribieron', () => {
    comments.compose(OBJECT);
    comments.add('de la mesa 1');
    comments.compose(FIELD);
    comments.add('del campo');
    comments.compose({ kind: 'section', section: 'mayo' });
    comments.add('de la mesa 2');

    expect(comments.of('mayo').map((c) => c.text)).toEqual(['de la mesa 1', 'de la mesa 2']);
    expect(comments.of('clinical').map((c) => c.text)).toEqual(['del campo']);
    expect(comments.of('reserve')).toEqual([]);
  });

  it('dice qué objetos de una mesa ya tienen comentario', () => {
    comments.compose(OBJECT);
    comments.add('uno');
    comments.compose({ kind: 'object', section: 'reserve', number: 2, name: 'Pinza' });
    comments.add('dos');
    comments.compose({ kind: 'object', section: 'mayo', number: null, name: 'Gasa' });
    comments.add('tres');

    expect(comments.commentedMayo()).toEqual([6]);
    expect(comments.commentedReserve()).toEqual([2]);
  });

  it('el motivo junta la nota general y los comentarios, y se puede devolver con cualquiera', () => {
    comments.note.set('Revisar con la fuente.');
    expect(comments.canReturn()).toBe(true);

    comments.compose(FIELD);
    comments.add('Falta la dosis.');

    expect(comments.reason()).toBe(
      'Nota general: Revisar con la fuente.\nDatos clínicos · Anestesia: Falta la dosis.',
    );
  });

  it('solo con un comentario también se puede devolver', () => {
    comments.compose(OBJECT);
    comments.add('Va en la columna 3.');

    expect(comments.canReturn()).toBe(true);
  });

  it('clear olvida comentarios, nota y redactor', () => {
    comments.compose(OBJECT);
    comments.add('uno');
    comments.note.set('nota');
    comments.compose(FIELD);

    comments.clear();

    expect(comments.count()).toBe(0);
    expect(comments.note()).toBe('');
    expect(comments.composing()).toBeNull();
  });
});
