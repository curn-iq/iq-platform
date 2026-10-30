# IQ Platform — Ecosistema Educativo para Instrumentación Quirúrgica

Plataforma tecnológica desarrollada en colaboración entre estudiantes de
Ingeniería de Sistemas e Instrumentación Quirúrgica de la Corporación
Universitaria Rafael Núñez (CURN), Cartagena, Colombia.

## Descripción

Los estudiantes de Instrumentación Quirúrgica no cuentan con herramientas
tecnológicas para practicar y verificar la distribución del instrumental
quirúrgico en mesa fuera del laboratorio. IQ Platform es un ecosistema modular
que responde a esa brecha integrando visión artificial, un dataset estructurado
de técnicas quirúrgicas y exploración 3D conversacional.

Los tres módulos avanzan en paralelo durante 2026.

El MVP es una **fase preliminar** (decidido por Mauricio el 2026-10-30): se
evalúa con el programa de Instrumentación Quirúrgica, como lo prevén los
objetivos 5 y 6 del trabajo de grado (Formato 115): la usabilidad, con la
Escala de Usabilidad del Sistema (SUS), y la pertinencia pedagógica, con una
prueba piloto y un cuestionario tipo Likert. Además, el registro anónimo de
conversaciones de SIMIQ3D muestra cómo responde el chat a las preguntas de
quienes lo usan. Con esos resultados se decide qué corregir. Quiénes
participan, qué cuestionarios responden, si la sesión es guiada o de uso libre
y qué módulos se prueban se definen antes de la evaluación.

El semestre siguiente, SIVRI y SIMIQ3D se rehacen con fuentes propias
([`docs/despues-del-mvp.md`](docs/despues-del-mvp.md)) y la plataforma pasa a
producción para los estudiantes.

## Equipo

Proyecto de grado del programa de Ingeniería de Sistemas: los tres módulos son
el trabajo de grado de Mauricio Lugo Granados, Guebriel Garces y Juan
Caraballo, con la dirección de Yair Fernando Cardona Acuña. Tres estudiantes
del programa de Instrumentación Quirúrgica aportan los documentos de las
técnicas.

## Módulos

Cada módulo es independiente: tiene su propio backend y su propia base de datos.

### M1 — SIVRI
Sistema Inteligente de Visión y Retroalimentación para Instrumentación Quirúrgica.
Reconoce el instrumental quirúrgico en tiempo real mediante YOLO26, valida si la
disposición en mesa es correcta según la técnica evaluada y da retroalimentación
inmediata al estudiante.

### M2 — DataIQ
Plataforma web y dataset estructurado de técnicas quirúrgicas: instrumental,
suturas, equipos biomédicos, dispositivos y arreglos de mesa. Es la fuente única
de verdad del ecosistema y la API que consumen SIVRI y SIMIQ3D.

### M3 — SIMIQ3D
Sistema Interactivo de Modelado e Instrumentación Quirúrgica 3D.
Herramienta conversacional (chat + visor 3D): el estudiante consulta técnicas en
lenguaje natural y explora una escena 3D con el instrumental dispuesto en mesa.
Es una herramienta de exploración, no de evaluación.

## Comunicación entre módulos

- Las bases de datos de los módulos nunca se comunican entre sí.
- SIVRI y SIMIQ3D obtienen los datos de DataIQ únicamente por HTTPS a su API.
- DataIQ emite los tokens de autenticación; los demás módulos solo validan su firma.

## Estructura

```
iq-platform/
├── dataiq/
│   ├── backend/
│   ├── frontend/        Angular: el shell de navegación y DataIQ
│   └── docs/            esquema de la base y checklists
├── simiq3d/
│   ├── backend/
│   ├── frontend/        Angular y Three.js
│   ├── models/          modelos 3D (.blend, GLB y medidas)
│   ├── servidor-pc2/    el filtro del modelo de lenguaje
│   └── docs/
├── sivri/
│   ├── backend/
│   ├── frontend/
│   └── docs/            dataset y checklist
├── shared/design/       tokens visuales comunes a los frontends
├── diseno/mockups/      mockups de las pantallas
└── docs/                arquitectura, flujos, privacidad y lo de después del MVP
```

## Documentación

- Qué cambió: [Releases](https://github.com/curn-iq/iq-platform/releases).
- Cómo funciona y cómo se corre cada módulo: su README (p. ej.
  [`dataiq/README.md`](dataiq/README.md)).
- Arquitectura e infraestructura, con su porqué:
  [`docs/arquitectura.md`](docs/arquitectura.md).
- Roles y flujos: [`docs/flujos.md`](docs/flujos.md). Aviso de privacidad:
  [`docs/privacidad.md`](docs/privacidad.md). Lo que queda para después del
  MVP: [`docs/despues-del-mvp.md`](docs/despues-del-mvp.md).
- Producto y diseño visual: [`PRODUCT.md`](PRODUCT.md) y
  [`DESIGN.md`](DESIGN.md).
- Instrucciones del proyecto para Claude Code: [`CLAUDE.md`](CLAUDE.md) y,
  por módulo, [`.claude/rules/`](.claude/rules/).

### Cómo se registran los cambios

1. Cada cambio entra por un PR a `main`, como siempre. El **título del PR** es
   lo que aparece en el release: que diga qué cambia, en español (p. ej.
   «feat(dataiq): editor de mesas con arrastrar y soltar», no «cambios»).
   La descripción del PR lleva el detalle.
2. **Una vez por semana** se publica un release con lo que entró desde el
   anterior (si no entró nada, no se publica), y otro al cerrar cada corte.
   Lo publica una sola persona:
   Releases → *Draft a new release* → *Choose a tag*: el siguiente nombre
   (`corte-3.2`, `corte-3.3`…; al cerrar el corte, `corte-3`) sobre `main` →
   *Generate release notes* → una línea de resumen arriba → *Publish release*.
3. Para enterarse sin que nadie avise: en el repo, *Watch* → *Custom* →
   *Releases* → *Apply*. Cada release llega por correo.

## Stack

- Backend: Python (DataIQ y SIMIQ3D con FastAPI; el framework de SIVRI, por
  definir)
- Base de datos: PostgreSQL, una por módulo
- Autenticación: JWT firmado por DataIQ con EdDSA (los demás módulos lo validan
  con la clave pública que DataIQ publica), contraseñas con Argon2id
- Frontend: Angular (el shell de navegación y DataIQ, en `dataiq/frontend`;
  SIMIQ3D, con Three.js para el visor 3D, en `simiq3d/frontend`)

## Licencia

[MIT](LICENSE)
