import { describeApiError } from './error-message';

describe('describeApiError', () => {
  it('usa el texto de detail que trae la API', () => {
    expect(describeApiError(403, { detail: 'Hace falta el rol reviewer o uno mayor' })).toEqual([
      'Hace falta el rol reviewer o uno mayor',
    ]);
    expect(describeApiError(409, { detail: 'Otro cambio llegó primero.' })).toEqual([
      'Otro cambio llegó primero.',
    ]);
    expect(describeApiError(401, { detail: 'El token no es válido o ya venció' })).toEqual([
      'El token no es válido o ya venció',
    ]);
  });

  it('en un 422 del dominio muestra cada texto de la lista', () => {
    const body = { detail: ['Falta la posición de la pinza', 'La mesa de reserva no existe'] };
    expect(describeApiError(422, body)).toEqual([
      'Falta la posición de la pinza',
      'La mesa de reserva no existe',
    ]);
  });

  it('en un 422 de FastAPI (lista de objetos, en inglés) usa el texto de respaldo', () => {
    const body = { detail: [{ loc: ['body', 'email'], msg: 'Field required', type: 'missing' }] };
    expect(describeApiError(422, body)).toEqual(['Hay datos que no son válidos.']);
  });

  it('entiende un 422 con detail en texto (registro sin aceptar la política)', () => {
    expect(describeApiError(422, { detail: 'Hay que aceptar la política' })).toEqual([
      'Hay que aceptar la política',
    ]);
  });

  it.each([
    [401, 'Hace falta iniciar sesión.'],
    [403, 'No hay permiso para esta acción.'],
    [409, 'Otro cambio llegó primero. Recargar e intentar de nuevo.'],
    [422, 'Hay datos que no son válidos.'],
  ])('en un %i sin detail usa el texto de respaldo', (status, text) => {
    expect(describeApiError(status, null)).toEqual([text]);
    expect(describeApiError(status, {})).toEqual([text]);
    expect(describeApiError(status, { detail: '  ' })).toEqual([text]);
    expect(describeApiError(status, { detail: [] })).toEqual([text]);
    expect(describeApiError(status, 'cuerpo que no es JSON')).toEqual([text]);
  });

  it('sin respuesta (estado 0) dice que no hay conexión', () => {
    expect(describeApiError(0, null)).toEqual(['No hay conexión con el servidor.']);
  });

  it('en un error del servidor no muestra lo que traiga la respuesta', () => {
    const expected = ['El servidor no pudo responder. Intentar de nuevo en un momento.'];
    expect(describeApiError(500, { detail: 'Traceback interno' })).toEqual(expected);
    expect(describeApiError(502, '<html>Bad Gateway</html>')).toEqual(expected);
  });

  it('no traduce los códigos que cada pantalla trata a su manera', () => {
    expect(describeApiError(404, { detail: 'No encontrada' })).toBeUndefined();
    expect(describeApiError(400, null)).toBeUndefined();
    expect(describeApiError(304, null)).toBeUndefined();
  });
});
