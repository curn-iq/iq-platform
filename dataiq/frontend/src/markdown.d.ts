// Los `.md` se importan como texto (`loader` de `angular.json`): el aviso de privacidad
// sale de `docs/privacidad.md`, que es su único lugar.
declare module '*.md' {
  const text: string;
  export default text;
}
