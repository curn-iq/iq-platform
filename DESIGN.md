---
name: IQ Platform
description: Campo estéril. La misma mesa de Mayo real, vista como referencia, en 3D y por la cámara.
colors:
  fondo: "#f3f6f6"
  superficie: "#ffffff"
  filete: "#dbe4e6"
  filete-2: "#c4d1d4"
  tinta: "#0a1b22"
  tinta-2: "#364b53"
  tinta-3: "#566a72"
  marca: "#0d6a5e"
  marca-hondo: "#08463e"
  marca-claro: "#ddefeb"
  pano: "#1d7564"
  menta: "#38e2b3"
  alerta-noche: "#ff6b6b"
  noche: "#061217"
  noche-2: "#0c1e24"
  filete-noche: "#1d353d"
  niebla-noche: "#a9bec5"
  acero-brillo: "#fbfdfd"
  acero: "#b3bec4"
  acero-sombra: "#8b979d"
  acero-filo: "#3f4b52"
typography:
  display:
    fontFamily: "Host Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(60px, 13.6vw, 236px)"
    fontWeight: 650
    lineHeight: 0.98
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Host Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(46px, 5.6vw, 100px)"
    fontWeight: 650
    lineHeight: 0.96
    letterSpacing: "-0.04em"
  headline-section:
    fontFamily: "Host Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(38px, 4.2vw, 68px)"
    fontWeight: 650
    lineHeight: 1
    letterSpacing: "-0.04em"
  headline-product:
    fontFamily: "Host Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(40px, 3.6vw, 60px)"
    fontWeight: 650
    lineHeight: 1
    letterSpacing: "-0.04em"
  title:
    fontFamily: "Host Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "26px"
    fontWeight: 650
    letterSpacing: "-0.03em"
  lema:
    fontFamily: "Host Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(19px, 1.5vw, 23px)"
    fontWeight: 550
    lineHeight: 1.35
    letterSpacing: "-0.015em"
  body-large:
    fontFamily: "Host Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.6
  body:
    fontFamily: "Host Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Host Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "15.5px"
    fontWeight: 650
    lineHeight: 1.4
  data:
    fontFamily: "Martian Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.4
  data-detection:
    fontFamily: "Martian Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "14px"
    fontWeight: 600
rounded:
  xs: "6px"
  sm: "8px"
  md: "10px"
  lg: "12px"
  xl: "14px"
  ventana: "16px"
  panel: "20px"
  escenario: "24px"
  pill: "99px"
spacing:
  lado: "clamp(20px, 4.4vw, 64px)"
  medianil: "24px"
  barra: "72px"
  barra-movil: "64px"
  seccion: "clamp(96px, 14vh, 160px)"
  carril: "48px"
components:
  button-primary:
    backgroundColor: "{colors.marca}"
    textColor: "{colors.superficie}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 18px"
    height: "42px"
  button-primary-hover:
    backgroundColor: "{colors.marca-hondo}"
    textColor: "{colors.superficie}"
  button-primary-large:
    backgroundColor: "{colors.marca}"
    textColor: "{colors.superficie}"
    rounded: "{rounded.lg}"
    padding: "0 26px"
    height: "56px"
  button-light:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.marca-hondo}"
    rounded: "{rounded.lg}"
    padding: "0 26px"
    height: "56px"
  button-light-hover:
    backgroundColor: "{colors.marca-claro}"
    textColor: "{colors.marca-hondo}"
  button-soft:
    backgroundColor: "{colors.marca-claro}"
    textColor: "{colors.marca-hondo}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "38px"
  link-arrow:
    textColor: "{colors.marca}"
    typography: "{typography.label}"
  nav-item:
    textColor: "{colors.tinta-2}"
    rounded: "{rounded.sm}"
    padding: "0 14px"
    height: "40px"
  view-selector-tab:
    textColor: "{colors.tinta-3}"
    rounded: "{rounded.md}"
    padding: "12px 18px 0"
    height: "46px"
  view-selector-tab-selected:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
  demo-tag:
    textColor: "{colors.tinta-3}"
    typography: "{typography.data}"
  detection-label:
    backgroundColor: "{colors.menta}"
    textColor: "{colors.noche}"
    typography: "{typography.data-detection}"
  detection-label-error:
    backgroundColor: "{colors.alerta-noche}"
    textColor: "{colors.noche}"
    typography: "{typography.data-detection}"
