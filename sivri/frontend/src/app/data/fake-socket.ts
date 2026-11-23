import type { SocketLike } from './validation-connection';

/** Un `WebSocket` de mentira para las pruebas: guarda lo que se le manda y deja actuar al servidor. */
export class FakeSocket implements SocketLike {
  onopen: ((event: unknown) => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  sent: (string | Blob)[] = [];
  closed: number | undefined;

  constructor(readonly url: string) {}

  send(data: string | Blob): void {
    this.sent.push(data);
  }
  close(code?: number): void {
    this.closed = code;
  }

  // Lo que hace el servidor
  open(): void {
    this.onopen?.({});
  }
  say(message: unknown): void {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
  hangUp(code: number): void {
    this.onclose?.({ code });
  }
}
