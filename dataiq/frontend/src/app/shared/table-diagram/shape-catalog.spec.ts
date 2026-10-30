import { DRAWINGS } from './drawings';
import { drawingFor, shapesFor } from './shape-catalog';

describe('drawingFor', () => {
  it('reconoce el instrumento por su nombre, sin importar tildes ni mayúsculas', () => {
    expect(drawingFor('Pinza de Allis')).toBe('allis');
    expect(drawingFor('MANGO DE BISTURÍ N.° 3')).toBe('scalpel');
    expect(drawingFor('Pinza de disección con garra')).toBe('dissecting');
    expect(drawingFor('Tijera de Metzenbaum')).toBe('metzenbaum');
  });

  it('una variante de la misma pinza usa el dibujo de su familia', () => {
    expect(drawingFor('Pinza Kelly Adson')).toBe('kelly');
    expect(drawingFor('Portaagujas (sin especificar)')).toBe('needleHolder');
    expect(drawingFor('Pinza de Campo')).toBe('towelClamp');
  });

  it('la hoja del bisturí se dibuja con su mango', () => {
    expect(drawingFor('Hoja de bisturí #15')).toBe('scalpel');
  });

  it('distingue la tijera de Mayo del separador Mayo Collins', () => {
    expect(drawingFor('Tijera de Mayo')).toBe('mayo');
    expect(drawingFor('Separador Mayo Collins')).toBeNull();
  });

  it('reconoce los objetos planos', () => {
    expect(drawingFor('Paquete de ropa')).toBe('drapePack');
    expect(drawingFor('Compresa')).toBe('sponges');
    expect(drawingFor('Gasa')).toBe('sponges');
    expect(drawingFor('Bandeja')).toBe('tray');
    expect(drawingFor('Caucho de succión')).toBe('suctionTubing');
  });

  it('lo que no tiene dibujo propio no recibe el de otro', () => {
    for (const name of [
      'Pinza de Babcock',
      'Pinza de Foerster',
      'Pinza de Moynihan',
      'Pinza Kocher',
      'Valva maleable',
      'Separador de Deaver ancho',
      'Cánula de Yankauer',
      'Riñonera/Coca',
      'Portaagujas laparoscópico',
      'Pinza Kelly laparoscópica',
    ]) {
      expect(drawingFor(name), name).toBeNull();
    }
  });

  it('todo dibujo que se devuelve existe', () => {
    for (const name of ['Pinza Kelly', 'Compresa', 'Hoja de bisturí #10', 'Tijera de energía']) {
      const key = drawingFor(name);
      expect(key && DRAWINGS[key]).toBeTruthy();
    }
  });
});

describe('shapesFor', () => {
  it('un instrumento con dibujo es una forma de acero', () => {
    expect(shapesFor(['Pinza Kelly'])).toEqual([{ kind: 'steel', key: 'kelly' }]);
  });

  it('el mango y la hoja del bisturí son un solo bisturí', () => {
    expect(shapesFor(['Mango de bisturí N.° 3', 'Hoja de bisturí #15'])).toEqual([
      { kind: 'steel', key: 'scalpel' },
    ]);
  });

  it('la pinza con y sin garra es una sola pinza', () => {
    expect(shapesFor(['Pinza de disección con garra', 'Pinza de disección sin garra'])).toEqual([
      { kind: 'steel', key: 'dissecting' },
    ]);
  });

  it('dos instrumentos distintos en un objeto se dibujan los dos', () => {
    expect(shapesFor(['Pinza Cística', 'Tijera de energía'])).toEqual([
      { kind: 'steel', key: 'cystic' },
      { kind: 'steel', key: 'energy' },
    ]);
  });

  it('una compresa con portaagujas es la compresa con su hilo y el portaagujas', () => {
    expect(shapesFor(['Compresa', 'Portaagujas (sin especificar)'])).toEqual([
      { kind: 'flat', key: 'threadedSponge' },
      { kind: 'steel', key: 'needleHolder' },
    ]);
  });

  it('una compresa sola es la pila de compresas', () => {
    expect(shapesFor(['Compresa'])).toEqual([{ kind: 'flat', key: 'sponges' }]);
  });

  it('lo que no tiene dibujo es una sola forma punteada, por muchos componentes que sean', () => {
    expect(shapesFor(['Separador de Deaver ancho', 'Separador de Deaver angosto'])).toEqual([
      { kind: 'unknown', key: null },
    ]);
  });

  it('un componente sin dibujo suma el punteado a los que sí tienen', () => {
    expect(shapesFor(['Pinza Kelly', 'Pinza de Moynihan'])).toEqual([
      { kind: 'steel', key: 'kelly' },
      { kind: 'unknown', key: null },
    ]);
  });

  it('un portaagujas laparoscópico no se dibuja como el abierto, aunque comparta el nombre', () => {
    expect(shapesFor(['Compresa', 'Portaagujas laparoscópico'])).toEqual([
      { kind: 'flat', key: 'sponges' },
      { kind: 'unknown', key: null },
    ]);
  });

  it('un objeto sin componentes tampoco inventa un dibujo', () => {
    expect(shapesFor([])).toEqual([{ kind: 'unknown', key: null }]);
  });
});