---

# Design System: IQ Platform

## Overview

**Creative North Star: "Campo estéril"**

El sistema es el campo quirúrgico visto con ojos de producto de tecnología médica: blanco clínico frío como fondo, tinta azul petróleo casi negra, el verde quirúrgico del paño como único color de marca y el acero del instrumental como material. Todo es limpio, preciso y plano; la profundidad la ponen los objetos (la funda, las piezas de acero), no la interfaz. El registro es profesional, moderno, tecnológico y clínico. Una versión anterior de tela y oficio artesanal fue rechazada por el usuario; nada rústico vuelve.

La composición es ancha y horizontal, a pantalla completa: rejilla de 12 columnas con medianil de 24 px y márgenes laterales fluidos, nunca una columna centrada con vacíos a los lados. El recorrido alterna capítulos claros y oscuros (cámara, instituciones, pie) y termina en una banda verde plana. La tipografía es una sola familia, Host Grotesk, grande y apretada en titulares; Martian Mono aparece solo cuando el dato es técnico.

El objeto firma es la mesa de Mayo real (Tiroidectomía), dibujada por código: la funda verde con el instrumental de acero en sus posiciones reales. La misma mesa se muestra como referencia, inclinada en 3D y escaneada por la cámara. Los datos reales se muestran como tales; lo que es ilustrativo se marca «demostración».

**Key Characteristics:**
- Blanco clínico frío, tinta petróleo y verde de paño como única marca.
- Acero satinado dibujado en SVG para el instrumental; ningún raster.
- Menta exclusiva de las detecciones de cámara; rojo exclusivo de «fuera de lugar».
- Capítulos oscuros para cámara, instituciones y pie; banda verde plana de cierre.
- Host Grotesk en todo; Martian Mono solo para datos técnicos.
- Composiciones anchas y horizontales a pantalla completa.
- Sombras neutras, sin brillos; filetes finos de 1 px como estructura.

## Colors

Paleta fría y contenida: neutros clínicos con matiz petróleo, un verde de paño como marca y dos acentos funcionales que solo existen dentro de la cámara.

### Primary
- **Verde quirúrgico** (`marca`): botones primarios, enlaces con flecha, números de leyenda, barras de progreso, foco (`outline` de 2.5 px) y selección de texto.
- **Verde quirúrgico hondo** (`marca-hondo`): hover del botón primario, texto sobre fondos verdes claros, tarjeta oscura de la vista de clase de Docentes.
- **Verde de agua clara** (`marca-claro`): fondo de acciones suaves («Ver las 10 piezas»), fila seleccionada en las maquetas, hover del botón claro.
- **Verde paño** (`pano`): el color de la funda de Mayo y de la banda de cierre. Es el paño quirúrgico; es objeto y es capítulo final.

### Secondary
- **Menta de detección** (`menta`): solo para la cámara: cajas de detección, sus etiquetas, el barrido de escaneo, el punto «En vivo», los conteos «en su lugar» y los enlaces dentro de capítulos oscuros.
- **Rojo de alerta** (`alerta-noche`): solo para «fuera de lugar»: la caja de la pieza mal ubicada, el destino punteado «Va aquí», el número del riel en vista de cámara y el conteo «por mover».

### Tertiary
- **Acero satinado** (`acero-brillo`, `acero`, `acero-sombra`, `acero-filo`): el instrumental. Se aplica como degradado lateral (gradiente `#acero` de cinco paradas, de `#e4eaed` a `acero-brillo`, `acero`, `acero-sombra` y `#d3dbdf`) con contorno `acero-filo` de 0.6 px. Las hojas usan el degradado `#hoja` (blanco a `#aab5bb`).

