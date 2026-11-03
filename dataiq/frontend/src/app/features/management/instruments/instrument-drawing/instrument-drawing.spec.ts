import { TestBed } from '@angular/core/testing';
import { InstrumentDrawing, steelDrawingFor } from './instrument-drawing';

describe('steelDrawingFor', () => {
  it('un instrumento con dibujo propio de acero trae sus partes', () => {
    expect(steelDrawingFor('Pinza Kelly')!.length).toBeGreaterThan(0);
    expect(steelDrawingFor('Tijera de Metzenbaum')).not.toBeNull();
  });

  it('un instrumento sin dibujo propio no se dibuja ni se le presta el de otro', () => {
    expect(steelDrawingFor('Valva maleable')).toBeNull();
    expect(steelDrawingFor('Pinza de Moynihan')).toBeNull();
  });

  it('lo plano (tela, bandeja) no es acero: no se dibuja aquí', () => {
    expect(steelDrawingFor('Gasa')).toBeNull();
    expect(steelDrawingFor('Bandeja')).toBeNull();
  });

  it('el instrumental laparoscópico no toma el dibujo del abierto', () => {
    expect(steelDrawingFor('Portaagujas laparoscópico')).toBeNull();
  });
});

describe('InstrumentDrawing', () => {
  function mount(name: string) {
    const fixture = TestBed.createComponent(InstrumentDrawing);
    fixture.componentRef.setInput('name', name);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('dibuja el instrumento en acero, decorativo', () => {
    const root = mount('Pinza Kelly');

    const svg = root.querySelector('svg')!;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('viewBox')).toBe('-20 -6 40 114');
    expect(svg.querySelectorAll('g[app-drawing-parts] > *').length).toBeGreaterThan(0);
  });

  it('sin dibujo propio no pinta nada', () => {
    expect(mount('Valva maleable').querySelector('svg')).toBeNull();
  });

  it('cada dibujo tiene sus propios degradados: dos en una página no comparten id', () => {
    const first = mount('Pinza Kelly');
    const second = mount('Tijera de Mayo');

    const ids = (root: HTMLElement) =>
      Array.from(root.querySelectorAll('linearGradient[id]')).map((el) => el.id);
    expect(ids(first).length).toBeGreaterThan(0);
    expect(ids(first).some((id) => ids(second).includes(id))).toBe(false);
  });

  it('el acero se pinta con los degradados de su propio dibujo', () => {
    const root = mount('Pinza Kelly');
    const style = root.querySelector('svg')!.getAttribute('style')!;
    const [steelId] = Array.from(root.querySelectorAll('linearGradient[id]')).map((el) => el.id);

    expect(style).toContain(`url(#${steelId})`);
  });
});
