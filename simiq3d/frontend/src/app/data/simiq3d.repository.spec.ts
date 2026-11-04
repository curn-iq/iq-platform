import { HttpEventType } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Simiq3dRepository } from './simiq3d.repository';
import { provideRepositoryTesting, streamed, TEST_SIMIQ3D } from './testing';

describe('Simiq3dRepository', () => {
  let repository: Simiq3dRepository;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideRepositoryTesting() });
    repository = TestBed.inject(Simiq3dRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('models pide qué modelo 3D dibuja cada instrumento', () => {
    TestBed.runInInjectionContext(() => repository.models());
    TestBed.tick();
    http.expectOne(`${TEST_SIMIQ3D}/models`).flush([]);
  });

  it('ask manda la pregunta a /chat/stream y devuelve cada evento a medida que llega', () => {
    const events: string[] = [];
    repository.ask('¿Dónde va la Kelly?', 't-1').subscribe((e) => events.push(e.type));
    const request = http.expectOne(`${TEST_SIMIQ3D}/chat/stream`);
    expect(request.request.method).toBe('POST');
    expect(request.request.responseType).toBe('text');
    expect(request.request.body).toEqual({
      question: '¿Dónde va la Kelly?',
      technique_id: 't-1',
      previous: [],
    });
    const all = streamed({ action: 'no_answer', reply: 'Hola.' }, ['Ho', 'la.']);
    const [start, first] = all.split('\n');

    request.event({
      type: HttpEventType.DownloadProgress,
      loaded: 1,
      partialText: `${start}\n${first}`,
    });
    expect(events).toEqual(['start']);
    request.flush(all);
    expect(events).toEqual(['start', 'text', 'text', 'end']);
  });

  it('sin técnica abierta, la manda vacía', () => {
    repository.ask('Muéstrame la mastectomía', null).subscribe();
    const request = http.expectOne(`${TEST_SIMIQ3D}/chat/stream`);
    expect(request.request.body.technique_id).toBeNull();
    request.flush('');
  });
});
