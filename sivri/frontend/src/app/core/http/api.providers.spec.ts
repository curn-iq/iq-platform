import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { DATAIQ_API, SIVRI_API } from '../../data/api-base-url';
import { provideApi } from './api.providers';
import { CLIENT_HEADER } from './client-header.interceptor';

describe('provideApi', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideApi(), provideHttpClientTesting(), provideRouter([])],
    });
  });

  it('llega a DataIQ por el mismo origen y a SIVRI por su dirección directa', () => {
    expect(TestBed.inject(DATAIQ_API)).toBe('/api/dataiq');
    expect(TestBed.inject(SIVRI_API)).toBe(environment.sivriApiUrl);
  });

  it('manda X-IQ-Client: web a DataIQ y no a SIVRI', () => {
    const http = TestBed.inject(HttpClient);
    http.get('/api/dataiq/specialties').subscribe();
    http.get(`${environment.sivriApiUrl}/techniques`).subscribe();
    const controller = TestBed.inject(HttpTestingController);
    const dataiq = controller.expectOne('/api/dataiq/specialties');
    const sivri = controller.expectOne(`${environment.sivriApiUrl}/techniques`);
    expect(dataiq.request.headers.get(CLIENT_HEADER)).toBe('web');
    expect(sivri.request.headers.has(CLIENT_HEADER)).toBe(false);
    dataiq.flush([]);
    sivri.flush([]);
  });
});
