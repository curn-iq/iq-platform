import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CONFIRMATION_MS, NoticeStack, NoticeView } from './notice-stack';

const error = (id: number, ...messages: string[]): NoticeView => ({ id, kind: 'error', messages });
const confirmation = (id: number, ...messages: string[]): NoticeView => ({
  id,
  kind: 'confirmation',
  messages,
});

describe('NoticeStack', () => {
  let fixture: ComponentFixture<NoticeStack>;
  let dismissed: number[];

  const root = () => fixture.nativeElement as HTMLElement;
  const show = (notices: NoticeView[]) => {
    fixture.componentRef.setInput('notices', notices);
    fixture.detectChanges();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    fixture = TestBed.createComponent(NoticeStack);
    dismissed = [];
    fixture.componentInstance.dismissed.subscribe((id) => dismissed.push(id));
    show([]);
  });

  afterEach(() => vi.useRealTimers());

  describe('errores', () => {
    it('muestra cada mensaje en un aviso de alerta, sin lista de viñetas', () => {
      show([error(1, 'Falta A', 'Falta B')]);

      const alert = root().querySelector('[role="alert"]');
      expect(alert?.querySelectorAll('.error')).toHaveLength(1);
      expect(Array.from(alert!.querySelectorAll('p')).map((p) => p.textContent)).toEqual([
        'Falta A',
        'Falta B',
      ]);
      expect(alert?.querySelector('ul, ol, li')).toBeNull();
    });

    it('la región de alerta existe aunque no haya avisos, para que se anuncien al aparecer', () => {
      expect(root().querySelector('[role="alert"]')).not.toBeNull();
      expect(root().querySelector('[role="status"]')).not.toBeNull();
    });

    it('se queda en pantalla hasta cerrarlo', () => {
      show([error(1, 'Hace falta iniciar sesión')]);
      vi.advanceTimersByTime(10 * 60 * 1000);
      fixture.detectChanges();

      expect(dismissed).toEqual([]);
      expect(root().querySelectorAll('.error')).toHaveLength(1);
    });

    it('el botón «Cerrar aviso» avisa cuál quitar', () => {
      show([error(7, 'A'), error(8, 'B')]);

      const buttons = root().querySelectorAll<HTMLButtonElement>('.close');
      expect(buttons).toHaveLength(2);
      expect(buttons[1].getAttribute('aria-label')).toBe('Cerrar aviso');
      buttons[1].click();

      expect(dismissed).toEqual([8]);
    });

    it('es un botón de verdad (se llega con teclado) y no manda formularios', () => {
      show([error(1, 'A')]);
      const button = root().querySelector<HTMLButtonElement>('.close')!;
      expect(button.tagName).toBe('BUTTON');
      expect(button.type).toBe('button');
    });
  });

  describe('confirmaciones', () => {
    it('muestra el mensaje en la región de estado, sin botón de cerrar', () => {
      show([confirmation(1, 'Guardado')]);

      const status = root().querySelector('[role="status"]');
      expect(status?.querySelector('.confirmation')?.textContent?.trim()).toBe('Guardado');
      expect(status?.querySelector('button')).toBeNull();
    });

    it('se va sola a los 3,2 s', () => {
      show([confirmation(1, 'Guardado')]);

      vi.advanceTimersByTime(CONFIRMATION_MS - 1);
      expect(dismissed).toEqual([]);
      vi.advanceTimersByTime(1);
      expect(dismissed).toEqual([1]);
      expect(CONFIRMATION_MS).toBe(3200);
    });

    it('cada confirmación lleva su propia cuenta', () => {
      show([confirmation(1, 'Uno')]);
      vi.advanceTimersByTime(2000);
      show([confirmation(1, 'Uno'), confirmation(2, 'Dos')]);

      vi.advanceTimersByTime(1200);
      expect(dismissed).toEqual([1]);
      vi.advanceTimersByTime(2000);
      expect(dismissed).toEqual([1, 2]);
    });

    it('no reinicia la cuenta de una confirmación cuando cambia la lista', () => {
      show([confirmation(1, 'Uno')]);
      vi.advanceTimersByTime(3000);
      show([confirmation(1, 'Uno'), error(2, 'Otro')]);

      vi.advanceTimersByTime(200);
      expect(dismissed).toEqual([1]);
    });

    it('si ya no está en la lista antes de tiempo, no avisa después', () => {
      show([confirmation(1, 'Uno')]);
      vi.advanceTimersByTime(1000);
      show([]);

      vi.advanceTimersByTime(60_000);
      expect(dismissed).toEqual([]);
    });

    it('al destruir el componente se sueltan las cuentas pendientes', () => {
      show([confirmation(1, 'Uno')]);
      fixture.destroy();

      vi.advanceTimersByTime(60_000);
      expect(dismissed).toEqual([]);
    });
  });

  it('muestra errores y confirmaciones a la vez, cada uno en su región', () => {
    show([error(1, 'Falla'), confirmation(2, 'Hecho')]);

    expect(root().querySelectorAll('[role="alert"] .error')).toHaveLength(1);
    expect(root().querySelectorAll('[role="status"] .confirmation')).toHaveLength(1);
  });

  it('no pone HTML de los mensajes: los muestra como texto', () => {
    show([error(1, '<img src=x onerror=alert(1)>')]);

    expect(root().querySelector('.error img')).toBeNull();
    expect(root().querySelector('.error p')?.textContent).toBe('<img src=x onerror=alert(1)>');
  });
});
