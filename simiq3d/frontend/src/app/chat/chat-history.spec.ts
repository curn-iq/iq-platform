import { TestBed } from '@angular/core/testing';
import type { ChatMessage, ChatReply } from '../domain/chat';
import { ChatHistory } from './chat-history';

describe('ChatHistory', () => {
  const reply = (overrides: Partial<ChatReply> = {}): ChatReply => ({
    action: 'highlight_instrument',
    technique_id: 't-1',
    instrument_id: 'i-kelly',
    field: null,
    reply: 'La Pinza Kelly es el número 9 de la mesa de Mayo de Mastectomía.',
    generated: false,
    options: ['¿Qué es la Pinza Kelly?'],
    requests: [],
    ...overrides,
  });

  async function render(inputs: Record<string, unknown>) {
    const fixture = TestBed.createComponent(ChatHistory);
    fixture.componentRef.setInput('names', {
      techniques: new Map([['t-1', 'Mastectomía']]),
      instruments: new Map([['i-kelly', 'Pinza Kelly']]),
    });
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    const asked: string[] = [];
    fixture.componentInstance.ask.subscribe((question) => asked.push(question));
    await fixture.whenStable();
    return { element: fixture.nativeElement as HTMLElement, asked };
  }

  it('muestra la pregunta y la respuesta con quién habla, el chip y las opciones', async () => {
    const messages: ChatMessage[] = [
      { id: 1, from: 'person', text: '¿Dónde va la Kelly?' },
      { id: 2, from: 'simiq3d', reply: reply() },
    ];
    const { element, asked } = await render({ messages, initials: 'UD' });
    const [question, answer] = Array.from(element.querySelectorAll('.message'));
    expect(question.textContent).toContain('Tú');
    expect(question.textContent).toContain('¿Dónde va la Kelly?');
    expect(answer.textContent).toContain('SIMIQ3D');
    expect(answer.querySelector('.chip')?.textContent).toContain('Resaltar · Pinza Kelly');

    answer.querySelector<HTMLButtonElement>('.option')!.click();
    expect(asked).toEqual(['¿Qué es la Pinza Kelly?']);
  });

  it('una respuesta solo en texto no lleva chip', async () => {
    const messages: ChatMessage[] = [
      { id: 1, from: 'simiq3d', reply: reply({ action: 'answer', options: [] }) },
    ];
    const { element } = await render({ messages });
    expect(element.querySelector('.chip')).toBeNull();
  });

  it('el instrumental se lista solo con la mesa de esa técnica abierta', async () => {
    const messages: ChatMessage[] = [
      { id: 1, from: 'simiq3d', reply: reply({ action: 'list_instruments', instrument_id: null }) },
    ];
    const items = [
      { id: 'kelly', legendNumber: 9, name: 'Pinza Kelly', instrumentIds: ['i-kelly'], cells: [] },
    ];
    const open = await render({ messages, items, openTechnique: 't-1' });
    expect(open.element.querySelector('app-piece-list')?.textContent).toContain('Pinza Kelly');

    const other = await render({ messages, items, openTechnique: 't-2' });
    expect(other.element.querySelector('app-piece-list')).toBeNull();
  });

  it('mientras llega la respuesta, SIMIQ3D está respondiendo', async () => {
    const { element } = await render({ pending: true });
    expect(element.querySelector('[aria-label="SIMIQ3D está respondiendo"]')).not.toBeNull();
  });

  it('si el chat no respondió, lo dice en el aviso y en la cabeza', async () => {
    const { element } = await render({
      notice: { title: 'El chat no está disponible en este momento.', line: 'La mesa sigue.' },
    });
    expect(element.querySelector('.notice')?.textContent).toContain(
      'El chat no está disponible en este momento.',
    );
    expect(element.querySelector('.status')?.textContent).toContain('No disponible');
  });

  it('las sugerencias están hasta la primera pregunta', async () => {
    const { element, asked } = await render({ suggestions: ['¿Dónde va la Pinza Kelly?'] });
    element.querySelector<HTMLButtonElement>('.suggestion')!.click();
    expect(asked).toEqual(['¿Dónde va la Pinza Kelly?']);

    const withMessages = await render({
      suggestions: ['¿Dónde va la Pinza Kelly?'],
      messages: [{ id: 1, from: 'person', text: 'Hola' }],
    });
    expect(withMessages.element.querySelector('.suggestion')).toBeNull();
  });

  it('con el texto del modelo, muestra la negrita y de dónde sale cada cosa', async () => {
    const written = reply({ reply: 'La **Pinza Kelly** es hemostática.', generated: true });
    const messages: ChatMessage[] = [
      { id: 1, from: 'simiq3d', reply: written },
      { id: 2, from: 'simiq3d', reply: reply() },
    ];
    const { element } = await render({ messages });
    const [model, dataiq] = Array.from(element.querySelectorAll('.message'));
    expect(model.querySelector('strong')?.textContent).toBe('Pinza Kelly');
    expect(model.querySelector('.sources')?.textContent).toContain(
      'Lo demás lo explica un modelo de IA',
    );
    expect(dataiq.querySelector('.sources')).toBeNull();
  });
});
