/** Un grupo de técnicas de una especialidad, en el orden en que se muestran. */
export interface TechniqueGroup<T> {
  specialty: string;
  techniques: T[];
}

/**
 * Agrupa técnicas por el nombre de su especialidad (`specialty`). Los grupos
 * salen en el orden de `specialties` (el que da la API) y, dentro de cada uno,
 * las técnicas en el orden en que llegan. Una especialidad sin técnicas no
 * forma grupo: no hay nada que listar. Una técnica de una especialidad que no
 * está en `specialties` va al final, para no perderla.
 */
export function groupBySpecialty<T extends { specialty: string }>(
  specialties: readonly string[],
  techniques: readonly T[],
): TechniqueGroup<T>[] {
  const groups = new Map<string, T[]>(specialties.map((name) => [name, []]));
  for (const technique of techniques) {
    const group = groups.get(technique.specialty);
    if (group) group.push(technique);
    else groups.set(technique.specialty, [technique]);
  }
  return [...groups]
    .filter(([, list]) => list.length > 0)
    .map(([specialty, list]) => ({ specialty, techniques: list }));
}
