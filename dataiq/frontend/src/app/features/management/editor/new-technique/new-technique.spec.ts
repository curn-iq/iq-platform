import { HttpTestingController } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideRepositoryTesting, TEST_API_BASE } from '../../../../data/testing';
import { NewTechnique } from './new-technique';

@Component({ template: '' })
class Blank {}

const SPECIALTIES = [
  { id: 's-1', name: 'Cirugía general' },
  { id: 's-2', name: 'Urología' },
];

describe('NewTechnique', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<NewTechnique>;
  let router: Router;
  let root: HTMLElement;

  async function settle(): Promise<void> {
    for (let i = 0; i < 3; i++) {
      await Promise.resolve();
      TestBed.tick();
    }
    fixture.detectChanges();
  }

  async function open(): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideRepositoryTesting(),
        provideRouter([
          { path: 'gestion/borradores', component: Blank },
          { path: 'gestion/editor/:versionId/:paso', component: Blank },
        ]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(NewTechnique);
    root = fixture.nativeElement;
    await settle();
    http.expectOne(`${TEST_API_BASE}/specialties`).flush(SPECIALTIES);
    await settle();
  }

  const nameInput = () => root.querySelector<HTMLInputElement>('app-text-field input')!;
  const select = () => root.querySelector<HTMLSelectElement>('select')!;
  const badges = () => Array.from(root.querySelectorAll('.badge')).map((b) => b.textContent);
  const text = (el: Element | null) => el?.textContent?.replace(/\s+/g, ' ').trim();

  async function type(value: string): Promise<void> {
    nameInput().value = value;
    nameInput().dispatchEvent(new Event('input', { bubbles: true }));
    await settle();
  }

  async function leaveName(): Promise<void> {
    nameInput().dispatchEvent(new Event('blur'));
    await settle();
  }

  async function pressEnter(): Promise<void> {
    nameInput().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await settle();
  }

  async function choose(id: string): Promise<void> {
    select().value = id;
    select().dispatchEvent(new Event('change', { bubbles: true }));
    await settle();
  }

  /** Responde la creación con la versión 1 y deja que la navegación termine. */
  async function created(
    request = http.expectOne(`${TEST_API_BASE}/techniques`),
    versionId = 'v-1',
  ): Promise<void> {
    request.flush({ summary: { id: versionId }, content: {} });
    await settle();
    await fixture.whenStable();
  }

  afterEach(() => http.verify());

  describe('la pantalla', () => {
    it('es «Técnica nueva», versión 1, con la ruta de vuelta a Mis borradores', async () => {
      await open();

      expect(text(root.querySelector('h1'))).toBe('Técnica nueva');
      expect(text(root.querySelector('.version'))).toBe('Versión 1');
      expect(root.querySelector('.route')!.getAttribute('href')).toBe('/gestion/borradores');
    });

    it('el titular sigue lo que se escribe en el nombre y vuelve a «Técnica nueva» sin nada', async () => {
      await open();

      await type('Colecistectomía');
      expect(text(root.querySelector('h1'))).toBe('Colecistectomía');

      await type('   ');
      expect(text(root.querySelector('h1'))).toBe('Técnica nueva');
    });

    it('pide las especialidades y las ofrece, tras «Elegir especialidad»', async () => {
      await open();

      expect(Array.from(select().options).map((o) => text(o))).toEqual([
        'Elegir especialidad',
        'Cirugía general',
        'Urología',
      ]);
    });

    it('cada campo obligatorio vacío lleva «Falta», y la pierde al llenarse', async () => {
      await open();
      expect(badges()).toEqual(['Falta', 'Falta']);

      await type('Colecistectomía');
      expect(badges()).toEqual(['Falta']);

      await choose('s-1');
      http
        .expectOne(`${TEST_API_BASE}/techniques`)
        .flush(null, { status: 500, statusText: 'Error' });
      await settle();
      expect(badges()).toEqual([]);
    });
  });

  describe('cuándo se crea', () => {
    it('no se crea mientras se escribe', async () => {
      await open();
      await choose('s-1');

      await type('C');
      await type('Co');

      http.expectNone(`${TEST_API_BASE}/techniques`);
    });

    it('con el nombre escrito y sin especialidad, salir del campo no crea nada', async () => {
      await open();

      await type('Colecistectomía');
      await leaveName();

      http.expectNone(`${TEST_API_BASE}/techniques`);
    });

    it('con la especialidad elegida, salir del nombre la crea, y lleva a su primera versión', async () => {
      await open();
      await choose('s-1');
      await type('  Colecistectomía ');

      await leaveName();

      const request = http.expectOne(`${TEST_API_BASE}/techniques`);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({ name: 'Colecistectomía', specialty_id: 's-1' });
      request.flush({ summary: { id: 'v-9' }, content: {} });
      await settle();
      await fixture.whenStable();
      expect(router.url).toBe('/gestion/editor/v-9/datos-clinicos');
    });

    it('con el nombre ya escrito, elegir la especialidad la crea', async () => {
      await open();
      await type('Colecistectomía');

      await choose('s-2');

      const request = http.expectOne(`${TEST_API_BASE}/techniques`);
      expect(request.request.body).toEqual({
        name: 'Colecistectomía',
        specialty_id: 's-2',
      });
      await created(request);
      expect(router.url).toBe('/gestion/editor/v-1/datos-clinicos');
    });

    it('Enter en el nombre también la crea', async () => {
      await open();
      await choose('s-1');
      await type('Colecistectomía');

      await pressEnter();

      await created();
      expect(router.url).toBe('/gestion/editor/v-1/datos-clinicos');
    });

    it('un nombre en blanco no cuenta', async () => {
      await open();
      await choose('s-1');

      await type('   ');
      await leaveName();

      http.expectNone(`${TEST_API_BASE}/techniques`);
    });

    it('no se crea dos veces: Enter y salir del campo seguidos mandan una sola petición', async () => {
      await open();
      await choose('s-1');
      await type('Colecistectomía');

      await pressEnter();
      await leaveName();

      await created();
      expect(router.url).toBe('/gestion/editor/v-1/datos-clinicos');
    });

    it('mientras se crea, la tarjeta dice que está ocupada', async () => {
      await open();
      await choose('s-1');
      await type('Colecistectomía');
      await leaveName();

      expect(root.querySelector('.card')!.getAttribute('aria-busy')).toBe('true');
      await created();
    });
  });

  describe('si la API rechaza', () => {
    async function conflict(): Promise<void> {
      await open();
      await choose('s-1');
      await type('Colecistectomía');
      await leaveName();
      http
        .expectOne(`${TEST_API_BASE}/techniques`)
        .flush(
          { detail: 'Ya hay una técnica con ese nombre en la especialidad' },
          { status: 409, statusText: 'Conflict' },
        );
      await settle();
    }

    it('un 409 dice, bajo el nombre, que ya existe ese nombre en la especialidad', async () => {
      await conflict();

      expect(text(root.querySelector('app-text-field app-field-error'))).toBe(
        'Ya hay una técnica con ese nombre en la especialidad.',
      );
      expect(nameInput().getAttribute('aria-invalid')).toBe('true');
      expect(router.url).toBe('/');
    });

    it('no vuelve a pedir lo mismo: salir del campo otra vez deja el error a la vista', async () => {
      await conflict();

      await leaveName();
      await pressEnter();

      http.expectNone(`${TEST_API_BASE}/techniques`);
      expect(root.querySelector('app-field-error')).not.toBeNull();
    });

    it('al cambiar el nombre el error se va y se puede volver a crear', async () => {
      await conflict();

      await type('Colecistectomía abierta');
      expect(root.querySelector('app-field-error')).toBeNull();
      await leaveName();

      const request = http.expectOne(`${TEST_API_BASE}/techniques`);
      expect(request.request.body).toEqual({
        name: 'Colecistectomía abierta',
        specialty_id: 's-1',
      });
      await created(request);
    });

    it('al cambiar la especialidad el error se va y se crea en la nueva', async () => {
      await conflict();

      await choose('s-2');

      expect(root.querySelector('app-field-error')).toBeNull();
      const request = http.expectOne(`${TEST_API_BASE}/techniques`);
      expect(request.request.body).toEqual({
        name: 'Colecistectomía',
        specialty_id: 's-2',
      });
      await created(request);
    });

    it('otro error no se dice bajo el nombre (lo avisa el interceptor) y deja volver a intentar', async () => {
      await open();
      await choose('s-1');
      await type('Colecistectomía');
      await leaveName();
      http
        .expectOne(`${TEST_API_BASE}/techniques`)
        .flush(null, { status: 500, statusText: 'Error' });
      await settle();

      expect(root.querySelector('app-field-error')).toBeNull();
      expect(root.querySelector('.card')!.getAttribute('aria-busy')).toBe('false');

      await pressEnter();
      await created();
      expect(router.url).toBe('/gestion/editor/v-1/datos-clinicos');
    });
  });
});
