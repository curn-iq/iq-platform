import { TestBed } from '@angular/core/testing';
import { ChatField } from './chat-field';

describe('ChatField', () => {
  async function render(busy = false) {
    const fixture = TestBed.createComponent(ChatField);
    fixture.componentRef.setInput('busy', busy);
    const asked: string[] = [];
    fixture.componentInstance.ask.subscribe((question) => asked.push(question));
    await fixture.whenStable();
    const area = (fixture.nativeElement as HTMLElement).querySelector('textarea')!;
    const type = (text: string) => {
      area.value = text;
      area.dispatchEvent(new Event('input'));
    };
    const press = (shiftKey = false) =>
      area.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', shiftKey, cancelable: true }),
      );
    return { area, asked, type, press };
  }

  it('Enter envía la pregunta y vacía el campo', async () => {
    const { area, asked, type, press } = await render();
    type('  ¿Dónde va la Kelly?  ');
    press();
    expect(asked).toEqual(['¿Dónde va la Kelly?']);
    expect(area.value).toBe('');
  });

  it('Mayúsculas + Enter salta de línea y no envía', async () => {
    const { asked, type, press } = await render();
    type('¿Dónde va');
    press(true);
    expect(asked).toEqual([]);
  });

  it('no envía una pregunta vacía ni mientras espera la respuesta', async () => {
    const empty = await render();
    empty.type('   ');
    empty.press();
    expect(empty.asked).toEqual([]);

    const waiting = await render(true);
    waiting.type('¿Dónde va la Kelly?');
    waiting.press();
    expect(waiting.asked).toEqual([]);
  });

  it('mientras no llega ni una frase, los tres puntos van en lugar de la última respuesta', async () => {
    const fixture = TestBed.createComponent(ChatField);
    fixture.componentRef.setInput('last', { text: 'La Pinza Kelly es el número 9.', options: [] });
    fixture.componentRef.setInput('busy', true);
    fixture.componentRef.setInput('waiting', true);
    await fixture.whenStable();
    const last = (fixture.nativeElement as HTMLElement).querySelector('.last');
    expect(last?.querySelector('[aria-label="SIMIQ3D está respondiendo"]')).not.toBeNull();
    expect(last?.textContent).not.toContain('La Pinza Kelly es el número 9.');
  });

  it('mientras se escribe la respuesta, se ve lo escrito y no se envía otra', async () => {
    const fixture = TestBed.createComponent(ChatField);
    fixture.componentRef.setInput('last', { text: 'La Pinza Kelly', options: [] });
    fixture.componentRef.setInput('busy', true);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.last')?.textContent).toContain('La Pinza Kelly');
    expect(element.querySelector<HTMLButtonElement>('.send')?.disabled).toBe(true);
  });

  it('admite hasta 500 caracteres, como la API', async () => {
    const { area } = await render();
    expect(area.maxLength).toBe(500);
  });

  it('dice bajo el campo quién responde y que las preguntas se guardan sin el nombre', async () => {
    const fixture = TestBed.createComponent(ChatField);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Responde un modelo de IA con los datos de DataIQ. Tus preguntas se guardan sin tu nombre para medir el chat. No escribas datos de pacientes.',
    );
  });
});
