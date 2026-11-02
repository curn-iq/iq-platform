import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRepositoryTesting, TEST_API_BASE } from '../../../data/testing';
import { EditorCatalog } from './editor-catalog';

describe('EditorCatalog', () => {
  let catalog: EditorCatalog;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRepositoryTesting(), EditorCatalog] });
    catalog = TestBed.inject(EditorCatalog);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('no pide nada hasta que un paso lo usa', () => {
    TestBed.tick();
    http.expectNone(`${TEST_API_BASE}/catalog/full`);
  });

  it('lo pide una sola vez aunque lo usen varios pasos', async () => {
    const first = catalog.use();
    TestBed.tick();
    http
      .expectOne(`${TEST_API_BASE}/catalog/full`)
      .flush({ categories: [], instruments: [], sutures: [], zones: [], techniques: [] });
    await Promise.resolve();

    const second = catalog.use();
    TestBed.tick();

    http.expectNone(`${TEST_API_BASE}/catalog/full`);
    expect(second).toBe(first);
    expect(second.hasValue()).toBe(true);
  });
});
