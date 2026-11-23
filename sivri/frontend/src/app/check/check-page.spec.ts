import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Layout } from '../core/layout/layout';
import { initialFlow, type FlowState } from '../domain/flow';
import { readFrame } from '../domain/frame-reading';
import { markerStatus } from '../domain/markers';
import { ALL_MARKERS, frame, object, technique } from '../domain/testing';
import { CheckPage } from './check-page';
import { CheckService, type LiveResult } from './check.service';

/** Un `CheckService` de mentira: las pantallas se prueban con el recorrido que se les dé. */
function fakeCheck() {
  return {
    flow: signal<FlowState>({ ...initialFlow, screen: 'framing' }),
    live: signal<LiveResult | null>(null),
    fixedFrame: signal(null),
    start: vi.fn(),
    setVideo: vi.fn(),
    pressReady: vi.fn(),
    openPiece: vi.fn(),
    back: vi.fn(),
    next: vi.fn(),
    reviewAgain: vi.fn(),
    stop: vi.fn(),
  };
}

describe('CheckPage', () => {
  let check: ReturnType<typeof fakeCheck>;

  async function render(tecnica?: string) {
    check = fakeCheck();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    TestBed.overrideComponent(CheckPage, {
      set: { providers: [{ provide: CheckService, useValue: check }] },
    });
    const fixture = TestBed.createComponent(CheckPage);
    if (tecnica) fixture.componentRef.setInput('tecnica', tecnica);
    await fixture.whenStable();
    return { fixture, root: fixture.nativeElement as HTMLElement };
  }

  /** Cambia el recorrido y deja que la pantalla se actualice. */
  async function update(fixture: { whenStable(): Promise<unknown> }, state: Partial<FlowState>) {
    check.flow.update((flow) => ({ ...flow, ...state }));
    await fixture.whenStable();
  }

  const threeMarkers = markerStatus(ALL_MARKERS.slice(0, 3));
  const fourMarkers = markerStatus(ALL_MARKERS);

  it('abre la cámara al entrar, con la técnica pedida si hay una', async () => {
    await render('t-1');
    expect(check.start).toHaveBeenCalledWith('t-1');
  });

  it('sin técnica pedida, SIVRI la reconoce', async () => {
    await render();
    expect(check.start).toHaveBeenCalledWith(undefined);
  });

  it('va sin la barra del shell y con «Salir» y «EN VIVO»', async () => {
    const { root } = await render();
    expect(TestBed.inject(Layout).immersive()).toBe(true);
    expect(root.querySelector('.exit')?.textContent).toContain('Salir');
    expect(root.querySelector('.exit')?.getAttribute('href')).toBe('/');
    expect(root.querySelector('.status')?.textContent?.trim()).toBe('EN VIVO');
  });

  it('con un error vuelve la barra del shell', async () => {
    const { fixture } = await render();
    await update(fixture, { error: 'no-connection' });
    expect(TestBed.inject(Layout).immersive()).toBe(false);
  });

  it('al salir de la pantalla vuelve la barra del shell', async () => {
    const { fixture } = await render();
    fixture.destroy();
    expect(TestBed.inject(Layout).immersive()).toBe(false);
  });

  describe('encuadrar', () => {
    it('dice «Encuadra la mesa.» y qué marcador falta, con el botón apagado', async () => {
      const { fixture, root } = await render();
      await update(fixture, { markers: threeMarkers });
      const panel = root.querySelector('app-framing-panel')!;
      expect(panel.querySelector('h1')?.textContent).toBe('Encuadra la mesa.');
      expect(panel.textContent).toContain('Falta el de abajo a la izquierda.');
      expect(panel.textContent).toContain('Revisa que no lo tape la mano ni el instrumental.');
      expect(panel.textContent).toContain('3 de 4');
      expect(panel.querySelector('button')?.disabled).toBe(true);
      expect(panel.textContent).toContain('Se activa cuando se ven los cuatro marcadores.');
    });
  });

  describe('armar', () => {
    const assembling = { screen: 'assembling' as const, markers: fourMarkers };

    it('con los cuatro marcadores dice «Arma la mesa.» y activa «Ya armé la mesa»', async () => {
      const { fixture, root } = await render();
      await update(fixture, assembling);
      const panel = root.querySelector('app-framing-panel')!;
      expect(panel.querySelector('h1')?.textContent).toBe('Arma la mesa.');
      expect(panel.textContent).toContain('4 de 4');
      const button = panel.querySelector('button')!;
      expect(button.disabled).toBe(false);
      button.click();
      expect(check.pressReady).toHaveBeenCalledOnce();
    });

    it('al pulsarlo, espera el resultado sin dejar pulsar otra vez', async () => {
      const { fixture, root } = await render();
      await update(fixture, { ...assembling, committed: true });
      const panel = root.querySelector('app-framing-panel')!;
      expect(panel.querySelector('h1')?.textContent).toBe('Revisando la mesa.');
      const button = panel.querySelector('button')!;
      expect(button.disabled).toBe(true);
      expect(button.textContent?.trim()).toBe('Revisando…');
    });
  });

  describe('para el lector de pantalla', () => {
    const announced = (root: HTMLElement) =>
      root.querySelector('[aria-live="polite"]') as HTMLElement;

    it('anuncia lo que falta y no se repite con cada cuadro', async () => {
      const { fixture, root } = await render();
      await update(fixture, { markers: threeMarkers });
      const first = announced(root).textContent;
      expect(first).toContain('Falta el de abajo a la izquierda.');
      const node = announced(root).firstChild;

      // Otro cuadro con lo mismo: el texto no cambia, así que el lector no vuelve a leerlo
      await update(fixture, { markers: markerStatus(ALL_MARKERS.slice(0, 3)) });
      expect(announced(root).firstChild).toBe(node);
      expect(announced(root).textContent).toBe(first);
    });

    it('anuncia cuando ya se ven los cuatro y cuando se espera el resultado', async () => {
      const { fixture, root } = await render();
      await update(fixture, { screen: 'assembling', markers: fourMarkers });
      expect(announced(root).textContent).toContain('Se ven los cuatro marcadores');
      await update(fixture, { committed: true });
      expect(announced(root).textContent).toContain('Revisando la mesa');
    });
  });

  describe('con el resultado fijado', () => {
    const result = readFrame(
      frame({
        techniques: [
          technique('t-1', 'Mastectomía', [
            object('in_place', 'A', 1),
            object('move', 'Pinza Kelly', 6, {
              message: 'Pinza Kelly (n.º 6): va en el centro.',
              move: { rows: 0, columns: 1 },
            }),
            object('missing', 'Mango', 10, { message: 'Falta Mango (n.º 10): va al final.' }),
          ]),
        ],
      }),
    );
    const fixed = { screen: 'result' as const, result, resultFrame: 3 };
    const sentFrame = { number: 3, blob: new Blob(['x']), width: 640, height: 360 };

    it('muestra el resultado y la barra dice «CUADRO FIJO»', async () => {
      const { fixture, root } = await render();
      await update(fixture, fixed);
      expect(root.querySelector('app-result-panel h1')?.textContent).toBe('1 de 3 en su lugar.');
      expect(root.querySelector('app-framing-panel')).toBeNull();
      expect(root.querySelector('.status')?.textContent?.trim()).toBe('CUADRO FIJO');
    });

    it('el escenario es el cuadro que se mandó, no el video', async () => {
      const { fixture, root } = await render();
      check.fixedFrame.set(sentFrame as never);
      await update(fixture, fixed);
      expect(root.querySelector('app-board-stage video')).toBeNull();
    });

    it('anuncia el resultado una vez', async () => {
      const { fixture, root } = await render();
      await update(fixture, fixed);
      expect(root.querySelector('[aria-live="polite"]')?.textContent).toContain(
        'Mastectomía. 1 de 3 en su lugar.',
      );
    });

    it('«Ver dónde va» abre la pieza y «Revisar de nuevo» vuelve a encuadrar', async () => {
      const { fixture, root } = await render();
      await update(fixture, fixed);
      root.querySelector<HTMLButtonElement>('app-result-panel .piece button')!.click();
      expect(check.openPiece).toHaveBeenCalledWith(0);
      root.querySelector<HTMLButtonElement>('app-result-panel button[appButton]')!.click();
      expect(check.reviewAgain).toHaveBeenCalledOnce();
    });

    it('en una pieza muestra su nombre y la siguiente, y el foco va al titular', async () => {
      const { fixture, root } = await render();
      await update(fixture, { ...fixed, screen: 'piece', pieceIndex: 0 });
      const panel = root.querySelector('app-piece-panel')!;
      expect(panel.querySelector('h1')?.textContent).toBe('Pinza Kelly');
      expect(panel.textContent).toContain('Siguiente: Mango');
      await new Promise((resolve) => setTimeout(resolve));
      expect(document.activeElement).toBe(panel.querySelector('h1'));
      panel.querySelectorAll<HTMLButtonElement>('nav button')[1].click();
      expect(check.next).toHaveBeenCalledOnce();
      panel.querySelectorAll<HTMLButtonElement>('nav button')[0].click();
      expect(check.back).toHaveBeenCalledOnce();
    });
  });
});
