import { TestBed } from '@angular/core/testing';
import { Viewer } from './viewer';

describe('Viewer', () => {
  afterEach(() => vi.restoreAllMocks());

  it('sin WebGL lo dice y ofrece la mesa en DataIQ, sin descargar Three.js', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const fixture = TestBed.createComponent(Viewer);
    fixture.componentRef.setInput('items', []);
    fixture.componentRef.setInput('techniqueName', 'Mastectomía');
    fixture.componentRef.setInput('dataiqUrl', '/tecnicas/t-1/mesa-de-mayo');
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Este navegador no puede mostrar la escena 3D');
    expect(element.textContent).toContain('La mesa de Mayo de Mastectomía se puede ver en DataIQ');
    expect(element.querySelector('a')?.getAttribute('href')).toBe('/tecnicas/t-1/mesa-de-mayo');
  });
});
