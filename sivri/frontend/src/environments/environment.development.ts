/**
 * En desarrollo el shell corre aparte, en el puerto 4200 (`ng serve` del
 * frontend de DataIQ), esta app en el 4400 y el backend de SIVRI en el 8002 (con
 * `CORS_ORIGINS` incluyendo `http://localhost:4400`).
 */
export const environment = {
  shellUrl: 'http://localhost:4200',
  sivriApiUrl: 'http://127.0.0.1:8002',
  sivriSocketUrl: 'ws://127.0.0.1:8002/ws/validate',
  publicUrl: 'http://localhost:4400/sivri',
};