### Neutral
- **Blanco clínico** (`fondo`): fondo de página, barra superior y fondos de ventanas de maqueta.
- **Superficie** (`superficie`): paneles, desplegable, leyenda, burbujas y ventanas.
- **Filete** (`filete`) y **filete fuerte** (`filete-2`): líneas de 1 px que separan, ordenan listas y bordean ventanas; `filete-2` para puntos de ventana y la barra de desplazamiento.
- **Tinta petróleo** (`tinta`), **tinta media** (`tinta-2`), **tinta suave** (`tinta-3`): titulares, texto de cuerpo y texto secundario, en ese orden.
- **Noche** (`noche`), **noche 2** (`noche-2`), **filete noche** (`filete-noche`), **niebla** (`niebla-noche`): capítulos oscuros, sus paneles, sus líneas y su texto secundario.

### Named Rules
**The Dos Acentos Cautivos Rule.** La menta y el rojo viven solo dentro de la cámara (vista Cámara, ventana de SIVRI) y en enlaces sobre capítulos oscuros, en el caso de la menta. Fuera de ahí no existen: ni estados genéricos de éxito o error, ni decoración.

**The Paño Es Objeto Rule.** La textura no tejida `--tela` se aplica solo a la funda de Mayo y sus miniaturas. Ninguna superficie de página, tarjeta o banda lleva textura; la banda de cierre usa `pano` plano.

**The Una Sola Marca Rule.** El verde es el único color de marca. No se agregan segundos acentos decorativos; los tonos claros intermedios (hover `#e6eded`, `#cfe7e1`) son pasos de estado, no colores nuevos.

## Typography

**Display Font:** Host Grotesk (con Helvetica Neue, Arial)
**Body Font:** Host Grotesk (con Helvetica Neue, Arial)
**Label/Mono Font:** Martian Mono (con ui-monospace, SFMono-Regular, Menlo)

**Character:** Una grotesca contemporánea y técnica, grande y apretada en titulares y serena en el cuerpo; la mono aparece como la voz de la máquina, solo donde hay datos.

### Hierarchy
- **Display** (650, `clamp(60px, 13.6vw, 236px)`, 0.98): el titular de la banda de cierre. Es el único momento tipográfico desmesurado de la página.
- **Headline** (650, `clamp(46px, 5.6vw, 100px)`, 0.96): el titular de portada, en tres líneas que suben al cargar.
- **Headline de sección** (650, `clamp(38px, 4.2vw, 68px)`, 1): títulos de sección.
- **Headline de producto** (650, `clamp(40px, 3.6vw, 60px)`, 1): nombres de producto en el carril.
- **Title** (650, 26px, -0.03em): perfiles (Estudiantes, Docentes); 18-20px para títulos de paneles y menú.
- **Lema** (550, `clamp(19px, 1.5vw, 23px)`, 1.35, máx. 26ch): la frase que dice qué resuelve cada producto.
- **Body large** (400, 18px, 1.55-1.6): entradilla de portada (máx. 34ch) y texto de sección (máx. 46ch).
- **Body** (400, 17px, 1.6): texto base; listas de capacidades a 16px.
- **Label** (550-650, 14-15.5px): navegación, botones, selector.
- **Data** (Martian Mono 400, 12.5px): etiquetas «demostración» y texto de documento fuente; 600 a 14px en etiquetas de detección y «Va aquí» (26px en celular, dentro del SVG escalado).

### Named Rules
**The -0.04em Rule.** Los titulares de 38px o más van a 650 con -0.04em; nunca más apretado. Los de 26px van a -0.03em, los menores a -0.01/-0.02em.

**The Voz De La Máquina Rule.** Martian Mono solo para datos técnicos: etiquetas de detección, confianzas, posiciones, texto literal de documentos y la marca «demostración». Nunca en titulares, botones ni cuerpo.

