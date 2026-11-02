import { HttpTestingController } from '@angular/common/http/testing';
import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { VersionDetail } from '../../../data/api/models';
import { provideRepositoryTesting, TEST_API_BASE } from '../../../data/testing';
import { AUTOSAVE_DELAY_MS, EditorState } from './editor-state';

function version(id = 'v-1', state = 'draft', description: string | null = null): VersionDetail {
  return {
    summary: {
      id,
      technique_id: 't-1',
      technique: 'Colecistectomía',
      specialty: 'Cirugía general',
      number: 2,
      state,
      created_by: 'u-1',
      author: 'Ana Ruiz',
      updated_at: '2026-10-03T15:00:00Z',
    },
    content: {
      id: 't-1',
      name: 'Colecistectomía',
      specialty: 'Cirugía general',
      version_number: 2,
      cups_code: null,
      anesthesia: null,
      patient_position: null,
      drapes: null,
      description,
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
    rejections: [],
  } as VersionDetail;
}

/** Una pantalla que provee su propio `EditorState`, como `Editor`. */
@Component({ template: '', providers: [EditorState] })
class Host {
  readonly state = inject(EditorState);
}

describe('EditorState', () => {
  let state: EditorState;
  let http: HttpTestingController;

  const urlOf = (id = 'v-1') => `${TEST_API_BASE}/versions/${id}`;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [provideRepositoryTesting(), EditorState] });
    state = TestBed.inject(EditorState);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.useRealTimers();
    http.verify();
  });

  /** Edita la descripción: `edit` recibe el contenido completo. */
  const edit = (description: string) => state.edit((content) => ({ ...content, description }));

  describe('al cargar', () => {
    it('antes de llegar la versión no hay contenido ni se puede editar', () => {
      expect(state.content()).toBeUndefined();
      expect(state.editable()).toBe(false);
      expect(state.saveStatus()).toBe('unchanged');
    });

    it('un borrador se edita, y no pide nada hasta que cambie algo', () => {
      state.load(version('v-1', 'draft', 'Para qué sirve.'));

      expect(state.content()?.description).toBe('Para qué sirve.');
      expect(state.editable()).toBe(true);
      expect(state.saveStatus()).toBe('unchanged');
      vi.advanceTimersByTime(AUTOSAVE_DELAY_MS * 5);
      http.expectNone(() => true);
    });

    it('una versión en revisión se abre en solo lectura: editar no hace nada ni guarda', () => {
      state.load(version('v-1', 'in_review', 'Original.'));

      edit('Cambio');
      vi.advanceTimersByTime(AUTOSAVE_DELAY_MS * 5);

      expect(state.editable()).toBe(false);
      expect(state.content()?.description).toBe('Original.');
      expect(state.saveStatus()).toBe('unchanged');
      http.expectNone(() => true);
    });

    it('cargar la misma versión otra vez no pisa lo que se está editando', () => {
      state.load(version('v-1', 'draft', 'Original.'));
      edit('Editado');

      state.load(version('v-1', 'draft', 'Original.'));

      expect(state.content()?.description).toBe('Editado');
    });

    it('cargar otra versión manda lo pendiente de la anterior y se queda con la nueva', () => {
      state.load(version('v-1'));
      edit('De la primera');

      state.load(version('v-2', 'draft', 'De la segunda'));

      const request = http.expectOne(urlOf('v-1'));
      expect(request.request.body.description).toBe('De la primera');
      request.flush(version('v-1'));
      expect(state.content()?.description).toBe('De la segunda');
      expect(state.saveStatus()).toBe('unchanged');
    });
  });

  describe('guardar', () => {
    beforeEach(() => state.load(version()));

    it('cada cambio pasa por «guardando» y se guarda tras la espera, con todo el contenido', () => {
      edit('Extirpar la vesícula.');

      expect(state.saveStatus()).toBe('saving');
      vi.advanceTimersByTime(AUTOSAVE_DELAY_MS - 1);
      http.expectNone(() => true);

      vi.advanceTimersByTime(1);
      const request = http.expectOne(urlOf());
      expect(request.request.method).toBe('PUT');
      expect(request.request.body).toMatchObject({
        description: 'Extirpar la vesícula.',
        anesthesia: null,
        zones: [],
        items: [],
        sutures: [],
        equipment: [],
        devices: [],
      });
      expect(state.saveStatus()).toBe('saving');

      request.flush(version());
      expect(state.saveStatus()).toBe('saved');
    });

    it('lo que se escribe de corrido sale en una sola petición, con lo último', () => {
      edit('E');
      vi.advanceTimersByTime(AUTOSAVE_DELAY_MS - 100);
      edit('Ex');
      vi.advanceTimersByTime(AUTOSAVE_DELAY_MS - 100);
      edit('Ext');
      vi.advanceTimersByTime(AUTOSAVE_DELAY_MS);

      const request = http.expectOne(urlOf());
      expect(request.request.body.description).toBe('Ext');
      request.flush(version());
    });

    it('la respuesta no pisa lo que se escribió mientras iba', () => {
      edit('Primero');
      vi.advanceTimersByTime(AUTOSAVE_DELAY_MS);
      const first = http.expectOne(urlOf());

      edit('Segundo');
      first.flush(version('v-1', 'draft', 'Primero'));

      expect(state.content()?.description).toBe('Segundo');
    });

    it('nunca hay dos guardados a la vez: lo que llega mientras uno va se guarda al terminar', () => {
      edit('Primero');
      vi.advanceTimersByTime(AUTOSAVE_DELAY_MS);
      const first = http.expectOne(urlOf());

      edit('Segundo');
      vi.advanceTimersByTime(AUTOSAVE_DELAY_MS);
      http.expectNone(() => true);
      expect(state.saveStatus()).toBe('saving');

      first.flush(version());
      // Todavía queda lo segundo: no está «guardado»
      expect(state.saveStatus()).toBe('saving');
      const second = http.expectOne(urlOf());
      expect(second.request.body.description).toBe('Segundo');
      second.flush(version());
      expect(state.saveStatus()).toBe('saved');
    });

    it('si el cambio llega mientras va un guardado y su espera sigue corriendo, no se adelanta', () => {
      edit('Primero');
      vi.advanceTimersByTime(AUTOSAVE_DELAY_MS);
      const first = http.expectOne(urlOf());
      vi.advanceTimersByTime(200);
      edit('Segundo');

      first.flush(version());
      http.expectNone(() => true);

      vi.advanceTimersByTime(AUTOSAVE_DELAY_MS);
      http.expectOne(urlOf()).flush(version());
      expect(state.saveStatus()).toBe('saved');
    });
  });

  describe('si falla', () => {
    beforeEach(() => state.load(version()));

    const fail = () =>
      http.expectOne(urlOf()).flush(null, { status: 500, statusText: 'Server Error' });

    it('queda «failed» y lo pendiente sigue ahí', () => {
      edit('Algo');
      vi.advanceTimersByTime(AUTOSAVE_DELAY_MS);
      fail();

      expect(state.saveStatus()).toBe('failed');
      expect(state.hasUnsaved()).toBe(true);
    });

    it('«retry» vuelve a mandar lo mismo', () => {
      edit('Algo');
      vi.advanceTimersByTime(AUTOSAVE_DELAY_MS);
      fail();

      state.retry();

      const request = http.expectOne(urlOf());
      expect(request.request.body.description).toBe('Algo');
      expect(state.saveStatus()).toBe('saving');
      request.flush(version());
      expect(state.saveStatus()).toBe('saved');
      expect(state.hasUnsaved()).toBe(false);
    });

    it('seguir editando también lo reintenta, con todo junto', () => {
      edit('Algo');
      vi.advanceTimersByTime(AUTOSAVE_DELAY_MS);
      fail();

      edit('Algo más');
      expect(state.saveStatus()).toBe('saving');
      vi.advanceTimersByTime(AUTOSAVE_DELAY_MS);

      const request = http.expectOne(urlOf());
      expect(request.request.body.description).toBe('Algo más');
      request.flush(version());
      expect(state.saveStatus()).toBe('saved');
    });

    it('«retry» sin un fallo no manda nada', () => {
      state.retry();

      http.expectNone(() => true);
    });
  });

  describe('al salir', () => {
    beforeEach(() => state.load(version()));

    it('«flush» manda lo pendiente al momento, sin esperar', () => {
      edit('Pendiente');

      state.flush();

      expect(http.expectOne(urlOf()).request.body.description).toBe('Pendiente');
      // Su espera ya no corre: no se manda dos veces
      vi.advanceTimersByTime(AUTOSAVE_DELAY_MS * 2);
      http.expectNone(() => true);
    });

    it('«flush» sin nada pendiente no manda nada', () => {
      state.flush();

      http.expectNone(() => true);
    });

    it('al destruirse la pantalla que lo provee manda lo pendiente', () => {
      const fixture = TestBed.createComponent(Host);
      const own = fixture.componentInstance.state;
      own.load(version());
      own.edit((content) => ({ ...content, description: 'Pendiente' }));

      fixture.destroy();

      expect(http.expectOne(urlOf()).request.body.description).toBe('Pendiente');
    });

    it('«hasUnsaved» dice si hay algo por mandar o yendo', () => {
      expect(state.hasUnsaved()).toBe(false);
      edit('Algo');
      expect(state.hasUnsaved()).toBe(true);
      vi.advanceTimersByTime(AUTOSAVE_DELAY_MS);
      expect(state.hasUnsaved()).toBe(true);
      http.expectOne(urlOf()).flush(version());
      expect(state.hasUnsaved()).toBe(false);
    });

    it('«abandon» cancela lo pendiente y no guarda más: la versión ya no existe', () => {
      edit('Pendiente');

      state.abandon();
      vi.advanceTimersByTime(AUTOSAVE_DELAY_MS * 2);
      edit('Más');
      state.flush();

      http.expectNone(() => true);
      expect(state.hasUnsaved()).toBe(false);
    });
  });
});
