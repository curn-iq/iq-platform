import { TestBed } from '@angular/core/testing';
import type { ErrorKind } from '../../domain/flow';
import { TECHNIQUES_URL } from '../../links';
import { ERROR_COPY } from './error-copy';
import { ErrorPage } from './error-page';

function render(kind: ErrorKind) {
  const fixture = TestBed.createComponent(ErrorPage);
  fixture.componentRef.setInput('kind', kind);
  const emitted: string[] = [];
  fixture.componentInstance.restart.subscribe(() => emitted.push('restart'));
  fixture.componentInstance.review.subscribe(() => emitted.push('review'));
  fixture.componentInstance.login.subscribe(() => emitted.push('login'));
  fixture.detectChanges();
  return { root: fixture.nativeElement as HTMLElement, emitted };
}

const kinds = Object.keys(ERROR_COPY) as ErrorKind[];

describe('ErrorPage', () => {
  it('sin conexión, como en el mockup', () => {
    const { root } = render('no-connection');
    expect(root.querySelector('.eyebrow')?.textContent).toBe('Sin conexión');
    expect(root.querySelector('h1')?.textContent).toBe('No hay conexión con SIVRI.');
    expect(root.querySelector('.text')?.textContent).toBe(
      'El servidor que reconoce las piezas no responde. Revisa la conexión del celular y vuelve a intentarlo.',
    );
    expect(root.querySelector('button')?.textContent?.trim()).toBe('Intentar de nuevo');
  });

  it('cámara bloqueada, como en el mockup', () => {
    const { root } = render('camera-blocked');
    expect(root.querySelector('h1')?.textContent).toBe('La cámara está bloqueada.');
    expect(root.querySelector('.text')?.textContent).toContain(
      'Toca el candado junto a la dirección',
    );
    expect(root.querySelector('button')?.textContent?.trim()).toBe('Ya la permití');
  });

  it('técnica fuera del alcance, con las cinco técnicas y el enlace a DataIQ', () => {
    const { root } = render('unsupported-technique');
    expect(root.querySelector('h1')?.textContent).toBe('Esta mesa todavía no se puede revisar.');
    expect(root.querySelector('.text')?.textContent).toBe(
      'Por ahora SIVRI reconoce las mesas de Mayo de Colecistectomía, Eventrorrafia, Hemicolectomía derecha, Mastectomía y Tiroidectomía.',
    );
    expect(root.querySelector('button')?.textContent?.trim()).toBe('Revisar de nuevo');
    const link = root.querySelector('a')!;
    expect(link.textContent?.trim()).toBe('Ver las técnicas en DataIQ');
    expect(link.getAttribute('href')).toBe(TECHNIQUES_URL);
  });

  it.each(kinds)('«%s»: titular, párrafo y una acción, sin pictogramas', (kind) => {
    const { root } = render(kind);
    expect(root.querySelector('h1')?.textContent?.length).toBeGreaterThan(5);
    expect(root.querySelector('.text')?.textContent?.length).toBeGreaterThan(20);
    expect(root.querySelectorAll('button')).toHaveLength(1);
    expect(root.querySelector('img')).toBeNull();
    expect(root.querySelector('svg:not(a svg)')).toBeNull();
  });

  it('cada acción avisa lo que le toca', () => {
    const expected: Record<ErrorKind, string> = {
      'no-connection': 'restart',
      'camera-blocked': 'restart',
      'no-camera': 'restart',
      'session-ended': 'login',
      'unsupported-technique': 'restart',
      'not-recognized': 'review',
    };
    for (const kind of kinds) {
      const { root, emitted } = render(kind);
      root.querySelector('button')!.click();
      expect(emitted).toEqual([expected[kind]]);
    }
  });

  it('el titular recibe el foco al aparecer', async () => {
    const fixture = TestBed.createComponent(ErrorPage);
    fixture.componentRef.setInput('kind', 'no-connection');
    document.body.append(fixture.nativeElement);
    await fixture.whenStable();
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('h1'));
    fixture.nativeElement.remove();
  });

  it('el estudiante sin sesión puede ingresar; el de cámara bloqueada, intentarlo otra vez', () => {
    expect(ERROR_COPY['session-ended'].primary.label).toBe('Ingresar');
    expect(ERROR_COPY['camera-blocked'].primary.action).toBe('restart');
  });
});
