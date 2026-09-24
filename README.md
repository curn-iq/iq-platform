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

## Módulos

Cada módulo es independiente: tiene su propio backend y su propia base de datos.

### M1 — SIVRI
Sistema Inteligente de Visión y Retroalimentación para Instrumentación Quirúrgica.
Reconoce el instrumental quirúrgico en tiempo real mediante YOLO26, valida si la
disposición en mesa es correcta según la técnica evaluada y da retroalimentación
inmediata al estudiante.
**Estado**: por iniciar.

### M2 — DataIQ
Plataforma web y dataset estructurado de técnicas quirúrgicas: instrumental,
suturas, equipos biomédicos, dispositivos y arreglos de mesa. Es la fuente única
de verdad del ecosistema y la API que consumen SIVRI y SIMIQ3D.
**Estado**: en desarrollo.

### M3 — SIMIQ3D
Sistema Interactivo de Modelado e Instrumentación Quirúrgica 3D.
Herramienta conversacional (chat + visor 3D): el estudiante consulta técnicas en
lenguaje natural y explora una escena 3D con el instrumental dispuesto en mesa.
Es una herramienta de exploración, no de evaluación.
**Estado**: por iniciar.

## Comunicación entre módulos

- Las bases de datos de los módulos nunca se comunican entre sí.
- SIVRI y SIMIQ3D obtienen los datos de DataIQ únicamente por HTTPS a su API.
- DataIQ emite los tokens de autenticación; los demás módulos solo validan su firma.

## Estructura

```
iq-platform/
├── sivri/
│   ├── backend/
│   └── frontend/
├── dataiq/
│   ├── backend/
│   ├── frontend/
│   └── docs/
└── simiq3d/
    ├── backend/
    └── frontend/
```

## Stack

- Backend: Python (DataIQ con FastAPI; detalles de SIVRI y SIMIQ3D por definir)
- Base de datos: PostgreSQL, una por módulo
- Autenticación: JWT emitido por DataIQ, contraseñas con Argon2id
- Frontend: por definir (se decide con los mockups)

## Licencia

[MIT](LICENSE)
