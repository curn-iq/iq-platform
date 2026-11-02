import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DATAIQ_API, SIMIQ3D_API } from '../../data/api-base-url';
import { provideApi } from './api.providers';
import { CLIENT_HEADER } from './client-header.interceptor';

describe('provideApi', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideApi(), provideHttpClientTesting(), provideRouter([])],
    });
  });

  it('llega a cada API por su ruta del mismo origen', () => {
    expect(TestBed.inject(DATAIQ_API)).toBe('/api/dataiq');
    expect(TestBed.inject(SIMIQ3D_API)).toBe('/api/simiq3d');
  });

  it('manda X-IQ-Client: web en todas las peticiones', () => {
    TestBed.inject(HttpClient).get('/api/simiq3d/models').subscribe();
    const request = TestBed.inject(HttpTestingController).expectOne('/api/simiq3d/models');
    expect(request.request.headers.get(CLIENT_HEADER)).toBe('web');
    request.flush([]);
  });
});
