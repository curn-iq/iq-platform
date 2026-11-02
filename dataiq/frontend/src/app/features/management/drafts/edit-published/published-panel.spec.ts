import { HttpTestingController } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SessionService } from '../../../../core/session/session.service';
import { provideRepositoryTesting, TEST_API_BASE } from '../../../../data/testing';
import { PublishedPanel } from './published-panel';

@Component({ template: '' })
class Blank {}

const SPECIALTIES = [
  { id: 's-1', name: 'Cirugía general' },
  { id: 's-2', name: 'Urología' },
];

const TECHNIQUES = [
  { id: 't-1', name: 'Colecistectomía', specialty: 'Cirugía general', version_number: 1 },
  { id: 't-2', name: 'Tiroidectomía', specialty: 'Cirugía general', version_number: 3 },
  { id: 't-3', name: 'Prostatectomía', specialty: 'Urología', version_number: 2 },
];

const IN_PROGRESS = [
  { id: 'v-1', technique_id: 't-1', created_by: 'u-1', author: 'Ana Ruiz', state: 'draft' },
  { id: 'v-3', technique_id: 't-3', created_by: 'u-2', author: 'Daniela Ortiz', state: 'draft' },
];

const SERVER_ERROR = { status: 500, statusText: 'Server Error' };

describe('PublishedPanel', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<PublishedPanel>;
  let router: Router;
  let root: HTMLElement;

  async function settle(): Promise<void> {
    for (let i = 0; i < 3; i++) {
      await Promise.resolve();
      TestBed.tick();
    }
    fixture.detectChanges();
  }

  async function open(answers = true): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideRepositoryTesting(),
        provideRouter([{ path: 'gestion/editor/:versionId/:paso', component: Blank }]),
        { provide: SessionService, useValue: { account: signal({ id: 'u-1' }) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(PublishedPanel);
    root = fixture.nativeElement;
    await settle();
    if (answers) await respond();
  }

  async function respond(
    techniques: object = TECHNIQUES,
    inProgress: object = IN_PROGRESS,
  ): Promise<void> {
    http.expectOne(`${TEST_API_BASE}/techniques`).flush(techniques);
    http.expectOne(`${TEST_API_BASE}/specialties`).flush(SPECIALTIES);
    http.expectOne((r) => r.url === `${TEST_API_BASE}/versions`).flush(inProgress);
    await settle();
  }

  const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim();
  const groups = () =>
    Array.from(root.querySelectorAll('section')).map(
      (section): [string | undefined, (string | undefined)[]] => [
        text(section.querySelector('h3')),
        Array.from(section.querySelectorAll('li')).map((li) => text(li)),
      ],
    );
  const search = () => root.querySelector<HTMLInputElement>('input')!;
  const choice = (name: string) =>
    Array.from(root.querySelectorAll<HTMLButtonElement>('button.choice')).find((b) =>
      text(b)!.startsWith(name),
    )!;

  async function type(value: string): Promise<void> {
    search().value = value;
    search().dispatchEvent(new Event('input', { bubbles: true }));
    await settle();
  }

  afterEach(() => http.verify());

  describe('al abrirse', () => {
    it('es un diálogo con nombre', async () => {
      await open();

      expect(root.getAttribute('role')).toBe('dialog');
      expect(root.getAttribute('aria-label')).toBe('Editar una técnica publicada');
    });

    it('pide las técnicas, las especialidades y las versiones en curso, y mientras tanto dice «Cargando…»', async () => {
      await open(false);

      expect(text(root.querySelector('.notice'))).toBe('Cargando…');
      expect(root.querySelector('.list')).toBeNull();

      const versions = http.expectOne((r) => r.url === `${TEST_API_BASE}/versions`);
      expect(versions.request.params.keys()).toEqual([]);
      http.expectOne(`${TEST_API_BASE}/techniques`).flush([]);
      http.expectOne(`${TEST_API_BASE}/specialties`).flush([]);
      versions.flush([]);
      await settle();
    });

    it('lleva el cursor al buscador', async () => {
      await open();

      expect(document.activeElement).toBe(search());
    });

    it('las técnicas van agrupadas por especialidad, en el orden de la API', async () => {
      await open();

      expect(groups().map(([specialty]) => specialty)).toEqual(['Cirugía general', 'Urología']);
      expect(groups()[0]?.[1]).toEqual(['Colecistectomía Ya está en curso', 'Tiroidectomía']);
    });
  });

  describe('lo que ya está en curso', () => {
    it('la propia dice «Ya está en curso» y la de otra persona, quién la tiene', async () => {
      await open();

      expect(groups()[0]?.[1][0]).toBe('Colecistectomía Ya está en curso');
      expect(groups()[1]?.[1][0]).toBe('Prostatectomía En curso por Daniela Ortiz');
    });

    it('no se puede abrir: sale atenuada, sin botón', async () => {
      await open();

      expect(root.querySelectorAll('.busy')).toHaveLength(2);
      expect(root.querySelectorAll('button.choice')).toHaveLength(1);
      expect(text(choice('Tiroidectomía'))).toBe('Tiroidectomía');
    });
  });

  describe('buscar', () => {
    it('filtra sin tildes ni mayúsculas y resalta lo que coincide', async () => {
      await open();

      await type('TIROIDEC');

      expect(groups()).toEqual([['Cirugía general', ['Tiroidectomía']]]);
      expect(root.querySelector('mark')!.textContent).toBe('Tiroidec');
    });

    it('buscar el nombre de una especialidad trae todas sus técnicas', async () => {
      await open();

      await type('urologia');

      expect(groups()).toEqual([['Urología', ['Prostatectomía En curso por Daniela Ortiz']]]);
    });

    it('sin coincidencias lo dice', async () => {
      await open();

      await type('zzz');

      expect(text(root.querySelector('.empty'))).toBe('Ninguna técnica publicada coincide.');
    });
  });

  describe('elegir una técnica', () => {
    it('crea la versión nueva y lleva a ella', async () => {
      await open();

      choice('Tiroidectomía').click();
      await settle();

      const request = http.expectOne(`${TEST_API_BASE}/techniques/t-2/versions`);
      expect(request.request.method).toBe('POST');
      expect(choice('Tiroidectomía').getAttribute('aria-busy')).toBe('true');
      request.flush({ summary: { id: 'v-9' }, content: {} });
      await settle();
      await fixture.whenStable();

      expect(router.url).toBe('/gestion/editor/v-9/datos-clinicos');
    });

    it('un segundo toque mientras va el primero no pide otra versión', async () => {
      await open();

      choice('Tiroidectomía').click();
      choice('Tiroidectomía').click();
      await settle();

      http.expectOne(`${TEST_API_BASE}/techniques/t-2/versions`).flush({ summary: { id: 'v-9' } });
      await settle();
    });

    it('un 409 lo dice bajo la fila, que queda atenuada y sin botón', async () => {
      await open();

      choice('Tiroidectomía').click();
      await settle();
      http
        .expectOne(`${TEST_API_BASE}/techniques/t-2/versions`)
        .flush(
          { detail: 'La técnica ya tiene una versión en curso' },
          { status: 409, statusText: 'Conflict' },
        );
      await settle();

      const rows = groups()[0]?.[1];
      expect(rows?.[1]).toBe('Tiroidectomía La técnica ya tiene una versión en curso');
      expect(root.querySelector('button.choice')).toBeNull();
      expect(root.querySelector('small[role="alert"]')!.textContent).toBe(
        'La técnica ya tiene una versión en curso',
      );
      expect(router.url).toBe('/');
    });

    it('otro error no marca la fila: se puede volver a intentar', async () => {
      await open();

      choice('Tiroidectomía').click();
      await settle();
      http.expectOne(`${TEST_API_BASE}/techniques/t-2/versions`).flush(null, SERVER_ERROR);
      await settle();

      expect(choice('Tiroidectomía').getAttribute('aria-busy')).toBe('false');
      expect(root.querySelector('small[role="alert"]')).toBeNull();
    });
  });

  describe('si falla', () => {
    it('lo dice y «Reintentar» pide solo lo que falló', async () => {
      await open(false);
      http.expectOne(`${TEST_API_BASE}/techniques`).flush(TECHNIQUES);
      http.expectOne(`${TEST_API_BASE}/specialties`).flush(null, SERVER_ERROR);
      http.expectOne((r) => r.url === `${TEST_API_BASE}/versions`).flush(IN_PROGRESS);
      await settle();

      expect(text(root.querySelector('.notice'))).toContain(
        'No se pudieron cargar las técnicas publicadas.',
      );
      expect(root.querySelector('.list')).toBeNull();

      root.querySelector<HTMLButtonElement>('.notice button')!.click();
      await settle();
      http.expectOne(`${TEST_API_BASE}/specialties`).flush(SPECIALTIES);
      await settle();

      expect(groups().map(([specialty]) => specialty)).toEqual(['Cirugía general', 'Urología']);
    });
  });
});
