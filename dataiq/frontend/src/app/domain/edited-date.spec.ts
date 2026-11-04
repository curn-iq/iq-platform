import { formatDay, formatEdited, isYesterday } from './edited-date';

// Hora local: las fechas se arman con `new Date(año, mes, día, hora, minuto)`.
const NOW = new Date(2026, 10, 1, 15, 30); // 1 de noviembre de 2026

describe('formatEdited', () => {
  it('de hoy dice «Hoy» con la hora de 24 horas y los minutos con dos cifras', () => {
    expect(formatEdited(new Date(2026, 10, 1, 10, 42), NOW)).toBe('Hoy, 10:42');
    expect(formatEdited(new Date(2026, 10, 1, 9, 5), NOW)).toBe('Hoy, 09:05');
    expect(formatEdited(new Date(2026, 10, 1, 0, 0), NOW)).toBe('Hoy, 00:00');
  });

  it('del día anterior dice «Ayer», sin hora, aunque hayan pasado menos de 24 horas', () => {
    expect(formatEdited(new Date(2026, 9, 31, 23, 59), new Date(2026, 10, 1, 0, 5))).toBe('Ayer');
    expect(formatEdited(new Date(2026, 9, 31, 8, 0), NOW)).toBe('Ayer');
  });

  it('«Ayer» cruza el cambio de mes y de año', () => {
    expect(formatEdited(new Date(2026, 11, 31, 20, 0), new Date(2027, 0, 1, 9, 0))).toBe('Ayer');
  });

  it('de antes, el día y el mes abreviado', () => {
    expect(formatEdited(new Date(2026, 9, 3, 10, 0), NOW)).toBe('3 oct');
    expect(formatEdited(new Date(2026, 0, 15, 10, 0), NOW)).toBe('15 ene');
  });

  it('de otro año suma el año', () => {
    expect(formatEdited(new Date(2025, 9, 3, 10, 0), NOW)).toBe('3 oct 2025');
  });
});

describe('formatDay', () => {
  it('es siempre el día y el mes, aunque sea de hoy o de ayer', () => {
    expect(formatDay(new Date(2026, 10, 1, 10, 0), NOW)).toBe('1 nov');
    expect(formatDay(new Date(2026, 9, 31, 10, 0), NOW)).toBe('31 oct');
  });

  it('abrevia los doce meses', () => {
    const months = Array.from({ length: 12 }, (_, month) =>
      formatDay(new Date(2026, month, 2), NOW),
    );

    expect(months).toEqual([
      '2 ene',
      '2 feb',
      '2 mar',
      '2 abr',
      '2 may',
      '2 jun',
      '2 jul',
      '2 ago',
      '2 sep',
      '2 oct',
      '2 nov',
      '2 dic',
    ]);
  });

  it('de otro año suma el año', () => {
    expect(formatDay(new Date(2025, 11, 24), NOW)).toBe('24 dic 2025');
  });
});

describe('isYesterday', () => {
  it('es el día de calendario anterior, no las últimas 24 horas', () => {
    expect(isYesterday(new Date(2026, 9, 31, 23, 59), new Date(2026, 10, 1, 0, 5))).toBe(true);
    expect(isYesterday(new Date(2026, 9, 31, 0, 0), NOW)).toBe(true);
    expect(isYesterday(new Date(2026, 10, 1, 0, 0), NOW)).toBe(false);
    expect(isYesterday(new Date(2026, 9, 30, 23, 59), NOW)).toBe(false);
  });

  it('cruza el cambio de año', () => {
    expect(isYesterday(new Date(2026, 11, 31, 20, 0), new Date(2027, 0, 1, 9, 0))).toBe(true);
  });
});