**The Un Solo Gigante Rule.** El titular de cierre (hasta 236px) es el único momento tipográfico extremo. Ningún otro texto compite con él.

## Layout

Pantalla completa. El margen lateral es `lado` (`clamp(20px, 4.4vw, 64px)`) y el contenido usa una rejilla de 12 columnas con medianil de 24 px. La portada ocupa el alto de la ventana menos la barra: titular en columnas 1-5, escenario en 6-12 cruzando hacia el centro. Las secciones respiran con `seccion` (`clamp(96px, 14vh, 160px)`) de padding vertical.

Las composiciones son anchas y asimétricas: cabecera de productos en 6/3/3 columnas (título, texto, recorrido); perfiles en 4/5/3 (encabezado, Estudiantes con más peso, Docentes más angosto); instituciones en 5 + 6 columnas (texto y panel del documento). Los productos se recorren de lado a lado: en escritorio la sección queda fija bajo la barra y el carril se traslada horizontalmente con el scroll, con tres trazos de progreso de 3 px; en celular el carril es un desplazamiento horizontal con `scroll-snap` y tarjetas de 82vw.

Puntos de corte: **1100 px** (tableta: todo a columna completa, escenario cuadrado, producto en una columna de hasta 760px) y **760 px** (celular: barra de 64px con menú, selector a tres botones iguales, riel bajo la mesa, leyenda a una columna, carril con `scroll-snap`).

**The Sin Columna Central Rule.** Nada se centra en una columna angosta con vacíos a los lados. El ancho de la ventana es el lienzo.

## Elevation & Depth

Sistema plano con objetos que sí tienen cuerpo. La interfaz se ordena con filetes de 1 px y capas tonales (`fondo`, `superficie`, `noche`, `noche-2`); las sombras son neutras (tinta petróleo `rgba(10, 27, 34, …)` o casi negra) y difusas, con offset negativo de spread para que se queden pegadas al objeto. La profundidad real la dan la funda (con su canto a -16px en Z y la inclinación 3D `rotateX(44deg) rotateZ(-28deg)`) y las piezas de acero con doble `drop-shadow`.

### Shadow Vocabulary
- **Botón en reposo** (`box-shadow: inset 0 1px 0 rgba(255,255,255,.14), 0 1px 2px rgba(10,27,34,.25)`): botón primario.
- **Botón al pasar** (`box-shadow: inset 0 1px 0 rgba(255,255,255,.14), 0 8px 16px -10px rgba(10,27,34,.5)`): con `translateY(-1px)`.
- **Escenario** (`box-shadow: 0 1px 2px rgba(10,27,34,.05), 0 16px 32px -24px rgba(10,27,34,.3)`): el contenedor del héroe.
- **Desplegable** (`box-shadow: 0 18px 28px -22px rgba(10,27,34,.4)`): el menú de productos.
- **Funda** (`box-shadow: 0 1px 2px rgba(0,0,0,.25), 0 28px 50px -22px rgba(10,27,34,.55)`): el objeto paño.
- **Pieza de acero** (`filter: drop-shadow(0 2px 1.4px rgba(3,20,28,.6)) drop-shadow(0 6px 8px rgba(3,20,28,.22))`): cada instrumento; al marcarla sube a `drop-shadow(0 12px 8px rgba(3,20,28,.4))` con `translate(-2px, -6px)`.
- **Panel flotante** (`box-shadow: 0 12px 30px -16px rgba(10,27,34,.45)`): la leyenda «Ver las 10 piezas».

### Named Rules
**The Sombra Neutra Rule.** Toda sombra es tinta neutra difusa. Sin sombras de color, sin brillos (`glow`), sin sombras duras desplazadas. El barrido de la cámara es un instrumento de escaneo, no un brillo decorativo.

**The El Objeto Pesa Rule.** La elevación fuerte es de los objetos dibujados (funda, piezas, riel). Las tarjetas de interfaz se bordean con filete (`inset 0 0 0 1px`), no se levantan.

## Shapes

