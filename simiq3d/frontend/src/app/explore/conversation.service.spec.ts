import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRepositoryTesting, TEST_SIMIQ3D } from '../data/testing';
import { ConversationService } from './conversation.service';

describe('ConversationService', () => {
  const CHAT = `${TEST_SIMIQ3D}/chat`;
  let conversation: ConversationService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideRepositoryTesting() });
    conversation = TestBed.inject(ConversationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const reply = {
    action: 'highlight_instrument',
    technique_id: 't-1',
    instrument_id: 'i-kelly',
    field: null,
    reply: 'La Pinza Kelly es el número 9.',
    options: ['¿Qué es la Pinza Kelly?'],
  };

  it('guarda la pregunta y la respuesta, y la escena que pide', async () => {
    const asked = conversation.ask('  ¿Dónde va la Kelly?  ', 't-1');
    expect(conversation.pending()).toBe(true);
    const request = http.expectOne(CHAT);
    expect(request.request.body).toEqual({ question: '¿Dónde va la Kelly?', technique_id: 't-1' });
    request.flush(reply);
    await asked;

    expect(conversation.pending()).toBe(false);
    expect(conversation.messages().map((m) => m.from)).toEqual(['person', 'simiq3d']);
    expect(conversation.scene()).toEqual({
      technique: 't-1',
      instrument: 'i-kelly',
      card: false,
      list: false,
    });
    conversation.takeScene();
    expect(conversation.scene()).toBeNull();
  });

  it('una pregunta a la vez', async () => {
    const first = conversation.ask('Una', null);
    void conversation.ask('Otra', null);
    http.expectOne(CHAT).flush(reply);
    await first;
    expect(conversation.messages().filter((m) => m.from === 'person')).toHaveLength(1);
  });

  it('con el Servidor PC2 apagado, el aviso dice que el chat no está disponible', async () => {
    const asked = conversation.ask('¿Dónde va la Kelly?', 't-1');
    http
      .expectOne(CHAT)
      .flush({ detail: 'El chat no está disponible' }, { status: 503, statusText: 'Unavailable' });
    await asked;
    expect(conversation.notice()?.title).toBe('El chat no está disponible en este momento.');
    expect(conversation.notice()?.line).toContain('siguen funcionando');
  });

  it('el tope de preguntas seguidas dice el texto de la API', async () => {
    const asked = conversation.ask('Otra pregunta', null);
    http
      .expectOne(CHAT)
      .flush(
        { detail: 'Hiciste muchas preguntas seguidas. Espera unos minutos.' },
        { status: 429, statusText: 'Too Many Requests' },
      );
    await asked;
    expect(conversation.notice()?.title).toBe(
      'Hiciste muchas preguntas seguidas. Espera unos minutos.',
    );
  });

  it('la siguiente respuesta quita el aviso', async () => {
    const failed = conversation.ask('Una', null);
    http.expectOne(CHAT).flush({}, { status: 500, statusText: 'Error' });
    await failed;
    expect(conversation.notice()).not.toBeNull();

    const answered = conversation.ask('Otra', null);
    http.expectOne(CHAT).flush(reply);
    await answered;
    expect(conversation.notice()).toBeNull();
  });
});
