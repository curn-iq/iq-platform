import { TestBed } from '@angular/core/testing';
import type { SentFrame } from '../../camera/sent-frames';
import { BoardStage } from './board-stage';
import type { Mark } from './marks';

const frame: SentFrame = { number: 1, blob: new Blob(['jpeg']), width: 640, height: 360 };

describe('BoardStage', () => {
  const disconnect = vi.fn();
  const createObjectURL = vi.fn(() => 'blob:cuadro');
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    disconnect.mockClear();
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    // jsdom no mide ni observa: el escenario mide 300 × 400
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect = disconnect;
      },
    );
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300);
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(400);
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function render(marks: Mark[], mode: 'live' | 'frozen' = 'frozen') {
    const fixture = TestBed.createComponent(BoardStage);
    fixture.componentRef.setInput('mode', mode);
    fixture.componentRef.setInput('frame', mode === 'frozen' ? frame : null);
    fixture.componentRef.setInput('marks', marks);
    await fixture.whenStable();
    return { fixture, root: fixture.nativeElement as HTMLElement };
  }

  it('muestra el cuadro que se mandó, no el video', async () => {
    const { root } = await render([]);
    expect(root.querySelector('video')).toBeNull();
    expect(root.querySelector('img')?.getAttribute('src')).toBe('blob:cuadro');
  });

  it('en vivo muestra el video', async () => {
    const { root } = await render([], 'live');
    const video = root.querySelector('video')!;
    expect(video).not.toBeNull();
    expect(video.hasAttribute('playsinline')).toBe(true);
    expect(video.muted).toBe(true);
  });

  it('libera la dirección del cuadro al destruirse', async () => {
    const { fixture } = await render([]);
    fixture.destroy();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:cuadro');
    expect(disconnect).toHaveBeenCalled();
  });

  it('dibuja la caja de la pieza contando el recorte del cuadro', async () => {
    // 640 × 360 en 300 × 400: se agranda a 711 × 400 y sobran 205,6 px por lado
    const { root } = await render([
      { kind: 'piece', label: 'Mover · n.º 6', box: { x1: 0.4, y1: 0.25, x2: 0.6, y2: 0.5 } },
    ]);
    const box = root.querySelector<HTMLElement>('.piece')!;
    expect(parseFloat(box.style.left)).toBeCloseTo(-205.56 + 0.4 * 711.11, 1);
    expect(parseFloat(box.style.top)).toBeCloseTo(100, 1);
    expect(parseFloat(box.style.width)).toBeCloseTo(0.2 * 711.11, 1);
    expect(parseFloat(box.style.height)).toBeCloseTo(100, 1);
    expect(root.querySelector('.tag')?.textContent).toBe('Mover · n.º 6');
  });

  it('lo que cae del todo en el recorte no se dibuja', async () => {
    const { root } = await render([
      { kind: 'piece', label: 'Fuera', box: { x1: 0, y1: 0.3, x2: 0.1, y2: 0.4 } },
    ]);
    expect(root.querySelector('.piece')).toBeNull();
  });

  it('el nombre de lo que ve va sin caja, y debajo si arriba no cabe', async () => {
    const { root } = await render([
      { kind: 'name', label: 'Pinza Kelly', box: { x1: 0.4, y1: 0.01, x2: 0.5, y2: 0.1 } },
      { kind: 'name', label: 'Tijera', box: { x1: 0.4, y1: 0.5, x2: 0.5, y2: 0.6 } },
    ]);
    const names = root.querySelectorAll('.name');
    expect(names).toHaveLength(2);
    expect(root.querySelector('.piece')).toBeNull();
    expect(names[0].classList.contains('below')).toBe(true);
    expect(names[1].classList.contains('below')).toBe(false);
  });

  it('la flecha va desde la caja en la dirección del movimiento, con «VA AQUÍ»', async () => {
    const { root } = await render([
      {
        kind: 'arrow',
        box: { x1: 0.4, y1: 0.4, x2: 0.5, y2: 0.5 },
        direction: { x: 1, y: 0 },
      },
    ]);
    const line = root.querySelector('line')!;
    const x1 = parseFloat(line.getAttribute('x1')!);
    const x2 = parseFloat(line.getAttribute('x2')!);
    expect(x2).toBeGreaterThan(x1);
    expect(line.getAttribute('y1')).toBe(line.getAttribute('y2'));
    expect(root.querySelector('polygon')).not.toBeNull();
    expect(root.querySelector('.go')?.textContent).toBe('VA AQUÍ');
  });

  it('la flecha no se sale del escenario', async () => {
    const { root } = await render([
      {
        kind: 'arrow',
        box: { x1: 0.55, y1: 0.4, x2: 0.65, y2: 0.5 },
        direction: { x: 1, y: 0 },
      },
    ]);
    const x2 = parseFloat(root.querySelector('line')!.getAttribute('x2')!);
    expect(x2).toBeLessThanOrEqual(300 - 8);
  });

  it('el marcador que falta se dibuja punteado donde debería verse', async () => {
    const { root } = await render([{ kind: 'missing-marker', x: 0.5, y: 0.5 }], 'frozen');
    const square = root.querySelector<HTMLElement>('.missing')!;
    expect(parseFloat(square.style.left) + parseFloat(square.style.width) / 2).toBeCloseTo(150, 1);
    expect(parseFloat(square.style.top) + parseFloat(square.style.height) / 2).toBeCloseTo(200, 1);
  });

  it('las marcas no las lee el lector de pantalla: lo mismo está en la lista', async () => {
    const { root } = await render([
      { kind: 'name', label: 'X', box: { x1: 0.4, y1: 0.5, x2: 0.5, y2: 0.6 } },
    ]);
    expect(root.querySelector('.marks')?.getAttribute('aria-hidden')).toBe('true');
  });
});
