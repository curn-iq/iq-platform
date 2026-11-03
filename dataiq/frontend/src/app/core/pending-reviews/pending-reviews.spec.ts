import type { HttpParams } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Account } from '../../data/api/models';
import { provideRepositoryTesting, TEST_API_BASE } from '../../data/testing';
import type { Role } from '../../domain/role';
import { SessionService } from '../session/session.service';
import { PendingReviews } from './pending-reviews';

const account = (role: Role, id = 'u-revisor'): Account => ({
  id,
  name: 'Laura Pérez',
  email: 'laura@example.com',
  role,
});

function version(id: string, createdBy: string, updatedAt: string) {
  return {
    id,
    technique_id: `t-${id}`,
    technique: `Técnica ${id}`,
    specialty: 'Cirugía general',
    number: 2,
    state: 'in_review',
    created_by: createdBy,
    author: 'Daniela Ortiz',
    updated_at: updatedAt,
  };
}

describe('PendingReviews', () => {
  let http: HttpTestingController;
  let pending: PendingReviews;
  const current = signal<Account | null>(null);

  const isList = (r: { url: string; params: HttpParams }) => r.url === `${TEST_API_BASE}/versions`;

  async function settle(): Promise<void> {
    for (let i = 0; i < 3; i++) {
      await Promise.resolve();
      TestBed.tick();
    }
  }

  beforeEach(() => {
    current.set(account('reviewer'));
    TestBed.configureTestingModule({
      providers: [
        provideRepositoryTesting(),
        {
          provide: SessionService,
          useValue: { account: current.asReadonly(), role: () => current()?.role ?? null },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    pending = TestBed.inject(PendingReviews);
  });

  afterEach(() => http.verify());

  it('no pide nada hasta que alguien la necesita', async () => {
    await settle();

    http.expectNone(isList);
    expect(pending.count()).toBeNull();
    expect(pending.rows()).toEqual([]);
  });

  it('pide las versiones en revisión y cuenta las de otras personas', async () => {
    pending.refresh();
    await settle();

    const request = http.expectOne(isList);
    expect(request.request.params.getAll('state')).toEqual(['in_review']);
    request.flush([
      version('a', 'u-autor', '2026-10-01T09:00:00'),
      version('b', 'u-revisor', '2026-10-02T09:00:00'),
      version('c', 'u-otro', '2026-10-03T09:00:00'),
    ]);
    await settle();

    expect(pending.loaded()).toBe(true);
    expect(pending.rows().map((r) => r.id)).toEqual(['a', 'c']);
    expect(pending.count()).toBe(2);
  });

  it('sin nadie por revisar la cifra es 0, no «no se sabe»', async () => {
    pending.refresh();
    await settle();
    http.expectOne(isList).flush([]);
    await settle();

    expect(pending.count()).toBe(0);
  });

  it('pedirla otra vez revisa de nuevo y conserva la lista hasta que llegue la nueva', async () => {
    pending.refresh();
    await settle();
    http.expectOne(isList).flush([version('a', 'u-autor', '2026-10-01T09:00:00')]);
    await settle();

    pending.refresh();
    await settle();

    expect(pending.count()).toBe(1);
    http.expectOne(isList).flush([]);
    await settle();
    expect(pending.count()).toBe(0);
  });

  it.each(['user', 'contributor'] as const)('con rol %s no pide nada', async (role) => {
    current.set(account(role));
    pending.refresh();
    await settle();

    http.expectNone(isList);
    expect(pending.count()).toBeNull();
  });

  it('sin cuenta no pide nada', async () => {
    current.set(null);
    pending.refresh();
    await settle();

    http.expectNone(isList);
  });

  it('si falla, no sabe cuántas hay y lo dice', async () => {
    pending.refresh();
    await settle();
    http.expectOne(isList).flush('', { status: 500, statusText: 'Server Error' });
    await settle();

    expect(pending.failed()).toBe(true);
    expect(pending.count()).toBeNull();
  });

  it('si se pidió antes de saber quién es, la pide cuando llega la cuenta', async () => {
    current.set(null);
    pending.refresh();
    await settle();
    http.expectNone(isList);

    current.set(account('reviewer'));
    await settle();

    http.expectOne(isList).flush([version('a', 'u-autor', '2026-10-01T09:00:00')]);
    await settle();
    expect(pending.count()).toBe(1);
  });

  it('al cambiar de cuenta se olvida lo pedido: la nueva no hereda la lista', async () => {
    pending.refresh();
    await settle();
    http.expectOne(isList).flush([version('a', 'u-autor', '2026-10-01T09:00:00')]);
    await settle();
    expect(pending.count()).toBe(1);

    current.set(account('reviewer', 'u-otro-revisor'));
    await settle();

    http.expectNone(isList);
    expect(pending.count()).toBeNull();
  });
});
