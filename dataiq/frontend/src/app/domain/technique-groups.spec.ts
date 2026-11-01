import { groupBySpecialty } from './technique-groups';

const technique = (name: string, specialty: string) => ({ name, specialty });

describe('groupBySpecialty', () => {
  it('agrupa en el orden de las especialidades y deja cada técnica en su orden', () => {
    const groups = groupBySpecialty(
      ['Cirugía general', 'Urología'],
      [
        technique('Prostatectomía', 'Urología'),
        technique('Mastectomía', 'Cirugía general'),
        technique('Tiroidectomía', 'Cirugía general'),
      ],
    );

    expect(groups.map((g) => [g.specialty, g.techniques.map((t) => t.name)])).toEqual([
      ['Cirugía general', ['Mastectomía', 'Tiroidectomía']],
      ['Urología', ['Prostatectomía']],
    ]);
  });

  it('una especialidad sin técnicas no forma grupo', () => {
    const groups = groupBySpecialty(
      ['Cirugía general', 'Ortopedia'],
      [technique('Mastectomía', 'Cirugía general')],
    );

    expect(groups.map((g) => g.specialty)).toEqual(['Cirugía general']);
  });

  it('una técnica de una especialidad que no se conoce va al final', () => {
    const groups = groupBySpecialty(
      ['Cirugía general'],
      [technique('Cesárea', 'Ginecología'), technique('Mastectomía', 'Cirugía general')],
    );

    expect(groups.map((g) => g.specialty)).toEqual(['Cirugía general', 'Ginecología']);
  });

  it('sin técnicas no hay grupos', () => {
    expect(groupBySpecialty(['Cirugía general'], [])).toEqual([]);
  });
});
