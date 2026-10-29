import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { NoticeService } from '../notice/notice.service';
import { provideApi } from './api.providers';
import { LOGIN_PATH } from './error.interceptor';

@Component({ template: '' })
class Blank {}

describe('errorInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let notices: NoticeService;
  let router: Router;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'tecnicas', component: Blank },
          { path: 'cuenta/ingresar', component: Blank },
        ]),
        provideApi(),
        provideHttpClientTesting(),
      ],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    notices = TestBed.inject(NoticeService);
    router = TestBed.inject(Router);
    await router.navigateByUrl('/tecnicas?especialidad=urologia');
  });

  afterEach(() => http.verify());

  /** Hace la petición, responde con el error y devuelve lo que vio quien llamó. */
  function fail(
    url: string,
    status: number,
    body: object | string | null,
    method: 'GET' | 'POST' = 'GET',
  ): HttpErrorResponse | undefined {
    let seen: HttpErrorResponse | undefined;
    const call = method === 'GET' ? client.get(url) : client.post(url, {});
    call.subscribe({ error: (e: HttpErrorResponse) => (seen = e) });
    http.expectOne(url).flush(body, { status, statusText: 'Error' });
    return seen;
  }

  const messages = () => notices.notices().map((n) => n.messages);

  describe('401', () => {
    it('avisa y lleva a ingresar con la ruta actual en ?volver=', () => {
      const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      fail('/api/dataiq/versions', 401, { detail: 'El token no es válido o ya venció' });

      expect(messages()).toEqual([['El token no es válido o ya venció']]);
      expect(navigate).toHaveBeenCalledWith([LOGIN_PATH], {
        queryParams: { volver: '/tecnicas?especialidad=urologia' },
      });
    });

    it('si la API no trae texto, usa el de respaldo', () => {
      vi.spyOn(router, 'navigate').mockResolvedValue(true);
      fail('/api/dataiq/versions', 401, null);
      expect(messages()).toEqual([['Hace falta iniciar sesión.']]);
    });

    it('en /auth/me es un visitante: ni aviso ni redirección', () => {
      const navigate = vi.spyOn(router, 'navigate');

      const error = fail('/api/dataiq/auth/me', 401, { detail: 'Hace falta iniciar sesión' });

      expect(error?.status).toBe(401);
      expect(notices.notices()).toEqual([]);
      expect(navigate).not.toHaveBeenCalled();
    });

    it('en /auth/login es una contraseña mal puesta: lo trata la pantalla', () => {
      const navigate = vi.spyOn(router, 'navigate');

      const error = fail(
        '/api/dataiq/auth/login',
        401,
        { detail: 'Correo o contraseña incorrectos' },
        'POST',
      );

      expect(error?.error).toEqual({ detail: 'Correo o contraseña incorrectos' });
      expect(notices.notices()).toEqual([]);
      expect(navigate).not.toHaveBeenCalled();
    });

    it('no vuelve a enviar a quien ya está en la cuenta', async () => {
      await router.navigateByUrl('/cuenta/ingresar?volver=%2Ftecnicas');
      const navigate = vi.spyOn(router, 'navigate');

      fail('/api/dataiq/versions', 401, null);

      expect(messages()).toHaveLength(1);
      expect(navigate).not.toHaveBeenCalled();
    });

    it('varias peticiones que fallan a la vez dan un solo aviso', () => {
      vi.spyOn(router, 'navigate').mockResolvedValue(true);

      fail('/api/dataiq/versions', 401, null);
      fail('/api/dataiq/instruments', 401, null);

      expect(notices.notices()).toHaveLength(1);
    });
  });

  describe('403, 409 y 422', () => {
    it('403 avisa con el texto de la API y no redirige', () => {
      const navigate = vi.spyOn(router, 'navigate');
      fail('/api/dataiq/users', 403, { detail: 'Hace falta el rol admin o uno mayor' });

      expect(messages()).toEqual([['Hace falta el rol admin o uno mayor']]);
      expect(navigate).not.toHaveBeenCalled();
    });

    it('409 avisa con el texto de la API', () => {
      fail(
        '/api/dataiq/versions/v-1/approve',
        409,
        { detail: 'La versión ya fue decidida' },
        'POST',
      );
      expect(messages()).toEqual([['La versión ya fue decidida']]);
    });

    it('422 del dominio avisa con cada texto de la lista', () => {
      fail('/api/dataiq/versions/v-1/publish', 422, { detail: ['Falta A', 'Falta B'] }, 'POST');
      expect(messages()).toEqual([['Falta A', 'Falta B']]);
    });

    it('422 de FastAPI avisa con el texto de respaldo', () => {
      fail(
        '/api/dataiq/techniques',
        422,
        { detail: [{ loc: ['body'], msg: 'Field required' }] },
        'POST',
      );
      expect(messages()).toEqual([['Hay datos que no son válidos.']]);
    });
  });

  describe('sin conexión y errores del servidor', () => {
    it('sin respuesta avisa que no hay conexión', () => {
      let seen: HttpErrorResponse | undefined;
      client.get('/api/dataiq/techniques').subscribe({ error: (e) => (seen = e) });
      http.expectOne('/api/dataiq/techniques').error(new ProgressEvent('error'));

      expect(seen?.status).toBe(0);
      expect(messages()).toEqual([['No hay conexión con el servidor.']]);
    });

    it('500 avisa con el texto fijo, sin mostrar lo que responda el servidor', () => {
      fail('/api/dataiq/techniques', 500, { detail: 'Traceback interno' });
      expect(messages()).toEqual([
        ['El servidor no pudo responder. Intentar de nuevo en un momento.'],
      ]);
    });
  });

  describe('lo demás', () => {
    it('un 404 no se avisa: la pantalla muestra «No encontrada»', () => {
      const error = fail('/api/dataiq/techniques/t-9', 404, { detail: 'No encontrada' });

      expect(error?.status).toBe(404);
      expect(notices.notices()).toEqual([]);
    });

    it('deja pasar el error a quien llamó, con su estado y su cuerpo', () => {
      vi.spyOn(router, 'navigate').mockResolvedValue(true);
      const error = fail('/api/dataiq/versions', 409, { detail: 'Otro cambio llegó primero' });

      expect(error).toBeInstanceOf(HttpErrorResponse);
      expect(error?.status).toBe(409);
      expect(error?.error).toEqual({ detail: 'Otro cambio llegó primero' });
    });

    it('una respuesta buena no genera avisos', () => {
      client.get('/api/dataiq/techniques').subscribe();
      http.expectOne('/api/dataiq/techniques').flush([]);
      expect(notices.notices()).toEqual([]);
    });
  });
});
