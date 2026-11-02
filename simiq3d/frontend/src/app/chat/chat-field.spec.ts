import { TestBed } from '@angular/core/testing';
import { ChatField } from './chat-field';

describe('ChatField', () => {
  async function render(disabled = false) {
    const fixture = TestBed.createComponent(ChatField);
    fixture.componentRef.setInput('disabled', disabled);
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

  it('no envía una pregunta vacía ni con el chat no disponible', async () => {
    const empty = await render();
    empty.type('   ');
    empty.press();
    expect(empty.asked).toEqual([]);

    const unavailable = await render(true);
    expect(unavailable.area.placeholder).toBe('El chat no está disponible');
  });

  it('dice bajo el campo que las preguntas se guardan sin el nombre', async () => {
    const fixture = TestBed.createComponent(ChatField);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Tus preguntas se guardan sin tu nombre para medir el chat. No escribas datos de pacientes.',
    );
  });
});
