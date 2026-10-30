import { HttpTestingController } from '@angular/common/http/testing';
import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRepositoryTesting, TEST_API_BASE } from '../../data/testing';
import { provideSession } from './session.providers';
import { SessionService } from './session.service';

describe('provideSession', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRepositoryTesting(), provideSession()] });
  });

  it('pide la cuenta al arrancar, sin esperar la respuesta para dar por iniciada la app', async () => {
    const http = TestBed.inject(HttpTestingController);
    const status = TestBed.inject(ApplicationInitStatus);

    // La app ya arrancó aunque `GET /auth/me` siga pendiente.
    await status.donePromise;
    const request = http.expectOne(`${TEST_API_BASE}/auth/me`);
    expect(TestBed.inject(SessionService).loaded()).toBe(false);

    request.flush({ id: 'u-1', name: 'Ana', email: 'ana@example.com', role: 'user' });
    await TestBed.inject(SessionService).load();

    expect(TestBed.inject(SessionService).account()?.name).toBe('Ana');
    http.verify();
  });
});
