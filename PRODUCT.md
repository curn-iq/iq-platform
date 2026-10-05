# Product

<!-- impeccable:product-schema 1 -->

<!-- Los títulos de sección siguen el esquema de Impeccable (en inglés) para que
las herramientas de diseño lo lean; el contenido va en español. -->

## Platform

web

## Stack

- Mockups: HTML y CSS estáticos, publicados como Artifacts de Claude. Su código
  vive en `diseno/mockups/`.
- Frontend de producción: se decide a partir de los mockups (candidato
  inicial: Svelte). Se despliega en Vercel (plan Hobby).
- Datos: la API de DataIQ (FastAPI + PostgreSQL). Los mockups usan el dataset
  real que ya está cargado en la base local.

## Users

- **Estudiantes de Instrumentación Quirúrgica** (usuario principal), de la
  CURN o de cualquier institución, y cualquier persona curiosa. Repasan fuera
  del laboratorio cómo se arma la mesa de cada técnica: qué instrumental lleva
  y dónde va cada objeto.
- **Revisores**: docentes e instrumentadores titulados. Aprueban o rechazan las
  versiones de las técnicas y mantienen el catálogo de instrumental.
- **Colaboradores**: crean técnicas y editan versiones en borrador.
- **Administración** (equipo de Ingeniería): asigna los roles.
- **Instituciones interesadas** (programas de IQ, docentes, directivas) que
  evalúan adoptar la plataforma: quieren saber qué productos hay, qué
  problema resuelve cada uno y quién está detrás. No son de ingeniería y
  juzgan por lo que ven en pantalla.

## Product Purpose

Un ecosistema para el aprendizaje autónomo de la distribución de instrumental
quirúrgico en mesa, fuera del laboratorio. Un punto de entrada (shell) reúne
tres módulos: DataIQ (consulta y gestión de técnicas), SIMIQ3D (exploración en
3D) y SIVRI (validación de la mesa con cámara). DataIQ es la fuente única de
verdad: técnicas digitalizadas con su instrumental normalizado y sus mesas de
Mayo y de reserva.

Éxito: un estudiante abre una técnica y reconoce su mesa tal como la documentó
el programa de IQ, y ningún contenido llega a los estudiantes sin revisión.

## Positioning

Un ecosistema de productos que resuelve problemas reales de quien estudia o
enseña Instrumentación Quirúrgica; no se presenta como proyecto universitario.

- El problema: practicar y verificar la distribución del instrumental en mesa
  fuera del laboratorio no tiene herramientas.
- Tres productos cubren el ciclo: conocer cada técnica con su mesa (DataIQ),
  verla en 3D (SIMIQ3D) y validar la mesa armada con cámara (SIVRI).
- Lo que se muestra es contenido confiable, revisado por docentes e
  instrumentadores. Cómo se garantiza (versiones, revisión, roles) es
  funcionamiento interno y no se explica en la web pública.

## Operating Context

- Cada técnica pertenece a una especialidad (5 en total: Cirugía General,
  Urología, Cirugía Laparoscópica, Ginecología, Ortopedia).
- Cada técnica tiene hasta dos mesas, la de Mayo y la de reserva, cada una con
  su propia numeración y una leyenda numerada. Un número puede ser un objeto
  compuesto ("compresa doblada con portaagujas y sutura").
- La fuente son los documentos de técnicas del equipo de IQ: archivos de Word
  con diagramas de mesa hechos a mano.
- Vocabulario del dominio: técnica, especialidad, mesa de Mayo, mesa de
  reserva, leyenda, instrumental, sutura, equipo biomédico, dispositivo
  médico, borrador, revisión, versión publicada.
- Se usa en computador y en celular por igual, también en equipos modestos
  (contexto universitario con recursos limitados).

## Capabilities and Constraints

- Navegación (detalle en `docs/flujos.md`): el inicio y el catálogo de
  técnicas (nombre y especialidad) son públicos; ver el detalle de una técnica
  y usar los módulos requiere una cuenta gratuita por autorregistro; la
  gestión aparece según el rol. Al iniciar sesión, la persona vuelve a donde
  iba.
- Roles acumulativos: usuario < colaborador < revisor < admin. El colaborador
  escribe borradores y los envía a revisión; el revisor aprueba o rechaza
  versiones ajenas, archiva técnicas y edita el instrumental; el admin asigna
  roles.
