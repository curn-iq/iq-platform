/**
 * Lo que dice «Editar una publicada» de una técnica que ya tiene una versión en curso (cada
 * técnica tiene una sola): «Ya está en curso» si es de quien pregunta y «En curso por …» si es de
 * otra persona. La API solo le entrega a un revisor o un admin las versiones en curso de otros;
 * a un colaborador, las suyas (Resuelto 24 de `dataiq/docs/checklist-frontend.md`).
 */
export function inProgressText(
  version: { created_by: string; author: string },
  accountId: string | undefined,
): string {
  return version.created_by === accountId ? 'Ya está en curso' : `En curso por ${version.author}`;
}
