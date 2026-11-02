import { HttpTestingController } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { Account } from '../../data/api/models';
import type { Role } from '../../domain/role';
import { provideRepositoryTesting, TEST_API_BASE } from '../../data/testing';
import { AccountMenu } from './account-menu';
import { SignOut } from './sign-out';

@Component({ template: '' })
class Blank {}

describe('AccountMenu', () => {
  let fixture: ComponentFixture<AccountMenu>;

  const root = () => fixture.nativeElement as HTMLElement;
  const text = (selector: string) => root().querySelector(selector)?.textContent?.trim();
  const links = () =>
    Array.from(root().querySelectorAll<HTMLAnchorElement>('.links a')).map((a) => [
      a.textContent!.trim(),
      a.getAttribute('href'),
    ]);

  async function open(role: Role, name = 'Daniela Ortiz'): Promise<void> {
    const account: Account = { id: 'u-1', name, email: 'daniela.ortiz@correo.com', role };
    fixture = TestBed.createComponent(AccountMenu);
    fixture.componentRef.setInput('account', account);
    await fixture.whenStable();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRepositoryTesting(), provideRouter([{ path: '**', component: Blank }])],
    });
  });

  it('es una región «Mi cuenta»', async () => {
    await open('user');

    expect(root().getAttribute('role')).toBe('region');
    expect(root().getAttribute('aria-label')).toBe('Mi cuenta');
    expect(root().id).toBe('account-menu');
  });

  it('dice quién es: avatar con iniciales, nombre, correo y rol', async () => {
    await open('contributor');

    expect(text('app-avatar')).toBe('DO');
    expect(text('.name')).toBe('Daniela Ortiz');
    expect(text('.email')).toBe('daniela.ortiz@correo.com');
    expect(text('.role')).toBe('Colaborador');
  });

  it.each([
    ['user', 'Usuario'],
    ['contributor', 'Colaborador'],
    ['reviewer', 'Revisor'],
    ['admin', 'Admin'],
  ] as const)('el rol %s se llama «%s»', async (role, label) => {
    await open(role);

    expect(text('.role')).toBe(label);
  });

  it('un usuario no ve la gestión', async () => {
    await open('user');

    expect(root().querySelector('.title')).toBeNull();
    expect(links()).toEqual([]);
  });

  it('un colaborador ve sus borradores bajo «Gestión de DataIQ»', async () => {
    await open('contributor');

    expect(text('.title')).toBe('Gestión de DataIQ');
    expect(links()).toEqual([['Mis borradores', '/gestion/borradores']]);
  });

  it('un revisor suma por revisar e instrumental', async () => {
    await open('reviewer');

    expect(links()).toEqual([
      ['Mis borradores', '/gestion/borradores'],
      ['Por revisar', '/gestion/revision'],
      ['Instrumental', '/gestion/instrumental'],
    ]);
  });

  it('un admin suma usuarios y roles', async () => {
    await open('admin');

    expect(links().map(([label]) => label)).toEqual([
      'Mis borradores',
      'Por revisar',
      'Instrumental',
      'Usuarios y roles',
    ]);
  });

  it('marca el acceso de la página actual, también en una subruta', async () => {
    await open('reviewer');
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/gestion/instrumental/abc');
    await fixture.whenStable();

    const current = Array.from(root().querySelectorAll('.links a'))
      .filter((a) => a.getAttribute('aria-current') === 'page')
      .map((a) => a.textContent!.trim());
    expect(current).toEqual(['Instrumental']);
  });

  it('avisa con `chosen` al tocar un acceso y no al tocar otra cosa', async () => {
    await open('contributor');
    let chosen = 0;
    fixture.componentInstance.chosen.subscribe(() => chosen++);

    root().querySelector<HTMLElement>('.name')!.click();
    expect(chosen).toBe(0);

    root().querySelector<HTMLAnchorElement>('.links a')!.click();
    expect(chosen).toBe(1);
  });

  describe('cerrar sesión', () => {
    const button = () => root().querySelector<HTMLButtonElement>('button.exit')!;

    it.each(['user', 'contributor', 'reviewer', 'admin'] as const)(
      'un %s la tiene al final, después de lo demás, con su ícono',
      async (role) => {
        await open(role);

        expect(button().textContent!.trim()).toBe('Cerrar sesión');
        expect(button().querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
        expect(root().lastElementChild).toBe(button());
      },
    );

    it('un usuario sin gestión solo ve quién es y cerrar sesión', async () => {
      await open('user');

      expect(root().querySelector('.title')).toBeNull();
      expect(links()).toEqual([]);
      expect(button()).not.toBeNull();
    });

    it('es un botón, no un enlace: no navega por sí mismo', async () => {
      await open('contributor');

      expect(button().tagName).toBe('BUTTON');
      expect(button().type).toBe('button');
    });

    it('al tocarlo, cierra la sesión y avisa con `chosen` para que el panel se cierre', async () => {
      await open('contributor');
      const run = vi.spyOn(TestBed.inject(SignOut), 'run').mockResolvedValue();
      let chosen = 0;
      fixture.componentInstance.chosen.subscribe(() => chosen++);

      button().click();

      expect(run).toHaveBeenCalledTimes(1);
      expect(chosen).toBe(1);
    });

    it('mientras cierra, dice que está ocupado', async () => {
      await open('contributor');
      const http = TestBed.inject(HttpTestingController);
      expect(button().getAttribute('aria-busy')).toBe('false');

      button().click();
      await fixture.whenStable();
      expect(button().getAttribute('aria-busy')).toBe('true');

      http
        .expectOne(`${TEST_API_BASE}/auth/logout`)
        .flush(null, { status: 204, statusText: 'No Content' });
      await vi.waitFor(() => expect(button().getAttribute('aria-busy')).toBe('false'));
    });
  });
});
