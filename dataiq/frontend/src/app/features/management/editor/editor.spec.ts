import { HttpTestingController } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { SessionService } from '../../../core/session/session.service';
import { provideRepositoryTesting, TEST_API_BASE } from '../../../data/testing';
import type { Role } from '../../../domain/role';
import { Editor } from './editor';
import { EditorState } from './editor-state';

@Component({ template: '' })
class Blank {}

const ID = '019a0c1e-7b3d-7c2a-9e4f-0a1b2c3d4e5f';
const VERSION_URL = `${TEST_API_BASE}/versions/${ID}`;

function version(state = 'draft', number = 2, rejections: object[] = []) {
  return {
    summary: {
      id: ID,
      technique_id: 't-1',
      technique: 'Colecistectomía',
      specialty: 'Cirugía general',
      number,
      state,
      created_by: 'u-1',
      author: 'Ana Ruiz',
      updated_at: '2026-10-03T15:00:00Z',
    },
    content: {
      id: 't-1',
      name: 'Colecistectomía',
      specialty: 'Cirugía general',
      version_number: number,
      cups_code: null,
      anesthesia: null,
      patient_position: null,
      drapes: null,
      description: null,
      indications: null,
      complications: null,
      surgical_technique: null,
      source: null,
      zones: [],
      items: [],
      sutures: [],
      equipment: [],
      devices: [],
    },
    rejections,
  };
}

