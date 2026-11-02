/** Una lista nueva sin el elemento de esa posición. Una posición que no existe la deja igual. */
export function removeAt<T>(list: readonly T[], index: number): T[] {
  return list.filter((_, position) => position !== index);
}
