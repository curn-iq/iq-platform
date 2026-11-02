/**
 * Lo que cambia entre producción y desarrollo. En producción SIMIQ3D se sirve
 * bajo `/simiq3d/` en el mismo origen que el shell, así que sus páginas (el
 * ingreso, el catálogo) son rutas del mismo sitio.
 */
export const environment = {
  /** Origen del shell; vacío es el mismo origen que esta app. */
  shellUrl: '',
};
