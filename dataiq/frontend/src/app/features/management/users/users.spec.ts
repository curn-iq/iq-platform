import { HttpTestingController } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoticeService } from '../../../core/notice/notice.service';
import { SessionService } from '../../../core/session/session.service';
import type { Account, User } from '../../../data/api/models';
import { provideRepositoryTesting, TEST_API_BASE } from '../../../data/testing';
import type { Role } from '../../../domain/role';
import { Users } from './users';

const NO_ACTIVITY = { drafts: 0, returned: 0, in_review: 0, published_techniques: 0, reviewed: 0 };

function user(
  name: string,
  role: Role,
  createdAt = '2026-09-25T10:00:00',
  activity = NO_ACTIVITY,
): User {
  const slug = name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replaceAll(' ', '.');
  return {
    id: `id-${slug}`,
    name,
    email: `${slug}@correo.com`,
    role,
    created_at: createdAt,
    policy_accepted_at: createdAt,
    policy_version: '1.0',
    activity,
  };
}

const USERS: User[] = [
  user('Mauricio Lugo Granados', 'admin'),
  user('Juan Caraballo', 'admin'),
  user('Laura Pérez', 'reviewer', '2026-09-28T10:00:00', {
    ...NO_ACTIVITY,
    reviewed: 2,
    published_techniques: 1,
  }),
  user('Daniela Ortiz', 'contributor', '2026-09-30T10:00:00', {
    ...NO_ACTIVITY,
    drafts: 4,
    returned: 1,
  }),
  user('Andrés Gómez', 'contributor', '2026-10-01T10:00:00'),
  user('Valentina Ruiz', 'user', '2026-10-07T10:00:00'),
  user('Sebastián Mora', 'user', '2026-10-06T10:00:00'),
  user('Camila Herrera', 'user', '2026-10-05T10:00:00'),
  user('Natalia Peña', 'user', '2026-10-04T10:00:00'),
  user('Felipe Castro', 'user', '2026-10-03T10:00:00'),
  user('Tomás Vargas', 'user', '2026-10-02T10:00:00'),
];

/** La cuenta de la sesión: la primera de `USERS`. */
const SIGNED_IN: Account = {
  id: USERS[0].id,
  name: USERS[0].name,
  email: USERS[0].email,
  role: 'admin',
};

