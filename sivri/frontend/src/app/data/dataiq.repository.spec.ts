import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { DataIQRepository } from './dataiq.repository';
import { provideRepositoryTesting, TEST_DATAIQ } from './testing';

describe('DataIQRepository', () => {
  let repository: DataIQRepository;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideRepositoryTesting() });
    repository = TestBed.inject(DataIQRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('me pide la cuenta de la cookie de sesión', async () => {
    const account = firstValueFrom(repository.me());
    http.expectOne(`${TEST_DATAIQ}/auth/me`).flush({ id: 'u-1', name: 'Ana' });
    expect(await account).toEqual({ id: 'u-1', name: 'Ana' });
  });

  it('moduleToken pide el token corto con POST y sin cuerpo', async () => {
    const token = firstValueFrom(repository.moduleToken());
    const request = http.expectOne(`${TEST_DATAIQ}/auth/module-token`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    request.flush({ access_token: 'abc', token_type: 'bearer', expires_in: 300 });
    expect(await token).toEqual({ access_token: 'abc', token_type: 'bearer', expires_in: 300 });
  });

  it('logout borra la cookie de sesión', async () => {
    const done = firstValueFrom(repository.logout(), { defaultValue: undefined });
    const request = http.expectOne(`${TEST_DATAIQ}/auth/logout`);
    expect(request.request.method).toBe('POST');
    request.flush(null);
    await done;
  });

  it('specialties y techniques piden lo publicado', () => {
    TestBed.runInInjectionContext(() => {
      repository.specialties();
      repository.techniques();
    });
    TestBed.tick();
    http.expectOne(`${TEST_DATAIQ}/specialties`).flush([]);
    http.expectOne(`${TEST_DATAIQ}/techniques`).flush([]);
  });
});