Esquinas suaves y técnicas, escaladas por tamaño del contenedor: 8px en elementos de navegación, 10px en botones y pestañas, 12px en botón grande y funda, 14px en el selector y opciones del menú, 16px en ventanas de producto y paneles, 20px en el panel de instituciones, 24px en el escenario; píldora (99px) solo en sugerencias del chat. Las líneas son filetes de 1 px; las listas se ordenan con filete arriba de cada fila y uno al cierre. Los visores de cámara son esquinas en L de 30px con trazo de 2px. Las burbujas de chat recortan a 4px la esquina del lado que habla.

## Components

### Buttons
Firmes y clínicos: verde lleno, sin adornos, con una flecha que avanza al pasar.
- **Shape:** esquinas suaves (10px; 12px en el grande).
- **Primary:** `marca` con texto blanco, 650, 42px de alto y 18px de padding; el grande mide 56px, 26px de padding y 17px.
- **Hover / Focus:** pasa a `marca-hondo`, sube 1px y la flecha se desplaza 3px (`.35s` en `expo`). Foco: contorno `marca` de 2.5px a 3px de distancia.
- **Claro:** blanco con texto `marca-hondo`, sin sombra, solo sobre la banda verde; hover `marca-claro`.
- **Suave:** `marca-claro` con texto `marca-hondo`, 38px («Ver las 10 piezas»).
- **Enlace con flecha:** texto `marca` 650 con flecha SVG de 16px; en capítulos oscuros, `menta`.

### Chips
- **Etiqueta «demostración»:** Martian Mono 12.5px en `tinta-3` (`niebla-noche` sobre oscuro), sin fondo ni borde. Marca todo dato ilustrativo.
- **Sugerencias del chat:** píldora `fondo`, 13px, solo dentro de la maqueta de SIMIQ3D.

### Cards / Containers
- **Corner Style:** 16px (ventanas y paneles), 20px (panel oscuro), 24px (escenario).
- **Background:** `superficie` sobre `fondo`; `noche-2` sobre `noche`; `marca-hondo` para la vista de clase.
- **Shadow Strategy:** filete interior de 1px; ver Elevation & Depth.
- **Border:** `filete` / `filete-noche`.
- **Internal Padding:** 18-26px.
- **Ventana de producto:** barra de 44px blanca con tres puntos `filete-2`, nombre en 650 y «demostración» a la derecha; dentro, la maqueta de la interfaz del producto. La de SIVRI es oscura (`noche-2`) con pie de conteos.
- **Listas de capacidades:** filas reguladas por filetes de 1px, 16px, sin íconos ni viñetas.

### Navigation
- **Barra:** fija arriba, 72px (64px en celular), fondo `fondo` con filete inferior. Marca «IQ Platform» 700; Productos ▾, Para instituciones, Quiénes somos a la izquierda; Ingresar y Crear cuenta a la derecha.
- **Ítems:** 15.5px 550 en `tinta-2`, 40px de alto, 8px de radio; hover y abierto con fondo `#e6eded` y `tinta`. La flecha de Productos gira 180°.
- **Desplegable de Productos:** panel a todo el ancho bajo la barra (`superficie`, filete y sombra de desplegable), tres productos con miniatura de 120px, nombre y una línea, más un bloque para instituciones. Los módulos viven dentro de este menú, nunca en la barra. En celular ocupa la pantalla y suma Quiénes somos, Ingresar y Crear cuenta.
- **Pie:** oscuro (`noche`), marca y frase en 2 fracciones, y tres columnas: Productos, Plataforma, Legal.

