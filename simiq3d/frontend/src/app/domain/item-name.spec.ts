import { itemName } from './item-name';

describe('itemName', () => {
  it('un componente dice solo su nombre', () => {
    expect(itemName(['Pinza Kelly'], 'kelly')).toBe('Pinza Kelly');
  });

  it('dos componentes se unen con «y»', () => {
    expect(itemName(['Mango de bisturí N.° 3', 'Hoja de bisturí #15'], '')).toBe(
      'Mango de bisturí N.° 3 y Hoja de bisturí #15',
    );
  });

  it('con más de dos, comas y «y» antes del último', () => {
    expect(itemName(['Compresa', 'Seda 2/0', 'Portaagujas'], '')).toBe(
      'Compresa, Seda 2/0 y Portaagujas',
    );
  });

  it('«e» ante una palabra que empieza con el sonido /i/', () => {
    expect(itemName(['Compresa', 'Hilo'], '')).toBe('Compresa e Hilo');
  });

  it('sin componentes dice lo que escribió la fuente: es lo único que hay', () => {
    expect(itemName([], 'Gasa doblada')).toBe('Gasa doblada');
  });
});
