/**
 * Hace clic en un enlace y dice si el router se encargó de él (cancela el
 * comportamiento del navegador) o lo dejó al navegador, que es la navegación
 * completa de un enlace a otra app (`/simiq3d/`, `/sivri/`). Al final cancela el
 * clic, porque jsdom no navega.
 */
export function handledByRouter(anchor: HTMLAnchorElement): boolean {
  let prevented = false;
  const observe = (event: Event) => {
    prevented = event.defaultPrevented;
    event.preventDefault();
  };
  document.addEventListener('click', observe);
  anchor.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
  document.removeEventListener('click', observe);
  return prevented;
}