describe('Editor', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let router: Router;
  let root: HTMLElement;

  async function configure(role: Role = 'contributor'): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideRepositoryTesting(),
        provideRouter([
          { path: 'gestion/editor/nueva', component: Editor },
          { path: 'gestion/editor/:versionId/:paso', component: Editor },
          { path: 'tecnicas/:id/:pestana', component: Blank },
        ]),
        { provide: SessionService, useValue: { role: signal(role) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  }

  const text = (selector: string) =>
    root.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
  const links = () => Array.from(root.querySelectorAll<HTMLAnchorElement>('app-editor-steps a'));
  const footerLinks = () => Array.from(root.querySelectorAll<HTMLAnchorElement>('.footer a'));
  const state = () => harness.routeDebugElement!.injector.get(EditorState);
  const hint = (slug: string) => text(`app-editor-steps a[href$="/${slug}"] .hint`);

  async function settle(): Promise<void> {
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  async function open(path = 'datos-clinicos', body: object = version()): Promise<void> {
    await harness.navigateByUrl(`/gestion/editor/${ID}/${path}`);
    root = harness.routeNativeElement as HTMLElement;
    http.expectOne(VERSION_URL).flush(body);
    if (['instrumental', 'mesa-de-mayo', 'mesa-de-reserva'].includes(path)) {
      // Estos pasos piden el catálogo al abrirse: sin responderlo no hay estabilidad
      for (let i = 0; i < 3; i++) {
        await Promise.resolve();
        harness.detectChanges();
      }
      await answerCatalog();
    } else {
      await settle();
    }
  }

  async function answerCatalog(): Promise<void> {
    http.expectOne(`${TEST_API_BASE}/catalog/full`).flush({
      specialties: [],
      zones: [
        { id: 'z-mayo', name: 'Mesa de Mayo' },
        { id: 'z-res', name: 'Mesa de reserva' },
      ],
      categories: [{ id: 'c-1', name: 'Pinza' }],
      instruments: [],
      sutures: [],
      equipment: [],
      devices: [],
      techniques: [],
    });
    await settle();
  }

  /** Manda ya lo pendiente y lo responde: así ninguna prueba deja un guardado a medias. */
  async function saveNow(): Promise<void> {
    state().flush();
    http.expectOne(VERSION_URL).flush(version());
    await settle();
  }

  afterEach(() => http.verify());

  describe('una técnica nueva', () => {
    it('sin versión pide nombre y especialidad', async () => {
      await configure();
      await harness.navigateByUrl('/gestion/editor/nueva');
      root = harness.routeNativeElement as HTMLElement;
      http.expectOne(`${TEST_API_BASE}/specialties`).flush([]);

      expect(root.querySelector('app-new-technique')).not.toBeNull();
      expect(root.querySelector('app-more-actions')).toBeNull();
      expect(root.querySelector('app-editor-steps')).toBeNull();
    });
  });

  describe('la cabecera', () => {
    beforeEach(() => configure('contributor'));

    it('pide la versión y muestra la ruta de vuelta, el nombre, la especialidad, la versión y el estado', async () => {
      await harness.navigateByUrl(`/gestion/editor/${ID}/datos-clinicos`);
      root = harness.routeNativeElement as HTMLElement;
      expect(root.querySelector('h1')).toBeNull();
      expect(root.querySelector('section')!.getAttribute('aria-busy')).toBe('true');
      http.expectOne(VERSION_URL).flush(version());
      await settle();

      expect(root.querySelector('app-new-technique')).toBeNull();
      expect(text('.route')).toBe('Mis borradores');
      expect(root.querySelector('.route')!.getAttribute('href')).toBe('/gestion/borradores');
      expect(text('h1')).toBe('Colecistectomía');
      expect(text('.meta')).toBe('Cirugía general · Versión 2 Borrador');
      expect(root.querySelector('section')!.getAttribute('aria-busy')).toBeNull();
    });

    it('lleva «Más acciones»', async () => {
      await open();

      expect(
        root.querySelector('app-more-actions button[aria-label="Más acciones"]'),
      ).not.toBeNull();
    });

    it('un borrador con devoluciones dice «Devuelta»', async () => {
      await open('datos-clinicos', version('draft', 2, [{ reason: 'Falta la fuente.' }]));

      expect(text('app-status-pill')).toBe('Devuelta');
    });

    it('una versión que ya no está en curso no lleva pastilla de borrador', async () => {
      await open('datos-clinicos', version('published'));

      expect(root.querySelector('app-status-pill')).toBeNull();
      expect(text('h1')).toBe('Colecistectomía');
    });

    describe('«Ver la versión publicada»', () => {
      it('desde la versión 2 lleva al detalle de la técnica', async () => {
        await open('datos-clinicos', version('draft', 2));

        const link = root.querySelector<HTMLAnchorElement>('.published')!;
        expect(text('.published')).toBe('Ver la versión publicada');
        expect(link.getAttribute('href')).toBe('/tecnicas/t-1/datos-clinicos');
      });

      it('la versión 1 no tiene una publicada que ver', async () => {
        await open('datos-clinicos', version('draft', 1));

        expect(root.querySelector('.published')).toBeNull();
      });
    });
  });

  describe('lo que no existe', () => {
    beforeEach(() => configure('contributor'));

    it('si la API responde 404, «No encontrada»', async () => {
      await harness.navigateByUrl(`/gestion/editor/${ID}/datos-clinicos`);
      root = harness.routeNativeElement as HTMLElement;
      http.expectOne(VERSION_URL).flush(null, { status: 404, statusText: 'Not Found' });
      await settle();

      expect(root.querySelector('app-not-found')).not.toBeNull();
      expect(root.querySelector('h1')!.textContent).toContain('No encontrada');
    });

    it('un id que no puede ser de una versión es «No encontrada» y ni se pide', async () => {
      await harness.navigateByUrl('/gestion/editor/abc/datos-clinicos');
      root = harness.routeNativeElement as HTMLElement;

      expect(root.querySelector('app-not-found')).not.toBeNull();
      http.expectNone(() => true);
    });

    it('un paso que no es uno de los cinco es «No encontrada» y ni se pide la versión', async () => {
      await harness.navigateByUrl(`/gestion/editor/${ID}/paso-9`);
      root = harness.routeNativeElement as HTMLElement;

      expect(root.querySelector('app-not-found')).not.toBeNull();
      http.expectNone(() => true);
    });

    it('si la API falla por otra cosa (el interceptor avisa), queda la ruta de vuelta', async () => {
      await harness.navigateByUrl(`/gestion/editor/${ID}/datos-clinicos`);
      root = harness.routeNativeElement as HTMLElement;
      http.expectOne(VERSION_URL).flush(null, { status: 500, statusText: 'Server Error' });
      await settle();

      expect(root.querySelector('app-not-found')).toBeNull();
      expect(root.querySelector('.route')).not.toBeNull();
      expect(root.querySelector('h1')).toBeNull();
    });
  });

  describe('los pasos', () => {
    beforeEach(() => configure('contributor'));

    it('son cinco enlaces a la URL de cada paso, con el abierto marcado', async () => {
      await open('instrumental');

      expect(links().map((a) => a.getAttribute('href'))).toEqual([
        `/gestion/editor/${ID}/datos-clinicos`,
        `/gestion/editor/${ID}/instrumental`,
        `/gestion/editor/${ID}/mesa-de-mayo`,
        `/gestion/editor/${ID}/mesa-de-reserva`,
        `/gestion/editor/${ID}/revisar`,
      ]);
      expect(
        links()
          .filter((a) => a.getAttribute('aria-current') === 'step')
          .map((a) => a.getAttribute('href')!.split('/').pop()),
      ).toEqual(['instrumental']);
    });

    it('una versión vacía: lo que falta de cada paso y el último, bloqueado', async () => {
      await open();

      expect(
        ['datos-clinicos', 'instrumental', 'mesa-de-mayo', 'mesa-de-reserva', 'revisar'].map(hint),
      ).toEqual([
        'Faltan 7 campos',
        'Sin instrumental',
        'Sin arreglo disponible',
        'Sin arreglo disponible',
        'Faltan 2 pasos',
      ]);
      expect(
        Array.from(root.querySelectorAll('app-editor-steps app-progress-mark')).map((m) =>
          m.getAttribute('data-status'),
        ),
      ).toEqual(['pending', 'pending', 'no_table', 'no_table', 'locked']);
    });

    it('el último paso es «Revisar y enviar» para el colaborador', async () => {
      await open();

      expect(text('a[href$="/revisar"] .name')).toBe('5Revisar y enviar');
    });

    it('la hoja de los datos clínicos tiene su paso, con el nombre y la especialidad de la versión', async () => {
      await open('datos-clinicos');

      const step = root.querySelector('.sheet app-clinical-step');
      expect(step).not.toBeNull();
      expect(
        Array.from(step!.querySelectorAll<HTMLInputElement>('.identity input')).map((i) => i.value),
      ).toEqual(['Colecistectomía', 'Cirugía general']);
      expect(root.querySelector('.sheet')!.getAttribute('aria-label')).toBe('Datos clínicos');
    });

    it('lo que se escribe en la hoja se refleja en lo que falta del paso', async () => {
      await open('datos-clinicos');
      const label = Array.from(root.querySelectorAll('.sheet label')).find((l) =>
        l.textContent!.trim().startsWith('Anestesia'),
      )!;
      const input = root.querySelector<HTMLInputElement>(`#${label.getAttribute('for')}`)!;

      input.value = 'General.';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await settle();

      expect(hint('datos-clinicos')).toBe('Faltan 6 campos');
      await saveNow();
    });

    it('la hoja del instrumental tiene su paso, con la técnica y su especialidad, y pide el catálogo', async () => {
      await open('instrumental');

      expect(root.querySelector('.sheet app-instrumental-step')).not.toBeNull();
      expect(root.querySelector('.sheet app-clinical-step')).toBeNull();
      expect(text('.sheet .title h2')).toBe('Instrumental');
      expect(text('.sheet #suggested-title')).toBe('Sugeridos para Cirugía general');
    });

    it('cada mesa tiene su hoja, con su nombre, y piden el catálogo', async () => {
      await open('mesa-de-mayo');

      expect(root.querySelector('.sheet app-table-step')).not.toBeNull();
      expect(root.querySelector('.sheet app-instrumental-step')).toBeNull();
      expect(text('.sheet .title h2')).toBe('Mesa de Mayo');
      expect(root.querySelector('.sheet .not-carried')).toBeNull();
    });

    it('la hoja de la mesa de reserva es la de reserva, con su casilla «no lleva»', async () => {
      await open('mesa-de-reserva');

      expect(text('.sheet .title h2')).toBe('Mesa de reserva');
      expect(root.querySelector('.sheet .not-carried')).not.toBeNull();
    });

    it('la hoja de revisar resume las secciones y manda la versión; un colaborador envía', async () => {
      await open('revisar');

      expect(root.querySelector('.sheet app-review-step')).not.toBeNull();
      expect(text('.sheet .title h2')).toBe('Revisar y enviar');
      expect(root.querySelectorAll('.sheet .summary li')).toHaveLength(4);
      expect(text('.sheet .submit')).toBe('Enviar a revisión');
    });

    it('lo armado en la mesa se refleja en lo que dice el paso y se guarda', async () => {
      await open('mesa-de-mayo');
      state().edit((content) => ({
        ...content,
        zones: [{ zone_id: 'z-mayo', zone: 'Mesa de Mayo', used: true, rows: 4, columns: 6 }],
        items: [
          {
            zone_id: 'z-mayo',
            legend_number: 1,
            source_text: 'Gasa',
            components: [{ instrument_id: 'i-gasa', suture_id: null, name: 'Gasa' }],
            cells: [{ row: 1, column: 1 }],
          },
        ],
      }));
      harness.detectChanges();

      expect(hint('mesa-de-mayo')).toBe('1 de 1 ubicados');
      await saveNow();
    });

    it('lo agregado en el instrumental se refleja en lo que dice el paso y se guarda', async () => {
      await open('instrumental');
      state().edit((content) => ({
        ...content,
        items: [
          {
            zone_id: null,
            legend_number: null,
            source_text: 'Gasa',
            components: [{ instrument_id: 'i-gasa', suture_id: null, name: 'Gasa' }],
            cells: [],
          },
        ],
      }));
      harness.detectChanges();

      expect(hint('instrumental')).toBe('1 objeto');
      await saveNow();
    });

    it('lo que falta sigue a lo que se edita, al momento', async () => {
      await open();

      state().edit((content) => ({
        ...content,
        description: 'Para qué sirve.',
        drapes: 'Campos.',
      }));
      harness.detectChanges();

      expect(hint('datos-clinicos')).toBe('Faltan 5 campos');
      await saveNow();
    });
  });

  describe('la barra de abajo', () => {
    beforeEach(() => configure('contributor'));

    it('en el primer paso solo tiene «Siguiente», con el nombre del que sigue', async () => {
      await open('datos-clinicos');

      expect(text('.footer .count')).toBe('Paso 1 de 5 · Datos clínicos');
      expect(footerLinks().map((a) => a.textContent!.trim())).toEqual(['Siguiente: Instrumental']);
      expect(footerLinks()[0].getAttribute('href')).toBe(`/gestion/editor/${ID}/instrumental`);
    });

    it('en un paso del medio tiene «Anterior» y «Siguiente»', async () => {
      await open('mesa-de-mayo');

      expect(text('.footer .count')).toBe('Paso 3 de 5 · Mesa de Mayo');
      expect(footerLinks().map((a) => a.textContent!.trim())).toEqual([
        'Anterior',
        'Siguiente: Mesa de reserva',
      ]);
      expect(footerLinks()[0].getAttribute('href')).toBe(`/gestion/editor/${ID}/instrumental`);
    });

    it('en el último paso solo tiene «Anterior»', async () => {
      await open('revisar');

      expect(text('.footer .count')).toBe('Paso 5 de 5 · Revisar y enviar');
      expect(footerLinks().map((a) => a.textContent!.trim())).toEqual(['Anterior']);
    });

    it('cambiar de paso con la barra cambia la URL y el paso abierto, sin volver a pedir la versión', async () => {
      await open('datos-clinicos');

      footerLinks()[0].click();
      await vi.waitFor(() => {
        harness.detectChanges();
        expect(router.url).toBe(`/gestion/editor/${ID}/instrumental`);
      });
      for (let i = 0; i < 3; i++) {
        await Promise.resolve();
        harness.detectChanges();
      }
      // Pasar a un paso nuevo no vuelve a pedir la versión; el instrumental sí pide su catálogo
      await answerCatalog();

      expect(router.url).toBe(`/gestion/editor/${ID}/instrumental`);
      expect(text('.footer .count')).toBe('Paso 2 de 5 · Instrumental');
      expect(
        links()
          .find((a) => a.getAttribute('aria-current') === 'step')!
          .getAttribute('href'),
      ).toBe(`/gestion/editor/${ID}/instrumental`);
      http.expectNone(() => true);
    });
  });

  describe('quien publica lo suyo (revisor o admin)', () => {
    it('el último paso es «Revisar y publicar»', async () => {
      await configure('reviewer');
      await open('revisar');

      expect(text('a[href$="/revisar"] .name')).toBe('5Revisar y publicar');
      expect(text('.footer .count')).toBe('Paso 5 de 5 · Revisar y publicar');
    });
  });

  describe('el autoguardado', () => {
    beforeEach(() => configure('contributor'));

    it('al abrir dice «Sin cambios todavía»', async () => {
      await open();

      expect(text('.saved')).toBe('Sin cambios todavía');
    });

    it('cada cambio pasa por «Guardando…» y queda «Guardado hace un momento»', async () => {
      await open();

      state().edit((content) => ({ ...content, description: 'Nuevo' }));
      harness.detectChanges();
      expect(text('.saved')).toBe('Guardando…');
      expect(root.querySelector('.saved .spinner')).not.toBeNull();

      state().flush();
      const request = http.expectOne(VERSION_URL);
      expect(request.request.method).toBe('PUT');
      expect(request.request.body.description).toBe('Nuevo');
      request.flush(version());
      await settle();

      expect(text('.saved')).toBe('Guardado hace un momento');
    });

    it('si falla lo dice y «Reintentar» vuelve a guardar', async () => {
      await open();
      state().edit((content) => ({ ...content, description: 'Nuevo' }));
      state().flush();
      http.expectOne(VERSION_URL).flush(null, { status: 500, statusText: 'Server Error' });
      await settle();

      expect(text('.saved')).toContain('No se pudo guardar.');
      root.querySelector<HTMLButtonElement>('.saved .retry')!.click();
      await settle();
      expect(text('.saved')).toBe('Guardando…');
      http.expectOne(VERSION_URL).flush(version());
      await settle();

      expect(text('.saved')).toBe('Guardado hace un momento');
    });
  });

  describe('una versión en revisión', () => {
    beforeEach(() => configure('contributor'));

    it('se abre en solo lectura: dice por qué y no hay autoguardado', async () => {
      await open('datos-clinicos', version('in_review'));

      expect(text('.read-only')).toBe(
        'Mientras esté en revisión no se puede editar; si el revisor la devuelve, vuelve a Mis borradores con su comentario.',
      );
      expect(root.querySelector('.saved')).toBeNull();
      expect(text('app-status-pill')).toBe('En revisión');
      expect(state().editable()).toBe(false);
    });

    it('los pasos y la barra se recorren igual', async () => {
      await open('instrumental', version('in_review'));

      expect(links()).toHaveLength(5);
      expect(footerLinks().map((a) => a.textContent!.trim())).toEqual([
        'Anterior',
        'Siguiente: Mesa de Mayo',
      ]);
    });

    it('un borrador no lleva esa frase', async () => {
      await open();

      expect(root.querySelector('.read-only')).toBeNull();
    });
  });

  describe('al salir', () => {
    beforeEach(() => configure('contributor'));

    it('con cambios sin guardar el navegador pide confirmar y se manda lo pendiente', async () => {
      await open();
      state().edit((content) => ({ ...content, description: 'Pendiente' }));

      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      http.expectOne(VERSION_URL).flush(version());
      await settle();
    });

    it('sin nada pendiente no pide confirmar', async () => {
      await open();

      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
      http.expectNone(() => true);
    });

    it('al irse de la pantalla manda lo pendiente', async () => {
      await open();
      state().edit((content) => ({ ...content, description: 'Pendiente' }));

      await harness.navigateByUrl('/tecnicas/t-1/datos-clinicos');

      expect(http.expectOne(VERSION_URL).request.body.description).toBe('Pendiente');
    });
  });
});
