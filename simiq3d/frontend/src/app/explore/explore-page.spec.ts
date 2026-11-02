import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideRepositoryTesting, TEST_DATAIQ, TEST_SIMIQ3D } from '../data/testing';
import { ExplorePage } from './explore-page';

describe('ExplorePage', () => {
  beforeEach(() => {
    // Sin WebGL en las pruebas: el visor muestra su aviso y no descarga Three.js
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideRepositoryTesting()] });
  });

  afterEach(() => vi.restoreAllMocks());

  async function open(id?: string) {
    const fixture = TestBed.createComponent(ExplorePage);
    if (id) fixture.componentRef.setInput('id', id);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne(`${TEST_DATAIQ}/techniques`)
      .flush([{ id: 't-1', name: 'Mastectomía', specialty: 'Cirugía General', version_number: 1 }]);
    http
      .expectOne(`${TEST_SIMIQ3D}/models`)
      .flush([{ instrument_id: 'i-kelly', model_file: 'kelly_forceps.glb' }]);
    if (id) {
      http.expectOne(`${TEST_DATAIQ}/techniques/${id}/instruments`).flush({
        zones: [{ zone_id: 'z-mayo', zone: 'Mesa de Mayo', used: true, rows: 2, columns: 3 }],
        items: [
          {
            id: 'kelly',
            zone_id: 'z-mayo',
            zone: 'Mesa de Mayo',
            legend_number: 4,
            source_text: 'Pinza Kelly',
            components: [{ instrument_id: 'i-kelly', suture_id: null, name: 'Pinza Kelly' }],
            cells: [{ row: 1, column: 2 }],
          },
        ],
        sutures: [],
        equipment: [],
        devices: [],
      });
    }
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('sin técnica, pide elegir una de la lista', async () => {
    const page = await open();
    expect(page.querySelector('nav a')?.textContent).toContain('Mastectomía');
    expect(page.textContent).toContain('Elegir una técnica');
  });

  it('con técnica, muestra su leyenda con el número del diagrama', async () => {
    const page = await open('t-1');
    expect(page.querySelector('nav a')?.getAttribute('aria-current')).toBe('page');
    expect(page.querySelector('.legend li')?.textContent).toContain('4');
    expect(page.querySelector('.legend li')?.textContent).toContain('Pinza Kelly');
  });

  it('tocar una pieza de la leyenda la señala, y tocarla otra vez la suelta', async () => {
    const page = await open('t-1');
    const button = page.querySelector<HTMLButtonElement>('.legend button')!;
    button.click();
    TestBed.tick();
    expect(button.getAttribute('aria-pressed')).toBe('true');
    button.click();
    TestBed.tick();
    expect(button.getAttribute('aria-pressed')).toBe('false');
  });
});
