import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_BASE_URL } from '../../data/api-base-url';
import { API_BASE, provideApi } from './api.providers';
import { CLIENT_HEADER } from './client-header.interceptor';

describe('provideApi', () => {
  let client: HttpClient;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideApi(), provideHttpClientTesting()],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('da a data/ la base /api/dataiq', () => {
    expect(TestBed.inject(API_BASE_URL)).toBe('/api/dataiq');
    expect(API_BASE).toBe('/api/dataiq');
  });

  it('manda X-IQ-Client: web en las lecturas', () => {
    client.get('/api/dataiq/techniques').subscribe();
    const request = http.expectOne('/api/dataiq/techniques');
    expect(request.request.headers.get(CLIENT_HEADER)).toBe('web');
    request.flush([]);
  });

  it('manda X-IQ-Client: web en las escrituras', () => {
    client.post('/api/dataiq/auth/login', {}).subscribe();
    const request = http.expectOne('/api/dataiq/auth/login');
    expect(request.request.headers.get(CLIENT_HEADER)).toBe('web');
    request.flush({});
  });

  it('no deja pasar el encabezado con otro valor', () => {
    client.get('/api/dataiq/techniques', { headers: { [CLIENT_HEADER]: 'otro' } }).subscribe();
    const request = http.expectOne('/api/dataiq/techniques');
    expect(request.request.headers.getAll(CLIENT_HEADER)).toEqual(['web']);
    request.flush([]);
  });
});
