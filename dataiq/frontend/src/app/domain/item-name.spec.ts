import { itemName } from './item-name';

describe('itemName', () => {
  it('un componente dice solo su nombre', () => {
    expect(itemName(['Pinza Kelly'], 'Pinzas Kelly')).toBe('Pinza Kelly');
  });

  it('dos componentes se unen con «y»', () => {
    expect(itemName(['Mango de bisturí N.° 3', 'Hoja de bisturí #15'], 'M.B #3 H.B #15')).toBe(
      'Mango de bisturí N.° 3 y Hoja de bisturí #15',
    );
  });

  it('con más de dos, comas y «y» antes del último', () => {
    expect(itemName(['Compresa', 'Portaagujas mediano', 'Sutura'], '')).toBe(
      'Compresa, Portaagujas mediano y Sutura',
    );
  });

  it('«e» ante una palabra que empieza con el sonido /i/, con o sin h ni tilde', () => {
    expect(itemName(['Compresa', 'Instrumental'], '')).toBe('Compresa e Instrumental');
    expect(itemName(['Compresa', 'Hilo de seda'], '')).toBe('Compresa e Hilo de seda');
    expect(itemName(['Compresa', 'Íleo'], '')).toBe('Compresa e Íleo');
  });

  it('«y» si la i forma diptongo con la vocal que sigue', () => {
    expect(itemName(['Agua', 'Hielo'], '')).toBe('Agua y Hielo');
    expect(itemName(['Cobre', 'hierro'], '')).toBe('Cobre y hierro');
  });

  it('no cambia las mayúsculas de los nombres del catálogo', () => {
    expect(itemName(['Pinza de Allis', 'Tijera de Mayo'], '')).toBe(
      'Pinza de Allis y Tijera de Mayo',
    );
  });

  it('sin componentes dice lo que escribió la fuente: es lo único que hay', () => {
    expect(itemName([], 'Cocas')).toBe('Cocas');
  });
});
