const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * El día y el mes abreviado («3 oct»), con el año si no es el de `now` («3 oct 2025»). Va
 * en hora local y sin `Intl`, para que no cambie con el navegador.
 */
export function formatDay(date: Date, now: Date): string {
  const day = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
  return date.getFullYear() === now.getFullYear() ? day : `${day} ${date.getFullYear()}`;
}

/**
 * Cuándo se editó por última vez, como en Mis borradores: «Hoy, 10:42» (24 horas), «Ayer»
 * (el día de calendario anterior, no las últimas 24 horas) y, de antes, «3 oct».
 */
export function formatEdited(date: Date, now: Date): string {
  if (sameDay(date, now)) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `Hoy, ${hours}:${minutes}`;
  }
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  return sameDay(date, yesterday) ? 'Ayer' : formatDay(date, now);
}
