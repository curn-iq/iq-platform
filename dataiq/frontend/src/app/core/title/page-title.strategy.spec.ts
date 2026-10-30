import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { APP_NAME } from './page-title.strategy';
import { provideTitle } from './title.providers';

@Component({ template: '' })
class Blank {}

describe('PageTitleStrategy', () => {
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideTitle(),
        provideRouter([
          { path: '', component: Blank },
          { path: 'borradores', title: 'Mis borradores', component: Blank },
          { path: 'tecnicas/:id', title: 'Técnica', component: Blank },
        ]),
      ],
    });
    router = TestBed.inject(Router);
  });

  it('cierra el título de la ruta con el nombre del producto', async () => {
    await router.navigateByUrl('/borradores');

    expect(document.title).toBe('Mis borradores · IQ Platform');
  });

  it('una ruta sin título lleva solo el nombre del producto', async () => {
    await router.navigateByUrl('/borradores');
    await router.navigateByUrl('/');

    expect(document.title).toBe(APP_NAME);
  });

  it('cambia el título al cambiar de ruta', async () => {
    await router.navigateByUrl('/borradores');
    await router.navigateByUrl('/tecnicas/abc');

    expect(document.title).toBe('Técnica · IQ Platform');
  });
});
