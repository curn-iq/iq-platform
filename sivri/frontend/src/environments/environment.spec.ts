import { environment } from './environment';

// En las pruebas, `environment.ts` se reemplaza por `environment.development.ts`
// (`angular.json`); lo que vale para uno vale para el otro.
describe('environment', () => {
  it('el video va por wss si la API va por https, y por ws si va por http', () => {
    const secure = environment.sivriApiUrl.startsWith('https://');
    expect(environment.sivriSocketUrl.startsWith(secure ? 'wss://' : 'ws://')).toBe(true);
  });

  it('el video está en el mismo servidor que la API', () => {
    expect(new URL(environment.sivriSocketUrl).host).toBe(new URL(environment.sivriApiUrl).host);
  });

  it('el video termina en /ws/validate', () => {
    expect(new URL(environment.sivriSocketUrl).pathname).toBe('/ws/validate');
  });
});
