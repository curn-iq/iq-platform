/**
 * Lee una respuesta NDJSON (una línea JSON por evento) a medida que llega:
 * `read` recibe todo el texto recibido hasta ahora y devuelve solo los eventos
 * de las líneas nuevas que ya están completas; con `final`, también la última,
 * aunque no termine en salto de línea.
 */
export class NdjsonReader<T> {
  private used = 0;

  read(text: string, final = false): T[] {
    const end = final ? text.length : text.lastIndexOf('\n') + 1;
    if (end <= this.used) return [];
    const fresh = text.slice(this.used, end);
    this.used = end;
    return fresh
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line) as T);
  }
}
