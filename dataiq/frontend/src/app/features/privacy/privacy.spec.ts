import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Privacy } from './privacy';

describe('Privacy', () => {
  let fixture: ComponentFixture<Privacy>;

  const root = () => fixture.nativeElement as HTMLElement;
  const texts = (selector: string) =>
    Array.from(root().querySelectorAll(selector)).map((element) => element.textContent!.trim());

  beforeEach(() => {
    fixture = TestBed.createComponent(Privacy);
    fixture.detectChanges();
  });

  it('el titular de la página es el del documento', () => {
    expect(texts('h1')).toEqual([
      'Aviso de privacidad y autorización para el tratamiento de datos personales',
    ]);
  });

  it('dice la versión y la vigencia junto al titular', () => {
    const summary = root().querySelector('.summary')!;

    expect(summary.textContent).toMatch(/Versión \d+\.\d+ · Vigente desde el/);
    expect(summary.querySelector('strong')!.textContent).toBe('IQ Platform');
  });

  it('no deja espacios de más junto a la negrita ni al borde del texto', () => {
    const summary = root().querySelector('.summary')!.textContent!;
    const bullet = Array.from(root().querySelectorAll('ul li'))
      .map((item) => item.textContent!)
      .find((text) => text.startsWith('Vercel'))!;

    expect(summary).toMatch(/^IQ Platform · Versión/);
    expect(summary).not.toMatch(/\s$/);
    // «**Vercel Inc.**, en Estados Unidos…»: la coma va pegada a la negrita.
    expect(bullet).toMatch(/^Vercel Inc\., en Estados Unidos/);
  });

  it('cada sección del documento es un titular de segundo nivel', () => {
    const headings = texts('h2');

    expect(headings[0]).toBe('Responsable del tratamiento');
    expect(headings).toContain('Derechos del titular');
    expect(headings.at(-1)).toBe('Cambios a este aviso');
  });

  it('las listas numeradas y con viñetas conservan sus elementos', () => {
    const numbered = root().querySelector('ol')!;

    expect(numbered.querySelectorAll('li')).toHaveLength(6);
    expect(root().querySelectorAll('ul li').length).toBeGreaterThan(0);
  });

  it('la tabla de datos tiene encabezados y cada celda dice a qué columna pertenece', () => {
    const columns = texts('table thead th');
    const firstRow = Array.from(
      root().querySelectorAll('table tbody tr')[0].querySelectorAll('td'),
    );

    expect(columns).toEqual(['Dato', 'Para qué', 'Cuánto tiempo']);
    expect(firstRow.map((cell) => cell.getAttribute('data-label'))).toEqual(columns);
    expect(firstRow[0].textContent).toContain('Nombre y correo');
  });

  it('dibuja el texto como texto: nada de lo que dice el documento se vuelve HTML', () => {
    expect(root().querySelector('script, img, iframe')).toBeNull();
  });
});
