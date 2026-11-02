import { HttpTestingController } from '@angular/common/http/testing';
import { signal } from '@angular/core';
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

  it('techniques pide las técnicas publicadas', () => {
    TestBed.runInInjectionContext(() => repository.techniques());
    TestBed.tick();
    http.expectOne(`${TEST_DATAIQ}/techniques`).flush([]);
  });

  it('technique y tables no piden nada sin id y piden la técnica cuando lo hay', () => {
    const id = signal<string | undefined>(undefined);
    TestBed.runInInjectionContext(() => {
      repository.technique(id);
      repository.tables(id);
    });
    TestBed.tick();
    http.expectNone(() => true);

    id.set('a/b');
    TestBed.tick();
    http.expectOne(`${TEST_DATAIQ}/techniques/a%2Fb`).flush({});
    http.expectOne(`${TEST_DATAIQ}/techniques/a%2Fb/instruments`).flush({});
  });

  it('instruments pide el instrumental del catálogo', () => {
    TestBed.runInInjectionContext(() => repository.instruments());
    TestBed.tick();
    http.expectOne(`${TEST_DATAIQ}/instruments`).flush([]);
  });
});
