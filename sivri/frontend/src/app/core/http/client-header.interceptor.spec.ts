import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CLIENT_HEADER, clientHeaderInterceptor } from './client-header.interceptor';

describe('clientHeaderInterceptor', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([clientHeaderInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  it('pone X-IQ-Client: web en las peticiones a DataIQ', () => {
    TestBed.inject(HttpClient).get('/api/dataiq/auth/me').subscribe();
    const request = http.expectOne('/api/dataiq/auth/me');
    expect(request.request.headers.get(CLIENT_HEADER)).toBe('web');
    request.flush({});
  });

  it('no lo pone en las de SIVRI, cuyo CORS no lo admite', () => {
    TestBed.inject(HttpClient).get('https://sivri.example/techniques').subscribe();
    const request = http.expectOne('https://sivri.example/techniques');
    expect(request.request.headers.has(CLIENT_HEADER)).toBe(false);
    request.flush([]);
  });
});
