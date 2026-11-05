import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HttpEventType } from '@angular/common/http';
import { provideRepositoryTesting, streamed, TEST_SIMIQ3D } from '../data/testing';
import { ConversationService } from './conversation.service';

describe('ConversationService', () => {
  const CHAT = `${TEST_SIMIQ3D}/chat/stream`;
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
    generated: true,
    options: ['¿Qué es la Pinza Kelly?'],
    requests: [{ kind: 'locate', instrument: 'Pinza Kelly' }],
  };

  it('guarda la pregunta y la respuesta, y la escena que pide', async () => {
    const asked = conversation.ask('  ¿Dónde va la Kelly?  ', 't-1');
    expect(conversation.pending()).toBe(true);
    const request = http.expectOne(CHAT);
    expect(request.request.body).toEqual({
      question: '¿Dónde va la Kelly?',
      technique_id: 't-1',
      previous: [],
    });
    request.flush(streamed(reply));
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

  it('manda las tres últimas preguntas con lo que entendió el chat y su texto', async () => {
    for (const question of ['Una', 'Dos', 'Tres', 'Cuatro']) {
      const asked = conversation.ask(question, 't-1');
      http.expectOne(CHAT).flush(streamed(reply));
      await asked;
    }
    void conversation.ask('¿Y para qué sirve?', 't-1');
    const request = http.expectOne(CHAT);

    expect(request.request.body.previous).toEqual(
      ['Dos', 'Tres', 'Cuatro'].map((question) => ({
        question,
        requests: reply.requests,
        reply: reply.reply,
      })),
    );
    request.flush(streamed(reply));
  });

  it('una pregunta a la vez', async () => {
    const first = conversation.ask('Una', null);
    void conversation.ask('Otra', null);
    http.expectOne(CHAT).flush(streamed(reply));
    await first;
    expect(conversation.messages().filter((m) => m.from === 'person')).toHaveLength(1);
  });

  it('con el Servidor PC2 apagado, el aviso dice que el chat no está disponible', async () => {
    const asked = conversation.ask('¿Dónde va la Kelly?', 't-1');
    http.expectOne(CHAT).flush(JSON.stringify({ detail: 'El chat no está disponible' }), {
      status: 503,
      statusText: 'Unavailable',
    });
    await asked;
    expect(conversation.notice()?.title).toBe('El chat no está disponible en este momento.');
    expect(conversation.notice()?.line).toContain('siguen funcionando');
  });

  it('el tope de preguntas seguidas dice el texto de la API', async () => {
    const asked = conversation.ask('Otra pregunta', null);
    http
      .expectOne(CHAT)
      .flush(
        JSON.stringify({ detail: 'Hiciste muchas preguntas seguidas. Espera unos minutos.' }),
        { status: 429, statusText: 'Too Many Requests' },
      );
    await asked;
    expect(conversation.notice()?.title).toBe(
      'Hiciste muchas preguntas seguidas. Espera unos minutos.',
    );
  });

  it('la siguiente respuesta quita el aviso', async () => {
    const failed = conversation.ask('Una', null);
    http.expectOne(CHAT).flush('{}', { status: 500, statusText: 'Error' });
    await failed;
    expect(conversation.notice()).not.toBeNull();

    const answered = conversation.ask('Otra', null);
    http.expectOne(CHAT).flush(streamed(reply));
    await answered;
    expect(conversation.notice()).toBeNull();
  });

  it('con la respuesta a medias, el visor cambia ya y el texto crece frase por frase', async () => {
    const asked = conversation.ask('¿Dónde va la Kelly?', 't-1');
    const request = http.expectOne(CHAT);
    const [start, first] = streamed(reply, ['La Pinza Kelly', ' es el número 9.']).split('\n');

    request.event({ type: HttpEventType.DownloadProgress, loaded: 1, partialText: `${start}\n` });
    expect(conversation.scene()?.instrument).toBe('i-kelly');
    expect(conversation.waiting()).toBe(true);
    const text = () => {
      const last = conversation.messages().at(-1);
      return last?.from === 'simiq3d' ? last.reply.reply : null;
    };
    expect(text()).toBe('');

    request.event({
      type: HttpEventType.DownloadProgress,
      loaded: 2,
      partialText: `${start}\n${first}\n`,
    });
    // El texto no sale de golpe: se escribe a paso parejo, y las opciones esperan al final
    await vi.waitFor(() => expect(text()).toBe('La Pinza Kelly'));
    expect(text()!.length).toBeGreaterThan(0);
    expect(conversation.waiting()).toBe(false);
    expect(conversation.pending()).toBe(true);
    expect(conversation.messages().at(-1)).toMatchObject({ writing: true });

    request.flush(streamed(reply, ['La Pinza Kelly', ' es el número 9.']));
    await asked;
    expect(text()).toBe('La Pinza Kelly es el número 9.');
    expect(conversation.messages().at(-1)).toMatchObject({ writing: false });
    expect(conversation.pending()).toBe(false);
  });

  it('si la respuesta se corta, lo escrito queda y el aviso lo dice', async () => {
    const asked = conversation.ask('¿Dónde va la Kelly?', 't-1');
    const [start, first] = streamed(reply, ['La Pinza Kelly']).split('\n');
    http.expectOne(CHAT).flush(`${start}\n${first}\n`);
    await asked;

    const last = conversation.messages().at(-1);
    expect(last?.from === 'simiq3d' && last.reply.reply).toBe('La Pinza Kelly');
    expect(conversation.notice()?.title).toBe('La respuesta se cortó antes de terminar.');
  });
});
