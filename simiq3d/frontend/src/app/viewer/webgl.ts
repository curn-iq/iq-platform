/**
 * Si el navegador puede dibujar la escena: Three.js necesita WebGL 2. Va aparte
 * para preguntarlo sin descargar Three.js.
 */
export function supportsWebGL(): boolean {
  try {
    return document.createElement('canvas').getContext('webgl2') !== null;
  } catch {
    return false;
  }
}
