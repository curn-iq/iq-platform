// Textos de respaldo, en la voz de los mensajes del backend (impersonal, sin tú
// ni usted). Solo se usan cuando la API no trae un `detail` en texto.
const NO_CONNECTION = 'No hay conexión con el servidor.';
const SERVER_ERROR = 'El servidor no pudo responder. Intentar de nuevo en un momento.';
const FALLBACKS: Readonly<Record<number, string>> = {
  401: 'Hace falta iniciar sesión.',
  403: 'No hay permiso para esta acción.',
  409: 'Otro cambio llegó primero. Recargar e intentar de nuevo.',
  422: 'Hay datos que no son válidos.',
};

/**
 * Los mensajes para mostrar de una respuesta con error, o `undefined` si ese
 * código no se traduce a un aviso (p. ej. el 404, que cada pantalla trata a su
 * manera).
 *
 * La API responde `{"detail": ...}` con el texto ya en español: un texto, o una
 * lista de textos (lo que no cuadra en el contenido, 422). Si `detail` no es
 * texto —la lista de objetos de la validación de FastAPI trae mensajes en
 * inglés— se usa el texto de respaldo.
 */
export function describeApiError(status: number, body: unknown): readonly string[] | undefined {
  if (status === 0) return [NO_CONNECTION];
  if (status >= 500) return [SERVER_ERROR];

  const fallback = FALLBACKS[status];
  if (fallback === undefined) return undefined;

  const texts = detailTexts(body);
  return texts.length > 0 ? texts : [fallback];
}

function detailTexts(body: unknown): string[] {
  if (typeof body !== 'object' || body === null || !('detail' in body)) return [];
  const detail = body.detail;
  if (typeof detail === 'string') return detail.trim() ? [detail] : [];
  if (Array.isArray(detail) && detail.every((item) => typeof item === 'string')) {
    return detail.filter((item) => item.trim());
  }
  return [];
}
