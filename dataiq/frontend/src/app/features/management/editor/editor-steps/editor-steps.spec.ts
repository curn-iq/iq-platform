import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EditorStepItem, EditorSteps } from './editor-steps';

const STEPS: EditorStepItem[] = [
  {
    slug: 'datos-clinicos',
    label: 'Datos clínicos',
    mark: 'in_progress',
    hint: 'Faltan 2 campos',
    stateName: 'en curso',
  },
  {
    slug: 'instrumental',
    label: 'Instrumental',
    mark: 'pending',
    hint: 'Sin instrumental',
    stateName: 'pendiente',
  },
  {
    slug: 'mesa-de-mayo',
    label: 'Mesa de Mayo',
    mark: 'complete',
    hint: '3 de 3 ubicados',
    stateName: 'completo',
  },
  {
    slug: 'mesa-de-reserva',
    label: 'Mesa de reserva',
    mark: 'no_table',
    hint: 'Sin arreglo disponible',
    stateName: 'sin arreglo',
  },
  {
    slug: 'revisar',
    label: 'Revisar y enviar',
    mark: 'locked',
    hint: 'Faltan 2 pasos',
    stateName: 'bloqueado',
  },
];

@Component({
  imports: [EditorSteps],
  template: `<app-editor-steps [steps]="steps()" versionId="v-1" [current]="current()" />`,
})
class Host {
  readonly steps = signal(STEPS);
  readonly current = signal('instrumental');
}

describe('EditorSteps', () => {
  async function mount() {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      root,
      links: () => Array.from(root.querySelectorAll<HTMLAnchorElement>('a')),
      marks: () => Array.from(root.querySelectorAll('app-progress-mark')),
    };
  }

  const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim();

  it('es una navegación con un enlace por paso, a la URL de ese paso de la versión', async () => {
    const { root, links } = await mount();

    expect(root.querySelector('nav')!.getAttribute('aria-label')).toBe('Pasos del editor');
    expect(links().map((a) => a.getAttribute('href'))).toEqual([
      '/gestion/editor/v-1/datos-clinicos',
      '/gestion/editor/v-1/instrumental',
      '/gestion/editor/v-1/mesa-de-mayo',
      '/gestion/editor/v-1/mesa-de-reserva',
      '/gestion/editor/v-1/revisar',
    ]);
  });

  it('cada paso dice su número, su nombre y lo que falta', async () => {
    const { links } = await mount();

    expect(text(links()[0].querySelector('.name b'))).toBe('1');
    expect(text(links()[0].querySelector('.name'))).toBe('1Datos clínicos');
    expect(text(links()[0].querySelector('.hint'))).toBe('Faltan 2 campos');
    expect(text(links()[4].querySelector('.name'))).toBe('5Revisar y enviar');
  });

  it('cada enlace se lee entero: paso, nombre, estado y lo que falta', async () => {
    const { links } = await mount();

    expect(links()[1].getAttribute('aria-label')).toBe(
      'Paso 2, Instrumental: pendiente. Sin instrumental',
    );
    expect(links()[3].getAttribute('aria-label')).toBe(
      'Paso 4, Mesa de reserva: sin arreglo. Sin arreglo disponible',
    );
  });

  it('solo el paso abierto lleva aria-current, y sigue al cambiar', async () => {
    const { fixture, links } = await mount();
    const current = () =>
      links()
        .filter((a) => a.getAttribute('aria-current') === 'step')
        .map((a) => a.getAttribute('href')!.split('/').pop());

    expect(current()).toEqual(['instrumental']);

    fixture.componentInstance.current.set('mesa-de-mayo');
    await fixture.whenStable();

    expect(current()).toEqual(['mesa-de-mayo']);
  });

  it('cada marca dice el estado de su paso, incluido el candado del último', async () => {
    const { marks } = await mount();

    expect(marks().map((mark) => mark.getAttribute('data-status'))).toEqual([
      'in_progress',
      'pending',
      'complete',
      'no_table',
      'locked',
    ]);
  });

  it('las marcas no se trazan al aparecer, pero sí cuando un paso cambia de estado', async () => {
    const { fixture, marks } = await mount();
    expect(marks().map((m) => m.getAttribute('data-animated'))).toEqual(Array(5).fill('false'));

    fixture.componentInstance.steps.set(
      STEPS.map((step) =>
        step.slug === 'instrumental' ? { ...step, mark: 'complete' as const } : step,
      ),
    );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(marks().map((m) => m.getAttribute('data-animated'))).toEqual([
      'false',
      'true',
      'false',
      'false',
      'false',
    ]);
  });

  it('la raya se coloca bajo el paso abierto y es decorativa', async () => {
    const { root } = await mount();
    const line = root.querySelector<HTMLElement>('.line')!;

    expect(line.getAttribute('aria-hidden')).toBe('true');
    expect(line.style.transform).toMatch(/^translateX\(/);
  });
});
