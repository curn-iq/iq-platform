/** «1 borrador», «3 borradores»: la cifra con el nombre en singular o en plural. */
export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}
