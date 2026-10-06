# Flujos del ecosistema

Diagramas de cómo se usa el ecosistema: quién puede hacer qué, por dónde navega
cada persona y cómo una técnica pasa de borrador a publicada. Los diagramas
están en [Mermaid](https://mermaid.js.org/): GitHub los dibuja al abrir este
archivo.

El detalle de cada rol está en el "Modelo de roles" de
[`CLAUDE.md`](../CLAUDE.md).

Hay una versión visual de estos diagramas, para presentar:
<https://claude.ai/artifact/779R1z8d3pd6srkbtiohpk> (privada; se comparte desde
su menú). Este archivo es la fuente: si cambia una decisión, se cambia primero
aquí y después la versión visual.

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
| Entrar al shell y ver el catálogo de técnicas | ✔ | ✔ | ✔ | ✔ | ✔ |
| Ver los datos clínicos de una técnica | ✔ | ✔ | ✔ | ✔ | ✔ |
| Ver el instrumental y las mesas de una técnica | vista previa | ✔ | ✔ | ✔ | ✔ |
| Usar SIVRI y SIMIQ3D | | ✔ | ✔ | ✔ | ✔ |
| Funciones personales (p. ej. progreso en SIVRI) | | ✔ | ✔ | ✔ | ✔ |
| Crear técnicas y editar borradores | | | ✔ | ✔ | ✔ |
| Enviar un borrador a revisión | | | ✔ | ✔ | ✔ |
| Aprobar o rechazar versiones (nunca las propias) | | | | ✔ | ✔ |
| Archivar una técnica publicada | | | | ✔ | ✔ |
| Crear y editar instrumental | | | | ✔ | ✔ |
| Gestionar roles | | | | | ✔ |

## 2. Navegación

Sin cuenta se entra al shell, se ve qué técnicas hay y se abre cualquiera con
sus datos clínicos. Su instrumental y sus mesas se ven como vista previa (la
mesa en gris, sin números) y piden iniciar sesión o registrarse (gratis) ahí
mismo; usar SIVRI y SIMIQ3D también lo pide. Después del ingreso, la persona vuelve a donde
iba. La gestión aparece según el rol.

```mermaid
flowchart LR
    subgraph Publico["Sin cuenta"]
        direction TB
        Inicio["Inicio (shell)"] --> Catalogo["Catálogo de técnicas"]
        Catalogo --> Clinicos["Técnica: datos clínicos<br/>instrumental y mesas en vista previa"]
    end

    Puerta{{"Ingresar o<br/>registrarse"}}

    subgraph Cuenta["Con cuenta"]
        direction TB
        Detalle["Técnica completa<br/>instrumental y mesas"]
        SIMIQ3D["SIMIQ3D<br/>chat y escena 3D"]
        SIVRI["SIVRI<br/>validar la mesa con cámara"]
    end

    subgraph Gestion["Gestión según el rol"]
        direction TB
        Borradores["Mis borradores<br/>colaborador o más"]
        Revision["Versiones por revisar<br/>revisor o más"]
        Instrumental["Catálogo de instrumental<br/>revisor o más"]
        Usuarios["Usuarios y roles<br/>admin"]
    end

    Publico -->|ver el instrumental, una mesa<br/>o abrir un módulo| Puerta
    Puerta -->|vuelve a donde iba| Cuenta
    Puerta -->|según el rol| Gestion
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