describe('Users', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<Users>;
  let root: HTMLElement;

  const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim();
  const column = (title: string) =>
    Array.from(root.querySelectorAll<HTMLElement>('app-role-column')).find((c) =>
      text(c.querySelector('h2'))?.startsWith(title),
    )!;
  const names = (el: Element) =>
    Array.from(el.querySelectorAll('button[app-person-row] .name')).map((n) => text(n));
  const card = () => root.querySelector<HTMLElement>('app-user-card');
  const confirm = () => card()?.querySelector<HTMLElement>('.confirm') ?? null;
  const roleButton = (label: string) =>
    Array.from(card()!.querySelectorAll<HTMLButtonElement>('app-segmented-control button')).find(
      (b) => text(b) === label,
    )!;
  const applyButton = () => card()!.querySelector<HTMLButtonElement>('.apply')!;

  async function settle(): Promise<void> {
    for (let i = 0; i < 3; i++) {
      await Promise.resolve();
      TestBed.tick();
    }
    fixture.detectChanges();
  }

  /** Abre la pantalla; si hay `users`, responde la lista. */
  async function open(users?: User[]): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideRepositoryTesting(),
        // Quien está en la pantalla es Mauricio, el primero de la lista
        { provide: SessionService, useValue: { account: signal(SIGNED_IN) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Users);
    root = fixture.nativeElement;
    await settle();
    if (users) {
      http.expectOne(`${TEST_API_BASE}/users`).flush(users);
      await settle();
    }
  }

  async function choose(name: string): Promise<void> {
    const row = Array.from(root.querySelectorAll<HTMLButtonElement>('button[app-person-row]')).find(
      (b) => text(b.querySelector('.name')) === name,
    )!;
    row.click();
    await settle();
  }

  async function type(input: HTMLInputElement, value: string): Promise<void> {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await settle();
  }

  /** Sin animación: la fila cambia de columna al momento. */
  function reduceMotion(): void {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
  }

  afterEach(() => {
    http.verify();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  describe('la carga', () => {
    it('pide las cuentas y mientras llegan dice «Cargando…»', async () => {
      await open();

      expect(text(root.querySelector('.loading'))).toBe('Cargando…');
      expect(root.querySelector('app-role-column')).toBeNull();
      http.expectOne(`${TEST_API_BASE}/users`).flush([]);
    });

    it('si falla, lo dice y «Reintentar» vuelve a pedirlas', async () => {
      await open();
      http
        .expectOne(`${TEST_API_BASE}/users`)
        .flush({ detail: 'x' }, { status: 500, statusText: 'Server Error' });
      await settle();

      expect(text(root.querySelector('.notice'))).toContain('No se pudo cargar Usuarios y roles.');
      root.querySelector<HTMLButtonElement>('.notice button')!.click();
      await settle();

      http.expectOne(`${TEST_API_BASE}/users`).flush(USERS);
      await settle();
      expect(root.querySelector('app-role-column')).not.toBeNull();
    });
  });

  describe('el tablero', () => {
    beforeEach(async () => open(USERS));

    it('la línea de resumen cuenta cada rol', () => {
      expect(text(root.querySelector('.summary'))).toBe(
        '2 admin · 1 revisor · 2 colaboradores · 6 usuarios',
      );
    });

    it('tiene una columna por rol, de mayor a menor', () => {
      const titles = Array.from(root.querySelectorAll('app-role-column h2')).map((h) =>
        text(h)?.replace(/\s*\d+$/, ''),
      );
      expect(titles).toEqual(['Admin', 'Revisores', 'Colaboradores', 'Usuarios']);
    });

    it('Admin, Revisores y Colaboradores listan a todos, por nombre', () => {
      expect(names(column('Admin'))).toEqual(['Juan Caraballo', 'Mauricio Lugo Granados']);
      expect(names(column('Revisores'))).toEqual(['Laura Pérez']);
      expect(names(column('Colaboradores'))).toEqual(['Andrés Gómez', 'Daniela Ortiz']);
    });

    it('cada columna dice lo que puede su rol, y Admin ya no suspende', () => {
      expect(text(column('Admin').querySelector('.capability'))).toBe('Asigna roles.');
      expect(text(column('Revisores').querySelector('.capability'))).toBe(
        'Publica lo suyo y aprueba lo de los colaboradores.',
      );
    });

    it('Usuarios muestra la cifra y los cinco registrados más recientemente', () => {
      const users = column('Usuarios');
      expect(text(users.querySelector('.total'))).toBe('6');
      expect(text(users.querySelector('.total-label'))).toBe('cuentas con rol Usuario');
      expect(names(users)).toEqual([
        'Valentina Ruiz',
        'Sebastián Mora',
        'Camila Herrera',
        'Natalia Peña',
        'Felipe Castro',
      ]);
    });

    it('de la fila solo se recorta la parte local del correo', () => {
      const mail = column('Revisores').querySelector('.mail')!;
      expect(text(mail.querySelector('.local'))).toBe('laura.perez');
      expect(text(mail.querySelector('.domain'))).toBe('@correo.com');
    });

    it('no hay nadie elegido: la ficha dice que se elija a alguien', () => {
      expect(card()).toBeNull();
      expect(text(root.querySelector('.card'))).toBe(
        'Elegir a una persona para ver su ficha y cambiar su rol.',
      );
    });
  });

  describe('la ficha', () => {
    beforeEach(async () => open(USERS));

    it('al elegir a alguien muestra su nombre, correo, registro, política y actividad', async () => {
      await choose('Daniela Ortiz');

      expect(text(card()!.querySelector('h2'))).toBe('Daniela Ortiz');
      expect(text(card()!.querySelector('.email'))).toBe('daniela.ortiz@correo.com');
      const data = Array.from(card()!.querySelectorAll('.data dd')).map((d) => text(d));
      expect(data).toEqual([
        '30 sep 2026',
        'Aceptó la versión 1.0 el 30 sep 2026',
        '4 borradores · 1 devuelta',
      ]);
    });

    it('«Hoy» y «Ayer» siguen la fecha al elegir a otra persona pasada la medianoche', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(2026, 9, 7, 23, 50));
      await choose('Valentina Ruiz');
      expect(text(card()!.querySelector('.data dd'))).toBe('Hoy');

      vi.setSystemTime(new Date(2026, 9, 8, 0, 10));
      await choose('Sebastián Mora');
      expect(text(card()!.querySelector('.data dd'))).toBe('6 oct 2026');
      await choose('Valentina Ruiz');
      expect(text(card()!.querySelector('.data dd'))).toBe('Ayer');
    });

    it('elegida desde su fila, el foco se queda en la fila', async () => {
      const row = column('Revisores').querySelector<HTMLButtonElement>('button[app-person-row]')!;
      row.focus();
      row.click();
      await settle();

      expect(text(card()!.querySelector('h2'))).toBe('Laura Pérez');
      expect(document.activeElement).toBe(row);
    });

    it('la ficha no se anuncia entera al cambiar: no es una región viva', async () => {
      await choose('Laura Pérez');
      expect(root.querySelector('aside.card')!.hasAttribute('aria-live')).toBe(false);
    });

    it('sin actividad lo dice', async () => {
      await choose('Andrés Gómez');
      expect(text(card()!.querySelector('.data dd:last-of-type'))).toBe('Sin actividad en DataIQ');
    });

    it('la fila elegida queda marcada', async () => {
      await choose('Daniela Ortiz');
      const pressed = root.querySelectorAll('button[app-person-row][aria-pressed="true"]');
      expect(pressed).toHaveLength(1);
      expect(text(pressed[0].querySelector('.name'))).toBe('Daniela Ortiz');
    });

    it('el selector tiene los cuatro roles y marca el de la cuenta', async () => {
      await choose('Laura Pérez');
      const buttons = Array.from(card()!.querySelectorAll('app-segmented-control button'));
      expect(buttons.map((b) => text(b))).toEqual(['Usuario', 'Colaborador', 'Revisor', 'Admin']);
      expect(
        buttons.filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => text(b)),
      ).toEqual(['Revisor']);
    });

    it('no ofrece suspender ni historial', async () => {
      await choose('Daniela Ortiz');
      expect(text(root)).not.toMatch(/suspend|historial|reactivar|demostración/i);
    });
  });

  describe('la cuenta propia', () => {
    beforeEach(async () => open(USERS));

    const roleButtons = () =>
      Array.from(card()!.querySelectorAll<HTMLButtonElement>('app-segmented-control button'));

    it('no cambia su rol: el selector está deshabilitado y la ficha dice por qué', async () => {
      await choose('Mauricio Lugo Granados');

      expect(roleButtons().map((b) => text(b))).toEqual([
        'Usuario',
        'Colaborador',
        'Revisor',
        'Admin',
      ]);
      expect(roleButtons().every((b) => b.disabled)).toBe(true);
      expect(card()!.querySelector('app-segmented-control')!.classList).toContain('disabled');
      expect(text(card()!.querySelector('.note'))).toBe(
        'No se puede cambiar el rol de la cuenta propia.',
      );
      expect(roleButton('Admin').getAttribute('aria-pressed')).toBe('true');
    });

    it('tocar otro rol no abre la confirmación ni pide nada', async () => {
      await choose('Mauricio Lugo Granados');
      roleButton('Colaborador').click();
      await settle();

      expect(confirm()).toBeNull();
      expect(roleButton('Admin').getAttribute('aria-pressed')).toBe('true');
      http.expectNone(`${TEST_API_BASE}/users/${USERS[0].id}/role`);
    });

    it('las demás cuentas, incluso otro admin, sí cambian de rol y no llevan la nota', async () => {
      await choose('Juan Caraballo');

      expect(roleButtons().some((b) => b.disabled)).toBe(false);
      expect(card()!.querySelector('.note')).toBeNull();
      roleButton('Revisor').click();
      await settle();
      expect(confirm()).not.toBeNull();
    });
  });

  describe('el buscador general', () => {
    beforeEach(async () => open(USERS));

    const input = () => root.querySelector<HTMLInputElement>('app-user-search input')!;
    const results = () =>
      Array.from(root.querySelectorAll('app-user-search .results button')).map((b) =>
        text(b.querySelector('.name')),
      );

    it('encuentra por nombre o por correo, sin tildes ni mayúsculas, en cualquier rol', async () => {
      await type(input(), 'perez');
      expect(results()).toEqual(['Laura Pérez']);
      expect(text(root.querySelector('app-user-search .role'))).toBe('Revisor');

      await type(input(), 'GOMEZ@correo');
      expect(results()).toEqual(['Andrés Gómez']);
    });

    it('resalta lo que coincide', async () => {
      await type(input(), 'ortiz');
      expect(text(root.querySelector('app-user-search .name mark'))).toBe('Ortiz');
    });

    it('sin coincidencias lo dice', async () => {
      await type(input(), 'zzz');
      expect(text(root.querySelector('app-user-search .results'))).toBe(
        'Nadie con ese nombre o correo.',
      );
    });

    it('elegir un resultado abre su ficha y vacía el campo', async () => {
      await type(input(), 'laura');
      root.querySelector<HTMLButtonElement>('app-user-search .results button')!.click();
      await settle();

      expect(text(card()!.querySelector('h2'))).toBe('Laura Pérez');
      expect(input().value).toBe('');
      expect(root.querySelector('app-user-search .results')).toBeNull();
    });

    it('elegir un resultado lleva el foco al nombre de la ficha, porque el resultado desaparece', async () => {
      await type(input(), 'laura');
      const result = root.querySelector<HTMLButtonElement>('app-user-search .results button')!;
      result.focus();
      result.click();
      await settle();

      expect(document.activeElement).toBe(card()!.querySelector('h2'));
    });

    it('Escape cierra los resultados sin borrar lo escrito', async () => {
      await type(input(), 'laura');
      // Chromium y WebKit vacían un campo de búsqueda con Escape si no se les impide
      const escape = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      });
      input().dispatchEvent(escape);
      await settle();

      expect(escape.defaultPrevented).toBe(true);
      expect(root.querySelector('app-user-search .results')).toBeNull();
      expect(input().value).toBe('laura');
    });

    it('las flechas recorren los resultados y vuelven al campo', async () => {
      const resultButtons = () =>
        Array.from(root.querySelectorAll<HTMLButtonElement>('app-user-search .results button'));
      const press = async (key: string) => {
        (document.activeElement as HTMLElement).dispatchEvent(
          new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
        );
        await settle();
      };
      await type(input(), 'correo');
      input().focus();

      await press('ArrowDown');
      expect(document.activeElement).toBe(resultButtons()[0]);
      await press('ArrowDown');
      expect(document.activeElement).toBe(resultButtons()[1]);
      await press('ArrowUp');
      await press('ArrowUp');
      expect(document.activeElement).toBe(input());

      // Escape desde un resultado cierra y devuelve el foco al campo
      await press('ArrowDown');
      await press('Escape');
      expect(root.querySelector('app-user-search .results')).toBeNull();
      expect(document.activeElement).toBe(input());

      // y la flecha abajo lo vuelve a abrir
      await press('ArrowDown');
      expect(root.querySelector('app-user-search .results')).not.toBeNull();
    });

    it('anuncia cuántos resultados hay', async () => {
      const status = () => text(root.querySelector('app-user-search [aria-live]'));
      expect(status()).toBe('');

      await type(input(), 'correo');
      expect(status()).toBe('11 resultados');
      await type(input(), 'laura');
      expect(status()).toBe('1 resultado');
      await type(input(), 'zzz');
      expect(status()).toBe('Nadie con ese nombre o correo.');
    });

    it('un clic fuera cierra los resultados', async () => {
      await type(input(), 'laura');
      document.body.click();
      await settle();

      expect(root.querySelector('app-user-search .results')).toBeNull();
    });
  });

  describe('la ficha bajo el tablero (≤ 1100 px)', () => {
    let scrolled: Element[];

    beforeEach(async () => {
      scrolled = [];
      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: query.includes('max-width: 1100px'),
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }));
      // jsdom no desplaza: se anota a dónde se pidió bajar
      Element.prototype.scrollIntoView = function (this: Element) {
        scrolled.push(this);
      };
      await open(USERS);
    });

    afterEach(() => {
      delete (Element.prototype as Partial<Element>).scrollIntoView;
    });

    const back = () =>
      Array.from(card()!.querySelectorAll<HTMLButtonElement>('button')).find(
        (b) => text(b) === 'Volver a la lista',
      )!;

    it('elegir a alguien baja hasta la ficha y le pasa el foco', async () => {
      await choose('Laura Pérez');

      expect(scrolled).toEqual([root.querySelector('aside.card')]);
      expect(document.activeElement).toBe(card()!.querySelector('h2'));
    });

    it('«Volver a la lista» vuelve a la fila de la persona elegida', async () => {
      await choose('Laura Pérez');
      back().click();
      await settle();

      const row = root.querySelector('button[app-person-row][aria-pressed="true"]');
      expect(text(row?.querySelector('.name'))).toBe('Laura Pérez');
      expect(scrolled.at(-1)).toBe(row);
      expect(document.activeElement).toBe(row);
    });

    it('de alguien sin fila en el tablero, «Volver a la lista» vuelve al buscador general', async () => {
      // Tomás Vargas es usuario y no está entre los cinco más recientes
      const input = root.querySelector<HTMLInputElement>('app-user-search input')!;
      await type(input, 'tomas');
      root.querySelector<HTMLButtonElement>('app-user-search .results button')!.click();
      await settle();
      expect(root.querySelector('button[app-person-row][aria-pressed="true"]')).toBeNull();

      back().click();
      await settle();
      expect(scrolled.at(-1)).toBe(input);
      expect(document.activeElement).toBe(input);
    });
  });

  describe('el buscador de Usuarios', () => {
    beforeEach(async () => open(USERS));

    const input = () => column('Usuarios').querySelector<HTMLInputElement>('input')!;

    it('busca solo entre los usuarios y muestra las coincidencias en la misma columna', async () => {
      await type(input(), 'a');
      // «Laura Pérez» es revisor: no sale aunque tenga una «a»
      expect(names(column('Usuarios'))).not.toContain('Laura Pérez');

      await type(input(), 'tomas');
      expect(names(column('Usuarios'))).toEqual(['Tomás Vargas']);
      expect(text(column('Usuarios').querySelector('.sub'))).toBe('Coincidencias');
    });

    it('sin coincidencias lo dice', async () => {
      await type(input(), 'laura');
      expect(text(column('Usuarios').querySelector('.none'))).toBe(
        'Ningún usuario con ese nombre o correo.',
      );
    });

    it('no usa el buscador general', async () => {
      await type(input(), 'tomas');
      expect(root.querySelector('app-user-search input')).not.toBeNull();
      expect(root.querySelector<HTMLInputElement>('app-user-search input')!.value).toBe('');
    });
  });

  describe('cambiar el rol', () => {
    beforeEach(async () => open(USERS));

    it('elegir otro rol abre la confirmación con lo que podrá hacer', async () => {
      await choose('Daniela Ortiz');
      roleButton('Revisor').click();
      await settle();

      expect(text(confirm())).toContain(
        'Cambiar el rol de Daniela Ortiz de Colaborador a Revisor. Podrá publicar lo suyo y aprobar lo de los colaboradores.',
      );
      expect(roleButton('Revisor').getAttribute('aria-pressed')).toBe('true');
    });

    it('para Revisor pide marcar la verificación antes de habilitar el botón', async () => {
      await choose('Daniela Ortiz');
      roleButton('Revisor').click();
      await settle();

      expect(text(confirm()!.querySelector('app-checkbox-field'))).toBe(
        'Verifiqué que es docente o instrumentador titulado.',
      );
      expect(applyButton().disabled).toBe(true);

      confirm()!.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
      await settle();
      expect(applyButton().disabled).toBe(false);
      expect(text(applyButton())).toBe('Cambiar a Revisor');
    });

    it('para Admin pide la suya, y para Colaborador no pide ninguna', async () => {
      await choose('Laura Pérez');
      roleButton('Admin').click();
      await settle();
      expect(text(confirm()!.querySelector('app-checkbox-field'))).toBe(
        'Es parte del equipo operativo del proyecto.',
      );

      roleButton('Colaborador').click();
      await settle();
      expect(confirm()!.querySelector('app-checkbox-field')).toBeNull();
      expect(applyButton().disabled).toBe(false);
      expect(text(confirm()!.querySelector('p'))).toContain(
        'Deja de poder lo que su rol actual le permitía.',
      );
    });

    it('elegir otra vez el rol de la cuenta desiste', async () => {
      await choose('Daniela Ortiz');
      roleButton('Revisor').click();
      await settle();
      roleButton('Colaborador').click();
      await settle();

      expect(confirm()).toBeNull();
    });

    it('Cancelar cierra la confirmación sin pedir nada', async () => {
      await choose('Daniela Ortiz');
      roleButton('Revisor').click();
      await settle();
      Array.from(confirm()!.querySelectorAll('button'))
        .find((b) => text(b) === 'Cancelar')!
        .click();
      await settle();

      expect(confirm()).toBeNull();
      expect(roleButton('Colaborador').getAttribute('aria-pressed')).toBe('true');
      http.expectNone(`${TEST_API_BASE}/users/id-daniela.ortiz/role`);
    });
  });

  describe('cambiar el rol, con movimiento reducido', () => {
    beforeEach(async () => {
      reduceMotion();
      await open(USERS);
    });

    it('al confirmar manda el rol, avisa y pasa a la persona a la columna nueva', async () => {
      await choose('Daniela Ortiz');
      roleButton('Revisor').click();
      await settle();
      confirm()!.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
      await settle();
      applyButton().click();
      await settle();

      expect(text(applyButton())).toBe('Cambiando…');
      expect(applyButton().disabled).toBe(true);
      const request = http.expectOne(`${TEST_API_BASE}/users/id-daniela.ortiz/role`);
      expect(request.request.method).toBe('PATCH');
      expect(request.request.body).toEqual({ role: 'reviewer' });
      request.flush({ ...USERS[3], role: 'reviewer' });
      await settle();

      expect(names(column('Revisores'))).toEqual(['Daniela Ortiz', 'Laura Pérez']);
      expect(names(column('Colaboradores'))).toEqual(['Andrés Gómez']);
      expect(TestBed.inject(NoticeService).notices()[0]).toMatchObject({
        kind: 'confirmation',
        messages: ['Rol cambiado a Revisor.'],
      });
      // La ficha sigue en ella, ya con el rol nuevo y sin confirmación
      expect(text(card()!.querySelector('h2'))).toBe('Daniela Ortiz');
      expect(roleButton('Revisor').getAttribute('aria-pressed')).toBe('true');
      expect(confirm()).toBeNull();
      expect(text(root.querySelector('.summary'))).toBe(
        '2 admin · 2 revisores · 1 colaborador · 6 usuarios',
      );
    });

    it('si la API rechaza, la confirmación se queda y no cambia nada', async () => {
      await choose('Andrés Gómez');
      roleButton('Usuario').click();
      await settle();
      applyButton().click();
      await settle();
      http
        .expectOne(`${TEST_API_BASE}/users/id-andres.gomez/role`)
        .flush({ detail: 'x' }, { status: 409, statusText: 'Conflict' });
      await settle();

      expect(confirm()).not.toBeNull();
      expect(applyButton().disabled).toBe(false);
      expect(text(applyButton())).toBe('Cambiar a Usuario');
      expect(names(column('Colaboradores'))).toContain('Andrés Gómez');
      expect(TestBed.inject(NoticeService).notices()).toEqual([]);
    });

    it('quien baja a Usuario queda a la vista en «Rol cambiado ahora»', async () => {
      await choose('Andrés Gómez');
      roleButton('Usuario').click();
      await settle();
      applyButton().click();
      await settle();
      http
        .expectOne(`${TEST_API_BASE}/users/id-andres.gomez/role`)
        .flush({ ...USERS[4], role: 'user' });
      await settle();

      const users = column('Usuarios');
      const subs = Array.from(users.querySelectorAll('.sub')).map((s) => text(s));
      expect(subs).toEqual(['Rol cambiado ahora', 'Registrados recientemente']);
      expect(names(users)[0]).toBe('Andrés Gómez');
      expect(text(users.querySelector('.total'))).toBe('7');
    });
  });

  describe('cambiar el rol, con movimiento', () => {
    beforeEach(async () => open(USERS));

    it('sin movimiento reducido, la fila sale de su columna y luego entra en la nueva', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      await choose('Daniela Ortiz');
      roleButton('Usuario').click();
      await settle();
      applyButton().click();
      await settle();
      http
        .expectOne(`${TEST_API_BASE}/users/id-daniela.ortiz/role`)
        .flush({ ...USERS[3], role: 'user' });
      await settle();

      // Primero sale: sigue en su columna, con la animación de salida
      expect(
        column('Colaboradores').querySelector('button[app-person-row].leaving .name')?.textContent,
      ).toContain('Daniela Ortiz');

      vi.advanceTimersByTime(280);
      await settle();
      expect(names(column('Colaboradores'))).toEqual(['Andrés Gómez']);
      expect(column('Usuarios').querySelector('button[app-person-row].arrived')).not.toBeNull();

      // El lavado se apaga solo
      vi.advanceTimersByTime(1200);
      await settle();
      expect(column('Usuarios').querySelector('button[app-person-row].arrived')).toBeNull();
    });

    it('el lavado de un cambio anterior no le corta el suyo al siguiente', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      const change = async (name: string, index: number, label: string, role: Role) => {
        await choose(name);
        roleButton(label).click();
        await settle();
        applyButton().click();
        await settle();
        http
          .expectOne(`${TEST_API_BASE}/users/${USERS[index].id}/role`)
          .flush({ ...USERS[index], role });
        await settle();
        vi.advanceTimersByTime(280);
        await settle();
      };
      const arrived = () =>
        text(root.querySelector('button[app-person-row].arrived .name')) ?? null;

      // Daniela llega a Usuarios y, antes de que se apague su lavado, llega Andrés
      await change('Daniela Ortiz', 3, 'Usuario', 'user');
      await change('Andrés Gómez', 4, 'Usuario', 'user');
      expect(arrived()).toBe('Andrés Gómez');

      // Se cumple el plazo del lavado de Daniela: el de Andrés sigue
      vi.advanceTimersByTime(920);
      await settle();
      expect(arrived()).toBe('Andrés Gómez');

      vi.advanceTimersByTime(280);
      await settle();
      expect(arrived()).toBeNull();
    });
  });
});
