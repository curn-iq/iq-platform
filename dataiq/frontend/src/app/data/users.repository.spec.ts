import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRepositoryTesting, TEST_API_BASE } from './testing';
import { UsersRepository } from './users.repository';

describe('UsersRepository', () => {
  let repository: UsersRepository;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideRepositoryTesting() });
    repository = TestBed.inject(UsersRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('list pide /users', () => {
    TestBed.runInInjectionContext(() => repository.list());
    TestBed.tick();
    http.expectOne(`${TEST_API_BASE}/users`).flush([]);
  });

  it('changeRole manda el rol con PATCH a la cuenta', () => {
    let result: unknown;
    repository.changeRole('u-1', 'reviewer').subscribe((user) => (result = user));

    const request = http.expectOne(`${TEST_API_BASE}/users/u-1/role`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ role: 'reviewer' });
    request.flush({ id: 'u-1', role: 'reviewer' });
    expect(result).toEqual({ id: 'u-1', role: 'reviewer' });
  });
});