- Ciclo de una versión: borrador → en revisión → publicada → reemplazada o
  archivada.
- El registro exige aceptar la política de tratamiento de datos personales
  (Decreto 1377 de 2013, art. 8) y guarda la fecha y la versión aceptadas.
- La mesa es una grilla de celdas (fila, columna), no un plano medido: los
  arreglos de IQ son diagramas a mano.
- No hay fotos ni imágenes del instrumental (fuera del alcance de DataIQ). Los
  modelos 3D son de SIMIQ3D.
- Los datos nunca se inventan. Lo que la fuente no trae completo queda fuera y
  se dice.
- Interfaz en español.
- Código abierto (MIT): otras instituciones pueden montar su propia instancia.
- Alcance de los mockups actuales: el shell y DataIQ. SIVRI y SIMIQ3D aparecen
  solo como módulos del ecosistema, sin pantallas propias.
- Decisiones abiertas: el nombre del ecosistema (los mockups usan un nombre de
  trabajo, marcado como provisional) y la tecnología del frontend.

## Brand Commitments

- Identidad propia de ecosistema de productos. Sin créditos ni nombre de
  institución en la web; el origen (nació en la Corporación Universitaria
  Rafael Núñez, con sus programas de Instrumentación Quirúrgica e Ingeniería
  de Sistemas) va solo en «Quiénes somos».
- Abstracción para quien usa, no para quien desarrolla: la web habla de los
  productos y de lo que resuelve cada uno. No explica el funcionamiento
  interno (versiones, revisión, roles, licencia, base de datos).
- Nada depende de una instancia: cada institución que adopte el software
  tiene sus propias técnicas y puede nombrarlas distinto. La web pública no
  muestra cifras del catálogo ni datos que cambien entre instancias.
- Navegación abstracta: la barra superior muestra categorías (Productos,
  Para instituciones, Quiénes somos), y los módulos aparecen dentro del
  desplegable de Productos (referencia: la barra de Riot Games).
- Pantalla completa: el diseño ocupa todo el ancho de la ventana, sin una
  columna centrada con espacios vacíos a los lados.
- Registro visual: profesional, moderno, tecnológico y clínico. Limpio y
  preciso, como un producto de tecnología médica; nada artesanal ni rústico.
- Contenido con cuerpo: la abstracción quita lo técnico, no el contenido. El
  inicio tiene recorrido con scroll, en composiciones anchas y horizontales,
  no una sola columna hacia abajo.
- Voz impersonal: "Ver técnica", "Iniciar sesión para ver la mesa". Sin tú ni
  usted.
- Sin nombre definitivo todavía.

## Evidence on Hand

- Dataset real de la instancia de la CURN (sirve para los mockups; sus
  cifras no se muestran en la web pública): 18 técnicas en 5 especialidades;
  21 mesas de 15 técnicas, con 200 objetos ubicados en 201 celdas; catálogo de
  143 instrumentos (94 normalizados y 49 por clasificar) con 149 variantes de
  nombre. Ejemplo de referencia: la mesa de Mayo de Tiroidectomía.
- Los datos clínicos de cada técnica (anestesia, posición del paciente,
  indicaciones, complicaciones, técnica quirúrgica) están en el documento de
  IQ del Drive, pero todavía no en la base. Los mockups los toman de ese
  documento.
- Diagramas de roles y flujos: `docs/flujos.md` y su versión visual
  <https://claude.ai/artifact/779R1z8d3pd6srkbtiohpk>.
- No existen todavía: usuarios, testimonios, métricas de uso, instituciones
  aliadas ni logo. No se inventan.

## Product Principles

1. **La fuente manda.** Lo que se muestra viene de los documentos de IQ y se
   puede rastrear; lo que falta se dice, no se rellena.
2. **La mesa es el centro.** Todo camino lleva a ver dónde va cada objeto y
   qué es.
3. **Leer es fácil, publicar es cuidadoso.** El catálogo está a un clic; la
   publicación siempre pasa por un revisor.
4. **Para cualquier estudiante e institución.** No depende de pertenecer a
   la CURN; cada institución puede tener su propia instancia.
5. **Liviano.** Funciona bien en celular y en equipos modestos.
