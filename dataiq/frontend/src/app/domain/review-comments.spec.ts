import {
  buildReason,
  commentLine,
  commentSubject,
  flattenLines,
  sortedComments,
  targetSection,
  type CommentTarget,
  type ReviewComment,
} from './review-comments';

const comment = (id: number, target: CommentTarget, text: string): ReviewComment => ({
  id,
  target,
  text,
});

const OBJECT: CommentTarget = {
  kind: 'object',
  section: 'mayo',
  number: 6,
  name: 'Separador de Senn Miller',
};
const FIELD: CommentTarget = { kind: 'field', key: 'anesthesia', label: 'Anestesia' };
const SECTION = (section: 'clinical' | 'instrumental' | 'mayo' | 'reserve'): CommentTarget => ({
  kind: 'section',
  section,
});

describe('targetSection', () => {
  it('un campo clínico es de Datos clínicos', () => {
    expect(targetSection(FIELD)).toBe('clinical');
  });

  it('una sección es ella misma y un objeto es de su mesa', () => {
    expect(targetSection(SECTION('instrumental'))).toBe('instrumental');
    expect(targetSection(OBJECT)).toBe('mayo');
    expect(targetSection({ ...OBJECT, section: 'reserve' } as CommentTarget)).toBe('reserve');
  });
});

describe('commentSubject', () => {
  it('dice la sección, el campo o el nombre del objeto', () => {
    expect(commentSubject(SECTION('mayo'))).toBe('la sección');
    expect(commentSubject(FIELD)).toBe('Anestesia');
    expect(commentSubject(OBJECT)).toBe('Separador de Senn Miller');
  });
});

describe('flattenLines', () => {
  it('pasa los saltos de línea a espacios y recorta', () => {
    expect(flattenLines('  uno\n\n  dos \r\n tres  ')).toBe('uno dos tres');
  });

  it('no toca los espacios de adentro de una línea', () => {
    expect(flattenLines('dos  espacios')).toBe('dos  espacios');
  });
});

describe('commentLine', () => {
  it('un objeto de la mesa lleva su mesa, su número y su nombre', () => {
    expect(commentLine(comment(1, OBJECT, 'Va en la columna 3.'))).toBe(
      'Mesa de Mayo · 6 Separador de Senn Miller: Va en la columna 3.',
    );
  });

  it('un objeto sin número va sin él', () => {
    const gauze: CommentTarget = { kind: 'object', section: 'mayo', number: null, name: 'Gasa' };

    expect(commentLine(comment(1, gauze, 'Ubicar.'))).toBe('Mesa de Mayo · Gasa: Ubicar.');
  });

  it('un objeto de la reserva dice la mesa de reserva', () => {
    const target: CommentTarget = {
      kind: 'object',
      section: 'reserve',
      number: 2,
      name: 'Pinza de campo',
    };

    expect(commentLine(comment(1, target, 'Falta.'))).toBe(
      'Mesa de reserva · 2 Pinza de campo: Falta.',
    );
  });

  it('un campo clínico lleva «Datos clínicos» y su nombre', () => {
    expect(commentLine(comment(1, FIELD, 'Falta la dosis.'))).toBe(
      'Datos clínicos · Anestesia: Falta la dosis.',
    );
  });

  it('una sección lleva su nombre', () => {
    expect(commentLine(comment(1, SECTION('instrumental'), 'Revisar la lista.'))).toBe(
      'Instrumental: Revisar la lista.',
    );
    expect(commentLine(comment(1, SECTION('reserve'), 'Sin arreglo.'))).toBe(
      'Mesa de reserva: Sin arreglo.',
    );
  });

  it('un comentario de varias líneas es una sola línea', () => {
    expect(commentLine(comment(1, FIELD, 'Primero.\nSegundo.'))).toBe(
      'Datos clínicos · Anestesia: Primero. Segundo.',
    );
  });
});

describe('sortedComments', () => {
  it('va por el orden de las secciones y, dentro, por el orden en que se escribieron', () => {
    const sorted = sortedComments([
      comment(1, SECTION('reserve'), 'r'),
      comment(2, OBJECT, 'm2'),
      comment(3, FIELD, 'c'),
      comment(4, SECTION('instrumental'), 'i'),
      comment(5, SECTION('mayo'), 'm1'),
    ]);

    expect(sorted.map((c) => c.id)).toEqual([3, 4, 2, 5, 1]);
  });

  it('no cambia la lista que recibe', () => {
    const original = [comment(2, SECTION('reserve'), 'r'), comment(1, FIELD, 'c')];

    sortedComments(original);

    expect(original.map((c) => c.id)).toEqual([2, 1]);
  });
});

describe('buildReason', () => {
  it('la nota general va primero y después una línea por comentario', () => {
    const reason = buildReason(
      [comment(1, OBJECT, 'Va en la columna 3.'), comment(2, FIELD, 'Falta la dosis.')],
      'Revisar con la fuente.',
    );

    expect(reason).toBe(
      [
        'Nota general: Revisar con la fuente.',
        'Datos clínicos · Anestesia: Falta la dosis.',
        'Mesa de Mayo · 6 Separador de Senn Miller: Va en la columna 3.',
      ].join('\n'),
    );
  });

  it('sin nota general solo van los comentarios', () => {
    expect(buildReason([comment(1, SECTION('mayo'), 'Sin arreglo.')], '   ')).toBe(
      'Mesa de Mayo: Sin arreglo.',
    );
  });

  it('solo con la nota general también sirve', () => {
    expect(buildReason([], 'Falta la fuente.')).toBe('Nota general: Falta la fuente.');
  });

  it('la nota general de varias líneas es una sola línea', () => {
    expect(buildReason([], 'Uno.\nDos.')).toBe('Nota general: Uno. Dos.');
  });

  it('sin nada queda vacío', () => {
    expect(buildReason([], '')).toBe('');
  });

  it('un comentario en blanco no deja una línea', () => {
    expect(buildReason([comment(1, FIELD, '  \n ')], '')).toBe('');
  });

  it('cada comentario es exactamente una línea', () => {
    const reason = buildReason(
      [comment(1, FIELD, 'a\nb\nc'), comment(2, OBJECT, 'd\ne')],
      'n1\nn2',
    );

    expect(reason.split('\n')).toHaveLength(3);
  });
});
