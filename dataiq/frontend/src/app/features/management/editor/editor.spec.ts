import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideRepositoryTesting, TEST_API_BASE } from '../../../data/testing';
import { Editor } from './editor';

describe('Editor', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRepositoryTesting(),
        provideRouter([
          { path: 'gestion/editor/nueva', component: Editor },
          { path: 'gestion/editor/:versionId/:paso', component: Editor },
        ]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  it('sin versión es una técnica nueva: pide nombre y especialidad', async () => {
    await harness.navigateByUrl('/gestion/editor/nueva');
    http.expectOne(`${TEST_API_BASE}/specialties`).flush([]);

    expect(harness.routeNativeElement!.querySelector('app-new-technique')).not.toBeNull();
  });

  it('con una versión no muestra la pantalla de técnica nueva (sus pasos llegan en otra casilla)', async () => {
    await harness.navigateByUrl('/gestion/editor/v-1/datos-clinicos');

    expect(harness.routeNativeElement!.querySelector('app-new-technique')).toBeNull();
    http.expectNone(`${TEST_API_BASE}/specialties`);
  });
});
