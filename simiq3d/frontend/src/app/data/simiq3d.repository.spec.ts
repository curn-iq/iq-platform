import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { Simiq3dRepository } from './simiq3d.repository';
import { provideRepositoryTesting, TEST_SIMIQ3D } from './testing';

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

  it('ask manda la pregunta con la técnica abierta y devuelve la respuesta', async () => {
    const reply = firstValueFrom(repository.ask('¿Dónde va la Kelly?', 't-1'));
    const request = http.expectOne(`${TEST_SIMIQ3D}/chat`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ question: '¿Dónde va la Kelly?', technique_id: 't-1' });
    request.flush({ action: 'no_answer', reply: '…' });
    expect((await reply).action).toBe('no_answer');
  });

  it('sin técnica abierta, la manda vacía', () => {
    void firstValueFrom(repository.ask('Muéstrame la mastectomía', null));
    const request = http.expectOne(`${TEST_SIMIQ3D}/chat`);
    expect(request.request.body.technique_id).toBeNull();
    request.flush({});
  });
});
