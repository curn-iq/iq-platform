import { filterGroups, highlight, plain } from './technique-search';

const groups = [
  {
    specialty: 'Cirugía general',
    techniques: [{ name: 'Mastectomía' }, { name: 'Tiroidectomía' }],
  },
  {
    specialty: 'Ginecología',
    techniques: [{ name: 'Cesárea' }, { name: 'Histerectomía vaginal' }],
  },
  { specialty: 'Urología', techniques: [{ name: 'Prostatectomía' }] },
];

const names = (result: ReturnType<typeof filterGroups<{ name: string }>>) =>
  result.map((group) => [group.specialty, group.techniques.map((t) => t.name)]);

describe('plain', () => {
  it('quita tildes y mayúsculas sin cambiar el largo', () => {
    expect(plain('Cesárea de Ñandú')).toBe('cesarea de nandu');
    expect(plain('Cesárea de Ñandú').length).toBe('Cesárea de Ñandú'.length);
  });
});

describe('highlight', () => {
  it('parte el nombre en lo que coincide, sin importar tildes ni mayúsculas', () => {
    expect(highlight('Tiroidectomía', 'DEC')).toEqual([
      { text: 'Tiroi', match: false },
      { text: 'dec', match: true },
      { text: 'tomía', match: false },
    ]);
    expect(highlight('Cesárea', 'sarea')).toEqual([
      { text: 'Ce', match: false },
      { text: 'sárea', match: true },
    ]);
  });

  it('conserva las letras originales dentro del tramo resaltado', () => {
    expect(highlight('Cesárea', 'ESAREA')[1]).toEqual({ text: 'esárea', match: true });
  });

  it('sin coincidencia o sin búsqueda, devuelve el nombre entero', () => {
    expect(highlight('Cesárea', 'xyz')).toEqual([{ text: 'Cesárea', match: false }]);
    expect(highlight('Cesárea', '  ')).toEqual([{ text: 'Cesárea', match: false }]);
  });

  it('resalta solo la primera coincidencia', () => {
    expect(highlight('Histerectomía', 'e').filter((s) => s.match).length).toBe(1);
  });
});

describe('filterGroups', () => {
  it('sin filtro, todo', () => {
    expect(filterGroups(groups, { specialty: null, query: '' })).toEqual(groups);
  });

  it('una especialidad elegida deja solo la suya', () => {
    expect(names(filterGroups(groups, { specialty: 'Urología', query: '' }))).toEqual([
      ['Urología', ['Prostatectomía']],
    ]);
  });

  it('busca en los nombres sin importar tildes ni mayúsculas, y quita los grupos vacíos', () => {
    expect(names(filterGroups(groups, { specialty: null, query: 'HISTERECTOMIA' }))).toEqual([
      ['Ginecología', ['Histerectomía vaginal']],
    ]);
    expect(names(filterGroups(groups, { specialty: null, query: 'tomía' }))).toEqual([
      ['Cirugía general', ['Mastectomía', 'Tiroidectomía']],
      ['Ginecología', ['Histerectomía vaginal']],
      ['Urología', ['Prostatectomía']],
    ]);
  });

  it('buscar una especialidad trae todas sus técnicas', () => {
    expect(names(filterGroups(groups, { specialty: null, query: 'ginecologia' }))).toEqual([
      ['Ginecología', ['Cesárea', 'Histerectomía vaginal']],
    ]);
  });

  it('la búsqueda se acota a la especialidad elegida', () => {
    expect(filterGroups(groups, { specialty: 'Urología', query: 'cesarea' })).toEqual([]);
  });

  it('una búsqueda sin coincidencias no deja nada', () => {
    expect(filterGroups(groups, { specialty: null, query: 'zzz' })).toEqual([]);
  });

  it('ignora los espacios de los lados', () => {
    expect(names(filterGroups(groups, { specialty: null, query: '  cesarea ' }))).toEqual([
      ['Ginecología', ['Cesárea']],
    ]);
  });
});
