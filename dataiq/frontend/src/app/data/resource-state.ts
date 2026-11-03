/** Lo que hace falta de un `httpResource` para saber si su petición falló. */
interface ResourceState {
  hasValue(): boolean;
  isLoading(): boolean;
  error(): unknown;
}

/**
 * La petición falló y no hay nada que mostrar: ni valor ni otra petición en curso. El interceptor ya
 * avisó del error; quien la usa dice que no se pudo cargar y ofrece «Reintentar».
 */
export function hasFailed(resource: ResourceState): boolean {
  return !resource.hasValue() && !resource.isLoading() && resource.error() !== undefined;
}
