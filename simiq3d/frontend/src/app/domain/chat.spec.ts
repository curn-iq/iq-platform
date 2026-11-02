import { ChatAction, sceneFor } from './chat';

describe('sceneFor', () => {
  const reply = (action: ChatAction) => ({ action, technique_id: 't-1', instrument_id: 'i-1' });

  it('mostrar una técnica y sus datos clínicos abre su mesa', () => {
    for (const action of ['show_technique', 'show_clinical_data'] as const) {
      expect(sceneFor(reply(action))).toEqual({
        technique: 't-1',
        instrument: null,
        card: false,
        list: false,
      });
    }
  });

  it('el instrumental abre la mesa y pide la lista numerada', () => {
    expect(sceneFor(reply('list_instruments'))).toEqual({
      technique: 't-1',
      instrument: null,
      card: false,
      list: true,
    });
  });

  it('resaltar señala el instrumento en su mesa', () => {
    expect(sceneFor(reply('highlight_instrument'))).toEqual({
      technique: 't-1',
      instrument: 'i-1',
      card: false,
      list: false,
    });
  });

  it('describir lo señala y además abre su ficha', () => {
    expect(sceneFor(reply('describe_instrument'))).toEqual({
      technique: 't-1',
      instrument: 'i-1',
      card: true,
      list: false,
    });
  });

  it('una respuesta en texto, una aclaración o «sin respuesta» no cambian el visor aunque traigan ids', () => {
    // Decir que la Kelly no va en esa mesa no es señalarla.
    for (const action of ['answer', 'clarify', 'no_answer'] as const) {
      expect(sceneFor(reply(action))).toEqual({
        technique: null,
        instrument: null,
        card: false,
        list: false,
      });
    }
  });
});