### Escenario de la mesa (firma)
La misma mesa en tres vistas, dentro de un contenedor de 24px con degradado blanco a `#eef3f4`.
- **Selector Referencia · 3D · Cámara:** pestañas de 46px sobre un carril tintado; la seleccionada es blanca. Cambia sola cada 5.5s con un trazo de progreso de 2px bajo la pestaña activa; se pausa al pasar el puntero y se detiene al interactuar. Con movimiento reducido no corre.
- **Funda:** cuadrada, `pano` con `--tela`, borde interior blanco al 20% y rejilla de celdas; las piezas de acero en sus posiciones reales, con su número en un círculo oscuro. Tocar una pieza la marca (número en blanco).
- **3D:** la funda se inclina; piezas a escala 1.3 y números a 1.55 para que sigan legibles.
- **Cámara:** el escenario pasa a noche, la funda se desatura, aparecen esquinas de visor, un barrido menta y cajas de detección que se trazan una a una; una pieza aparece fuera de lugar en rojo con su destino «Va aquí». Las etiquetas evitan chocar entre sí y con «Va aquí»; en celular muestran solo el nombre, más grandes.
- **Riel:** la pieza elegida en acero a gran escala, con número (30px `marca`), nombre y texto fuente en cursiva.
- **«Ver las 10 piezas»:** leyenda superpuesta sobre la mesa, a dos columnas.

### Carril de productos
Tres productos de lado a lado, cada uno con nombre, lema, capacidades reguladas, enlace con flecha y su ventana; separados por filete vertical y 48px.

### Perfiles y documento
- **Perfiles:** Estudiantes y Docentes con pesos distintos (5 y 3 columnas), cada uno con filete superior, texto y su vista de demostración.
- **Panel del documento:** en el capítulo oscuro de instituciones, filas que pasan del texto literal del documento (Martian Mono) al dato estructurado (Host Grotesk 600), con flecha entre ambos.

### Motion
Curvas propias: `expo` (`cubic-bezier(.16,1,.3,1)`) para entradas y desplazamientos, `cuarta` (`cubic-bezier(.25,1,.5,1)`) para color y opacidad, `vaiven` (`cubic-bezier(.87,0,.13,1)`) para el barrido y el giro 3D. Una sola coreografía de carga: las líneas del titular suben desde su máscara (escalonadas 70ms), luego entradilla, acciones y escenario, y por último las piezas se colocan sobre la funda una a una (70ms). Con `prefers-reduced-motion` todo se reduce a un instante y el ciclo automático y el carril fijo se desactivan.

## Do's and Don'ts

### Do:
- **Do** usar la rejilla de 12 columnas con medianil de 24px y margen `lado`, a pantalla completa.
- **Do** dar a cada grupo pesos desiguales (6/3/3, 4/5/3, 5+6) en lugar de repartos iguales.
- **Do** dibujar el instrumental en SVG con el degradado de acero y contorno `acero-filo`, en sus posiciones reales de la mesa.
- **Do** usar solo datos reales (la mesa de Mayo de Tiroidectomía) y marcar todo lo ilustrativo con «demostración» en Martian Mono.
- **Do** ordenar listas con filetes de 1px, sin íconos.
- **Do** usar capítulos oscuros (`noche`) para cámara, instituciones y pie, y cerrar con la banda `pano` plana.
- **Do** mantener titulares a 650 y -0.04em, nunca más apretados.
- **Do** probar en 1100px y 760px y respetar `prefers-reduced-motion`.

### Don't:
- **Don't** hablar del funcionamiento interno (versiones, revisión, roles, licencia, despliegue) ni mostrar cifras del catálogo.
- **Don't** poner créditos ni el nombre de la institución fuera de «Quiénes somos».
- **Don't** mostrar estados de disponibilidad («Disponible», «Próximamente») en los mockups.
- **Don't** usar kickers ni eyebrows sobre los títulos.
- **Don't** armar filas de tarjetas con ícono en recuadro ni tríos iguales de tres columnas.
- **Don't** usar sombras de color, brillos ni sombras duras desplazadas.
- **Don't** aplicar `--tela` ni ninguna textura a superficies de página; solo a la funda.
- **Don't** usar menta o rojo fuera de la cámara (la menta, salvo enlaces sobre oscuro).
- **Don't** usar entradas genéricas de aparecer al hacer scroll; la carga tiene una sola coreografía.
- **Don't** volver a texturas artesanales o rústicas.
