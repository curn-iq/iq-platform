# Flujos del ecosistema

Diagramas de cómo se usa el ecosistema: quién puede hacer qué, por dónde navega
cada persona y cómo una técnica pasa de borrador a publicada. Los diagramas
están en [Mermaid](https://mermaid.js.org/): GitHub los dibuja al abrir este
archivo.

El detalle de cada rol está en el "Modelo de roles" de
[`CLAUDE.md`](../CLAUDE.md).

## 1. Roles

Los roles son acumulativos: cada uno puede todo lo del anterior. Cada cuenta
tiene un solo rol.

```mermaid
flowchart LR
    V["Visitante<br/>(sin cuenta)"] -->|se registra| U[usuario]
    U -->|lo asigna un admin| C[colaborador]
    C -->|lo asigna un admin| R[revisor]
    R -->|solo Mauricio| A[admin]
```

| Acción | Visitante | usuario | colaborador | revisor | admin |
|---|:-:|:-:|:-:|:-:|:-:|
| Entrar al shell y ver el catálogo de técnicas (nombre y especialidad) | ✔ | ✔ | ✔ | ✔ | ✔ |
| Ver el detalle de una técnica (datos clínicos y mesa) | | ✔ | ✔ | ✔ | ✔ |
| Usar SIVRI y SIMIQ3D | | ✔ | ✔ | ✔ | ✔ |
| Funciones personales (p. ej. progreso en SIVRI) | | ✔ | ✔ | ✔ | ✔ |
| Crear técnicas y editar borradores | | | ✔ | ✔ | ✔ |
| Enviar un borrador a revisión | | | ✔ | ✔ | ✔ |
| Aprobar o rechazar versiones (nunca las propias) | | | | ✔ | ✔ |
| Archivar una técnica publicada | | | | ✔ | ✔ |
| Crear y editar instrumental | | | | ✔ | ✔ |
| Gestionar roles | | | | | ✔ |

## 2. Navegación

Funciona como un catálogo de cursos: sin cuenta se entra al shell y se ve qué
técnicas hay, pero abrir una técnica o usar SIVRI y SIMIQ3D pide iniciar
sesión o registrarse (gratis). Después del ingreso, la persona vuelve a donde
iba. La gestión aparece según el rol.

```mermaid
flowchart TD
    Inicio["Inicio (shell)"]
    Inicio --> Catalogo["DataIQ: catálogo de técnicas<br/>(nombre y especialidad)"]
    Catalogo -->|abre una técnica| P1{"¿Inició sesión?"}
    Inicio -->|entra a SIMIQ3D o SIVRI| P2{"¿Inició sesión?"}

    P1 -->|sí| Detalle["DataIQ: detalle de técnica<br/>(datos clínicos y mesa)"]
    P2 -->|sí| Modulos["SIMIQ3D: chat y escena 3D<br/>SIVRI: validar la mesa con cámara"]
    P1 -->|no| Ingreso["Ingresar o registrarse"]
    P2 -->|no| Ingreso
    Inicio --> Ingreso
    Ingreso -->|vuelve a donde iba| Rol{"Rol de la cuenta"}

    Rol -->|usuario| Personal["Funciones personales"]
    Rol -->|"colaborador o más"| Borradores["DataIQ: mis borradores"]
    Rol -->|"revisor o más"| Revision["DataIQ: versiones por revisar"]
    Rol -->|"revisor o más"| Instrumental["DataIQ: catálogo de instrumental"]
    Rol -->|admin| Usuarios["DataIQ: usuarios y roles"]
```

## 3. Ciclo de vida de una versión

Cada técnica tiene como máximo una versión publicada y una en curso
(`borrador` o `en_revision`). Las transiciones se validan en el dominio
(`app/dominio/tecnicas.py`).

```mermaid
stateDiagram-v2
    [*] --> borrador: crear técnica o editar una publicada
    borrador --> en_revision: el autor la envía
    en_revision --> borrador: un revisor la rechaza
    en_revision --> publicada: un revisor distinto al autor la aprueba
    publicada --> reemplazada: se aprueba una versión nueva
    publicada --> archivada: un revisor la retira
    reemplazada --> [*]
    archivada --> [*]
```

## 4. Editar y aprobar una técnica

Editar una técnica publicada nunca la cambia: se trabaja sobre una copia en
borrador. Los estudiantes siguen viendo la versión publicada hasta que un
revisor aprueba la nueva.

```mermaid
sequenceDiagram
    actor Colab as Colaborador
    participant D as DataIQ
    actor Rev as Revisor

    Colab->>D: Editar la técnica
    D-->>Colab: Copia de la versión publicada, en borrador
    Colab->>D: Cambia datos, objetos y posiciones
    Colab->>D: Envía a revisión
    D-->>Rev: Aparece en "versiones por revisar"

    alt Aprueba (el revisor no es el autor)
        Rev->>D: Aprobar
        Note over D: En una misma transacción:<br/>la anterior pasa a reemplazada<br/>y la nueva a publicada
        D-->>Colab: Publicada
    else Rechaza
        Rev->>D: Rechazar, con motivo
        D-->>Colab: Vuelve a borrador para corregir
    end
```

## 5. Registro, ingreso y uso entre módulos

DataIQ es el único que emite tokens. SIVRI y SIMIQ3D no tienen tabla de
usuarios: solo validan la firma con la clave pública de DataIQ.

```mermaid
sequenceDiagram
    actor P as Persona
    participant D as DataIQ
    participant M as SIVRI o SIMIQ3D

    P->>D: Registro: datos + acepta la política de datos
    Note over D: Guarda la fecha y la versión de la política<br/>(Decreto 1377, art. 8). Rol: usuario
    P->>D: Ingreso: correo y contraseña
    D-->>P: Token firmado con la clave privada de DataIQ
    P->>M: Usa el módulo con su token
    M->>D: Pide la clave pública (JWKS), una vez
    Note over M: Valida la firma del token<br/>sin consultar a DataIQ en cada petición
    M->>D: Pide el catálogo completo, una vez por sesión
    D-->>M: Técnicas publicadas e instrumental
```

## Decisiones abiertas

- Cómo se autentican los backends de SIVRI y SIMIQ3D ante DataIQ para pedir el
  catálogo completo: con el token del usuario o con una clave propia del
  módulo.
