---
name: IQ Platform
description: Campo estéril. La misma mesa de Mayo real, vista como referencia, en 3D y por la cámara.
colors:
  fondo: "#f3f6f6"
  superficie: "#ffffff"
  hover-neutro: "#e6eded"
  filete: "#dbe4e6"
  filete-2: "#c4d1d4"
  tinta: "#0a1b22"
  tinta-2: "#364b53"
  tinta-3: "#566a72"
  marca: "#0d6a5e"
  marca-hondo: "#08463e"
  marca-claro: "#ddefeb"
  marca-claro-hover: "#cfe7e1"
  niebla-marca: "#b8dcd4"
  pano: "#1d7564"
  niebla-pano: "#e6f3f0"
  brillo-pano: "rgba(255, 255, 255, .12)"
  sombra-pano: "rgba(0, 0, 0, .14)"
  menta: "#38e2b3"
  alerta-noche: "#ff6b6b"
  noche: "#061217"
  noche-2: "#0c1e24"
  filete-noche: "#1d353d"
  niebla-noche: "#a9bec5"
  acero-brillo: "#fbfdfd"
  acero: "#b3bec4"
  acero-caja: "#9eaab0"
  acero-sombra: "#8b979d"
  acero-raya: "#66737a"
  acero-linea: "#4f5c63"
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
  numero-riel:
    fontFamily: "Host Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "30px"
    fontWeight: 650
    lineHeight: 1
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Host Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "26px"
    fontWeight: 650
    letterSpacing: "-0.03em"
  title-ventana:
    fontFamily: "Host Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "24px"
    fontWeight: 650
    letterSpacing: "-0.03em"
  lema:
    fontFamily: "Host Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(19px, 1.5vw, 23px)"
    fontWeight: 550
    lineHeight: 1.35
    letterSpacing: "-0.015em"
  title-columna:
    fontFamily: "Host Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "20px"
    fontWeight: 650
    letterSpacing: "-0.02em"
  hallazgo:
    fontFamily: "Host Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "19px"
    fontWeight: 550
    lineHeight: 1.45
    letterSpacing: "-0.01em"
  pregunta:
    fontFamily: "Host Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "19px"
    fontWeight: 600
    letterSpacing: "-0.01em"
  title-menu:
    fontFamily: "Host Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    letterSpacing: "-0.01em"
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
  label-ventana:
    fontFamily: "Host Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "11.5px"
    fontWeight: 650
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
  trazo-fino: "2px"
  trazo: "3px"
  xs: "6px"
  sm: "8px"
  control-sm: "9px"
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
  button-soft-hover:
    backgroundColor: "{colors.marca-claro-hover}"
    textColor: "{colors.marca-hondo}"
  button-icon-sm:
    backgroundColor: "{colors.fondo}"
    rounded: "{rounded.control-sm}"
    size: "34px"
  link-arrow:
    textColor: "{colors.marca}"
    typography: "{typography.label}"
  nav-item:
    textColor: "{colors.tinta-2}"
    rounded: "{rounded.sm}"
    padding: "0 14px"
    height: "40px"
  nav-item-open:
    backgroundColor: "{colors.hover-neutro}"
    textColor: "{colors.tinta}"
  menu-link:
    textColor: "{colors.tinta}"
    typography: "{typography.title-menu}"
    rounded: "{rounded.xl}"
    padding: "16px"
  menu-link-hover:
    backgroundColor: "{colors.fondo}"
  view-selector-tab:
    textColor: "{colors.tinta-3}"
    rounded: "{rounded.md}"
    padding: "12px 18px 0"
    height: "46px"
  view-selector-tab-selected:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
  step-number:
    textColor: "{colors.filete-2}"
    typography: "{typography.headline-product}"
  tecnica-row:
    textColor: "{colors.tinta-2}"
    padding: "11px 0"
  tecnica-row-active:
    textColor: "{colors.marca}"
  aviso-cuenta:
    backgroundColor: "{colors.marca-claro}"
    textColor: "{colors.marca-hondo}"
    rounded: "{rounded.ventana}"
    padding: "20px 24px"
  faq-item:
    textColor: "{colors.tinta}"
    typography: "{typography.pregunta}"
    padding: "22px 0"
  hallazgo:
    textColor: "{colors.superficie}"
    typography: "{typography.hallazgo}"
    padding: "28px 28px 0 0"
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

El sistema es el campo quirúrgico visto con ojos de producto de tecnología médica: blanco clínico frío como fondo, tinta azul petróleo casi negra, el verde quirúrgico del paño como único color de marca y el acero del instrumental como material. Todo es limpio, preciso y plano; la profundidad la ponen los objetos (la funda, las piezas de acero), no la interfaz. El registro es profesional, moderno, tecnológico y clínico, y a la vez de casa de estudio: la página acompaña a quien aprende una técnica de principio a fin. Una versión anterior de tela y oficio artesanal fue rechazada por el usuario; nada rústico vuelve.

La composición es ancha y horizontal, a pantalla completa: rejilla de 12 columnas con medianil de 24 px y márgenes laterales fluidos, nunca una columna centrada con vacíos a los lados. El recorrido es un camino de aprendizaje: la mesa en la portada, los tres pasos (Conocer, Ver en 3D, Comprobar), el catálogo por especialidad, la investigación, los perfiles, las preguntas frecuentes y el pie oscuro. Las secciones alternan `fondo` y `superficie` y se separan por espacio y tipografía, no por color. La tipografía es una sola familia, Host Grotesk, grande y apretada en titulares; Martian Mono aparece solo cuando el dato es de la máquina.

El objeto firma es la mesa de Mayo real (Tiroidectomía), dibujada por código: la funda verde con el instrumental de acero en sus posiciones reales. La misma mesa se muestra como referencia, inclinada en 3D y escaneada por la cámara. Los datos reales se muestran como tales (técnicas del catálogo, estudios citados con autor y año); lo que es ilustrativo se marca «demostración».

**Key Characteristics:**
- Blanco clínico frío, tinta petróleo y verde de paño como única marca.
- Acero satinado dibujado en SVG para el instrumental; ningún raster.
- Menta exclusiva de las detecciones de cámara; rojo exclusivo de «fuera de lugar».
- Fondos neutros que alternan `fondo` y `superficie` con un fundido casi imperceptible; el verde de marca se reserva para acciones, enlaces y la espiral, y lo oscuro para la vista Cámara y el pie.
- Host Grotesk en todo; Martian Mono solo para datos de máquina.
- Composiciones anchas y horizontales a pantalla completa; listas paralelas en columnas separadas por filete.
- Sombras neutras, sin brillos; filetes finos de 1 px como estructura.

## Colors

Paleta fría y contenida: neutros clínicos con matiz petróleo, un verde de paño como marca, el acero como material y dos acentos funcionales que solo existen dentro de la cámara.

### Primary
- **Verde quirúrgico** (`marca`): botones primarios, enlaces con flecha, números de leyenda, barras de progreso, el `+` de las preguntas, la técnica señalada en el catálogo, foco (`outline` de 2.5 px) y selección de texto.
- **Verde quirúrgico hondo** (`marca-hondo`): hover del botón primario, texto sobre fondos verdes claros (aviso de cuenta, botón suave), tarjeta oscura de la vista de clase de Docentes.
- **Verde de agua clara** (`marca-claro`): fondo de acciones suaves («Ver las 10 piezas»), del aviso de cuenta del catálogo, fila seleccionada en las maquetas y hover del botón claro. Su paso de hover es `marca-claro-hover`.
- **Verde paño** (`pano`): el color de la funda de Mayo. Es el paño quirúrgico; es objeto, no fondo de página. Sobre la funda lleva un velo diagonal de `brillo-pano` a `sombra-pano` (`linear-gradient(150deg, …)` en `soft-light`).

### Secondary
- **Menta de detección** (`menta`): solo para la cámara: cajas de detección, sus etiquetas, el barrido de escaneo, el punto «En vivo», los conteos «en su lugar» y los enlaces dentro de capítulos oscuros.
- **Rojo de alerta** (`alerta-noche`): solo para «fuera de lugar»: la caja de la pieza mal ubicada, el destino punteado «Va aquí», el número del riel en vista de cámara y el conteo «por mover».

### Tertiary
- **Acero satinado** (`acero-brillo`, `acero`, `acero-caja`, `acero-sombra`, `acero-raya`, `acero-linea`, `acero-filo`): el instrumental. Se aplica como degradado lateral (gradiente `#acero` de cinco paradas, de `#e4eaed` a `acero-brillo`, `acero`, `acero-sombra` y `#d3dbdf`) con contorno `acero-filo` de 0.6 px. Las hojas usan el degradado `#hoja` (blanco a `#aab5bb`) con contorno `acero-linea`; las cajas y cierres, relleno `acero-caja` con contorno `acero-linea`; las estrías y ranuras son trazos `acero-raya` de 0.5 px.

### Neutral
- **Blanco clínico** (`fondo`): fondo de página, barra superior, fondos de ventanas de maqueta y hover de las opciones de menú.
- **Superficie** (`superficie`): paneles, desplegables, leyenda, burbujas y ventanas.
- **Hover neutro** (`hover-neutro`): fondo de los ítems de la barra al pasar o abiertos, y del botón de menú en celular.
- **Filete** (`filete`) y **filete fuerte** (`filete-2`): líneas de 1 px que separan, ordenan listas y bordean ventanas; `filete-2` para puntos de ventana, la barra de desplazamiento y los números de paso.
- **Tinta petróleo** (`tinta`), **tinta media** (`tinta-2`), **tinta suave** (`tinta-3`): titulares, texto de cuerpo y texto secundario, en ese orden.
- **Noche** (`noche`), **noche 2** (`noche-2`), **filete noche** (`filete-noche`), **niebla** (`niebla-noche`): capítulos oscuros, sus paneles, sus líneas y su texto secundario.
- **Niebla de marca** (`niebla-marca`) y **niebla de paño** (`niebla-pano`): texto secundario sobre `marca-hondo` (vista de clase) y sobre `pano`.

### Named Rules
**The Dos Acentos Cautivos Rule.** La menta y el rojo viven solo dentro de la cámara (vista Cámara, ventana de SIVRI) y en enlaces sobre capítulos oscuros, en el caso de la menta. Fuera de ahí no existen: ni estados genéricos de éxito o error, ni decoración.

**The Paño Es Objeto Rule.** La textura no tejida `--tela` y el velo `brillo-pano`/`sombra-pano` se aplican solo a la funda de Mayo y sus miniaturas. Ninguna superficie de página, tarjeta o banda lleva textura.

**The Una Sola Marca Rule.** El verde es el único color de marca. No se agregan segundos acentos decorativos; `hover-neutro` y `marca-claro-hover` son pasos de estado, no colores nuevos.

**The Fondos Neutros Rule.** Las secciones del inicio alternan `fondo` y `superficie` (Portada `fondo`, Tres formas `superficie`, Especialidades `fondo`, Investigación `superficie`, Para quien estudia y enseña `fondo`, Preguntas `superficie`) y terminan en el pie `noche`. No hay banda de cierre: se probó una con solo texto y el usuario la quitó; la acción de crear cuenta vive en la barra, siempre visible, y en la portada. Se separan por espacio y tipografía, no por color: regla 60-30-10 (60 % neutro, 30 % superficies y tonos de apoyo, 10 % verde de marca). Un color distinto por sección, con el mismo peso, se ve desordenado e infantil; se probó una paleta pastel por sección y el usuario la rechazó. El cambio de una sección a otra es un fundido que ocurre solo dentro de los rellenos de ambas (nunca debajo del contenido): media curva suave a cada lado del límite, que se encuentran en la mezcla de los dos colores, interpolada en OKLab, en una capa detrás del contenido.

**The Tinte De Su Fondo Rule.** El texto secundario sobre un fondo oscuro o de color toma un tinte claro de ese mismo fondo: `niebla-noche` sobre `noche`, `niebla-marca` sobre `marca-hondo`, `niebla-pano` sobre `pano`. Nunca un gris neutro ni blanco con opacidad para texto.

## Typography

**Display Font:** Host Grotesk (con Helvetica Neue, Arial)
**Body Font:** Host Grotesk (con Helvetica Neue, Arial)
**Label/Mono Font:** Martian Mono (con ui-monospace, SFMono-Regular, Menlo)

**Character:** Una grotesca contemporánea y técnica, grande y apretada en titulares y serena en el cuerpo; la mono aparece como la voz de la máquina, solo donde hay datos de la cámara o marcas de demostración.

### Hierarchy
- **Display** (650, `clamp(60px, 13.6vw, 236px)`, 0.98): sin uso en el inicio desde que se quitó la banda de cierre; queda para portadas de otras pantallas.
- **Headline** (650, `clamp(46px, 5.6vw, 100px)`, 0.96): el titular de portada, en tres líneas que suben al cargar.
- **Headline de sección** (650, `clamp(38px, 4.2vw, 68px)`, 1): títulos de sección, que terminan en punto («Técnicas por especialidad.»).
- **Headline de producto** (650, `clamp(40px, 3.6vw, 60px)`, 1): nombres de producto en el carril y su número de paso, en línea.
- **Número del riel** (650, 30px, 1, -0.03em): el número de la pieza elegida, en `marca` (rojo en vista de cámara).
- **Title** (650, 26px, -0.03em): perfiles (Estudiantes, Docentes).
- **Title de ventana** (650, 24px, -0.03em): el título de la técnica dentro de la maqueta de DataIQ.
- **Lema** (550, `clamp(19px, 1.5vw, 23px)`, 1.35, máx. 26ch): la frase que dice qué resuelve cada herramienta.
- **Title de columna** (650, 20px, -0.02em): nombre de cada especialidad en el catálogo.
- **Hallazgo** (550, 19px, 1.45, -0.01em): el enunciado de cada estudio en el capítulo de investigación.
- **Pregunta** (600, 19px, -0.01em; 17px en celular): la pregunta de cada fila de preguntas frecuentes.
- **Title de menú** (700, 18px, -0.01em): opciones de los desplegables y tarjeta lateral; 650 en los grupos del menú de celular. 17px 700 para los títulos de columna del menú Especialidades.
- **Body large** (400, 18px, 1.55-1.6): entradilla de portada (máx. 34ch) y texto de sección (máx. 46ch).
- **Body** (400, 17px, 1.6): texto base y respuestas de preguntas (máx. 62ch); 15-16px en capacidades, filas de técnica, citas, menús y pie.
- **Label** (550-650, 14-15.5px): navegación, botones, selector.
- **Label de ventana** (650, 11.5px): solo encabezados de grupo dentro de las maquetas de producto, que son interfaces a escala reducida; 13-14.5px para su texto.
- **Data** (Martian Mono 400, 12.5px): etiquetas «demostración»; 600 a 14px en etiquetas de detección y «Va aquí» (26px en celular, dentro del SVG escalado).

### Named Rules
**The -0.04em Rule.** Los titulares de 38px o más van a 650 con -0.04em; nunca más apretado. Los de 24-30px van a -0.03em, los de 17-20px a -0.01/-0.02em.

**The Voz De La Máquina Rule.** Martian Mono solo para lo que dice la máquina: etiquetas de detección con su confianza, «Va aquí» y la marca «demostración». Nunca en titulares, botones, citas ni cuerpo.

**The Un Solo Gigante Rule.** En cada pantalla hay a lo sumo un momento tipográfico extremo; en el inicio es el titular de la portada y ningún otro texto compite con él.

**The Paso Callado Rule.** El número de paso va en línea antes del nombre, al mismo tamaño y en `filete-2`, nunca encima como rótulo. Es decorativo (`aria-hidden`) y solo se usa cuando el orden también se dice en texto (el recorrido «1 · Conocer»).

## Layout

Pantalla completa. El margen lateral es `lado` (`clamp(20px, 4.4vw, 64px)`) y el contenido usa una rejilla de 12 columnas con medianil de 24 px. La portada ocupa el alto de la ventana menos la barra: titular en columnas 1-5, escenario en 6-12 cruzando hacia el centro. Las secciones respiran con `seccion` (`clamp(72px, 10vh, 112px)`) y `seccion compacta` (`clamp(64px, 9vh, 104px)`) de padding vertical; entre dos secciones queda la suma de ambos, unos 130-220px. Más que eso, con fondos casi iguales, se lee como un hueco y no como una pausa.

Las cabeceras son anchas y asimétricas: «Así se aprende una técnica.» en 6/3/3 columnas (título, texto, recorrido); el catálogo en 6 + enlace (título en 1-6, «Ver todas las técnicas» al final de la fila). Las secciones con titular lateral siguen una sola regla (ver abajo): investigación (titular y conclusiones en 1-5, espiral en 6-12 saliendo por el borde derecho), perfiles (encabezado en 1-5, Estudiantes y Docentes en lista en 7-12) y preguntas (encabezado en 1-5, secciones expandibles en 7-12). Las herramientas se recorren de lado a lado: en escritorio la sección queda fija bajo la barra y el carril se traslada horizontalmente con el scroll, con tres trazos de progreso de 3 px; en celular el carril es un desplazamiento horizontal con `scroll-snap` y tarjetas de 82vw.

Las listas paralelas del mismo tipo van en columnas iguales, sin tarjeta, separadas por filete vertical: cinco especialidades (tres en tableta), cuatro hallazgos (dos en tableta), las columnas del menú Especialidades y las del pie (marca a 1.6 fracciones más cuatro columnas). En celular especialidades y hallazgos pasan a filas horizontales con `scroll-snap` de 74vw.

Puntos de corte: **960 px** (los menús de la barra pasan al botón de menú y al panel a pantalla completa, porque los cuatro menús, Ingresar y Crear cuenta ya no caben en una línea), **1100 px** (tableta: todo a columna completa, escenario cuadrado, herramienta en una columna de hasta 760px) y **760 px** (celular: barra de 64px con menú a pantalla completa, selector a tres botones iguales, riel bajo la mesa, leyenda a una columna, carriles con `scroll-snap`, pie a dos columnas).

**The Titular Lateral Rule.** Cuando el titular va al costado del contenido, ocupa las columnas 1-5, la 6 queda libre como respiro y el contenido va en 7-12 (la espiral, por ser figura, puede empezar en la 6). La misma línea vertical se repite en toda la página, como en las páginas de producto de Apple.

**The Sin Columna Central Rule.** Nada se centra en una columna angosta con vacíos a los lados. El ancho de la ventana es el lienzo.

**The Columnas Iguales Solo Para Pares Rule.** Los repartos iguales son solo para listas del mismo tipo (especialidades, hallazgos, columnas de menú y pie), reguladas por filetes. Las composiciones de cabecera y contenido llevan pesos desiguales.

## Elevation & Depth

Sistema plano con objetos que sí tienen cuerpo. La interfaz se ordena con filetes de 1 px y capas tonales (`fondo`, `superficie`, `noche`, `noche-2`); las sombras son neutras (tinta petróleo `rgba(10, 27, 34, …)` o casi negra) y difusas, con offset negativo de spread para que se queden pegadas al objeto. La profundidad real la dan la funda (con su canto `#0e463c` a -16px en Z y la inclinación 3D `rotateX(44deg) rotateZ(-28deg)`) y las piezas de acero con doble `drop-shadow`.

### Shadow Vocabulary
- **Botón en reposo** (`box-shadow: inset 0 1px 0 rgba(255,255,255,.14), 0 1px 2px rgba(10,27,34,.25)`): botón primario.
- **Botón al pasar** (`box-shadow: inset 0 1px 0 rgba(255,255,255,.14), 0 8px 16px -10px rgba(10,27,34,.5)`): con `translateY(-1px)`.
- **Escenario** (`box-shadow: 0 1px 2px rgba(10,27,34,.05), 0 16px 32px -24px rgba(10,27,34,.3)`): el contenedor del héroe.
- **Desplegable** (`box-shadow: 0 18px 28px -22px rgba(10,27,34,.4)`): los cuatro paneles de la barra.
- **Funda** (`box-shadow: 0 1px 2px rgba(0,0,0,.25), 0 28px 50px -22px rgba(10,27,34,.55)`): el objeto paño.
- **Pieza de acero** (`filter: drop-shadow(0 2px 1.4px rgba(3,20,28,.6)) drop-shadow(0 6px 8px rgba(3,20,28,.22))`): cada instrumento; al marcarla sube a `drop-shadow(0 12px 8px rgba(3,20,28,.4))` con `translate(-2px, -6px)`.
- **Panel flotante** (`box-shadow: 0 12px 30px -16px rgba(10,27,34,.45)`): la leyenda «Ver las 10 piezas».

### Named Rules
**The Sombra Neutra Rule.** Toda sombra es tinta neutra difusa. Sin sombras de color, sin brillos (`glow`), sin sombras duras desplazadas. El barrido de la cámara es un instrumento de escaneo, no un brillo decorativo.

**The El Objeto Pesa Rule.** La elevación fuerte es de los objetos dibujados (funda, piezas, riel) y de lo que se superpone (desplegables, leyenda). Las tarjetas de interfaz se bordean con filete (`inset 0 0 0 1px`), no se levantan.

## Shapes

Esquinas suaves y técnicas, escaladas por tamaño del contenedor: 8px en ítems de la barra y filas de leyenda, 9px en controles pequeños de 30-34px (cerrar, enviar, botón del pie de cámara), 10px en botones y pestañas, 12px en botón grande y funda, 14px en el selector, las opciones de menú y la tarjeta lateral, 16px en ventanas de producto, paneles y el aviso de cuenta, 20px en el escenario en celular, 24px en el escenario; píldora (99px) solo en sugerencias del chat. Los trazos de progreso redondean a la mitad de su grosor: 2px en el del selector, 3px en los del recorrido, 6px en las barras de práctica. Las líneas son filetes de 1 px; las listas se ordenan con filete arriba de cada fila y uno al cierre, y el catálogo abre con un filete de 2px en `tinta`. Los visores de cámara son esquinas en L de 30px con trazo de 2px. Las burbujas de chat recortan a 4px la esquina del lado que habla.

## Components

### Buttons
Firmes y clínicos: verde lleno, sin adornos, con una flecha que avanza al pasar.
- **Shape:** esquinas suaves (10px; 12px en el grande).
- **Primary:** `marca` con texto blanco, 650, 42px de alto y 18px de padding; el grande mide 56px, 26px de padding y 17px.
- **Hover / Focus:** pasa a `marca-hondo`, sube 1px y la flecha se desplaza 3px (`.35s` en `expo`). Foco: contorno `marca` de 2.5px a 3px de distancia.
- **Claro:** blanco con texto `marca-hondo`, sin sombra, solo sobre la banda verde; hover `marca-claro`.
- **Suave:** `marca-claro` con texto `marca-hondo`, 38px («Ver las 10 piezas»); hover `marca-claro-hover`.
- **Ícono pequeño:** 34px, `fondo`, 9px (cerrar la leyenda).
- **Enlace con flecha:** texto `marca` 650 con flecha SVG de 16px; en capítulos oscuros, `menta`.

### Chips
- **Etiqueta «demostración»:** Martian Mono 12.5px en `tinta-3` (`niebla-noche` sobre noche, `niebla-marca` sobre marca hondo), sin fondo ni borde. Marca todo dato ilustrativo.
- **Sugerencias del chat:** píldora `fondo`, 13px, solo dentro de la maqueta de SIMIQ3D.

### Cards / Containers
- **Corner Style:** 16px (ventanas, paneles, aviso), 24px (escenario).
- **Background:** `superficie` sobre `fondo`; `noche-2` sobre `noche`; `marca-hondo` para la vista de clase.
- **Shadow Strategy:** filete interior de 1px; ver Elevation & Depth.
- **Border:** `filete` / `filete-noche`.
- **Internal Padding:** 18-26px.
- **Ventana de producto:** barra de 44px blanca con tres puntos `filete-2`, nombre en 650 y «demostración» a la derecha; dentro, la maqueta de la interfaz del producto. La de SIVRI es oscura (`noche-2`) con pie de conteos.
- **Listas de capacidades:** filas reguladas por filetes de 1px, 16px, sin íconos ni viñetas.

### Navigation
- **Barra:** fija arriba, 72px (64px en celular), fondo `fondo` con filete inferior. Marca «IQ Platform» 700 a 19px; a la izquierda cuatro categorías con flecha: Herramientas, Especialidades, ¿Por qué IQ Platform?, Ayuda; a la derecha Ingresar y Crear cuenta.
- **Ítems:** 15.5px 550 en `tinta-2`, 40px de alto, 8px de radio; hover y abierto con `hover-neutro` y `tinta`. La flecha gira 180° al abrir.
- **Desplegables:** un solo panel abierto a la vez, a todo el ancho bajo la barra (`superficie`, filete y sombra de desplegable), entra bajando 8px en `.4s expo`; se cierra con Escape, al hacer clic fuera o al elegir un enlace.
  - *Herramientas:* DataIQ, SIMIQ3D y SIVRI con miniatura de 120px, nombre (title de menú) y una línea, más una tarjeta lateral `fondo` de 14px, «Así se aprende una técnica», con enlace con flecha.
  - *Especialidades:* cinco columnas separadas por filete, con el nombre de la especialidad y sus técnicas reales.
  - *¿Por qué IQ Platform?* y *Ayuda:* tres opciones cada uno, con título, flecha `marca` y una línea `tinta-3`; hover `fondo`.
- **Celular:** el botón de menú (44px) abre un panel a pantalla completa con grupos plegables (`details`, filete inferior, flecha que gira) y, al final, Crear cuenta gratis (botón grande) e Ingresar (enmarcado con filete).
- **Pie:** oscuro (`noche`), marca y frase en 1.6 fracciones y cuatro columnas: Herramientas, Especialidades, ¿Por qué IQ Platform?, Ayuda.

### Escenario de la mesa (firma)
La misma mesa en tres vistas, dentro de un contenedor de 24px con degradado blanco a `#eef3f4`.
- **Selector Referencia · 3D · Cámara:** pestañas de 46px sobre un carril tintado; la seleccionada es blanca. Cambia sola cada 5.5s con un trazo de progreso de 2px bajo la pestaña activa; se pausa al pasar el puntero y se detiene al interactuar. Con movimiento reducido no corre.
- **Funda:** cuadrada, `pano` con `--tela`, borde interior blanco al 20% y rejilla de celdas; las piezas de acero en sus posiciones reales, con su número en un círculo oscuro. Tocar una pieza la marca (número en blanco).
- **3D:** la funda se inclina; piezas a escala 1.3 y números a 1.55 para que sigan legibles.
- **Cámara:** el escenario pasa a noche, la funda se desatura, aparecen esquinas de visor, un barrido menta y cajas de detección que se trazan una a una; una pieza aparece fuera de lugar en rojo con su destino «Va aquí». Las etiquetas evitan chocar entre sí y con «Va aquí»; en celular muestran solo el nombre, más grandes.
- **Riel:** la pieza elegida en acero a gran escala, con número (número del riel) y nombre. No muestra el texto crudo de la fuente: la web no habla de dónde salen los datos.
- **«Ver las 10 piezas»:** leyenda superpuesta sobre la mesa, a dos columnas.

### Carril «Así se aprende una técnica»
Tres herramientas de lado a lado, en orden de aprendizaje (1 Conocer, 2 Ver en 3D, 3 Comprobar). Cada una lleva el número de paso en línea antes del nombre, el lema, capacidades reguladas, enlace con flecha y su ventana; separadas por filete vertical y 48px. El recorrido de la cabecera repite los pasos con su trazo de progreso.

### Catálogo por especialidad
Cinco columnas abiertas por un filete de 2px `tinta`; cada una con su nombre (title de columna) y sus técnicas como filas-botón de 15.5px en `tinta-2`, con filete superior y 11px de padding. Al pasar o al tocar, la fila pasa a `marca` y aparece una flecha que entra 4px. Tocar una técnica abre debajo el aviso de cuenta: `marca-claro`, 16px, texto `marca-hondo` con el nombre de la técnica en 700 y un botón primario «Crear cuenta gratis».

### Investigación
Sección `superficie`. A la izquierda, el titular y tres conclusiones (ícono de línea `marca`, texto `tinta-2` con el inicio en `tinta` 600) separadas por filete, y el enlace con flecha en `marca`. A la derecha, la espiral, sin marco: un pulso `marca-hondo` sube en tres vueltas cada vez más rápidas (velocidad que crece de forma exponencial), los puntos de cada vuelta se encienden en `marca`, el anillo del nivel destella al cerrarla y aparece un logro en píldora `superficie` con filete (Instrumental reconocido, Posiciones memorizadas, Mesa completa, sin errores); al final sale un haz hacia arriba con el logro «Un paso adelante» en `marca`. Detrás, un resplandor verde muy tenue que crece con el avance y motas `marca` que suben. Solo corre en pantalla; con movimiento reducido queda el estado final. En celular los logros van como lista debajo de la espiral.

### Preguntas frecuentes
Lista de `details` regulada por filetes, en columnas 6-12. Cada pregunta (19px 600) lleva a la derecha un `+` SVG en `marca` que gira 45° al abrir (`.35s expo`); la respuesta es body `tinta-2` de hasta 62ch.

### Perfiles
Estudiantes y Docentes con pesos distintos (5 y 3 columnas), cada uno con filete superior, texto y su vista de demostración: práctica con barras de progreso `marca` sobre `superficie`, y la vista de clase en `marca-hondo` con texto secundario `niebla-marca`.

### Motion
Curvas propias: `expo` (`cubic-bezier(.16,1,.3,1)`) para entradas, desplazamientos y giros de flechas, `cuarta` (`cubic-bezier(.25,1,.5,1)`) para color y opacidad, `vaiven` (`cubic-bezier(.87,0,.13,1)`) para el barrido y el giro 3D. Una sola coreografía de carga: las líneas del titular suben desde su máscara (escalonadas 70ms), luego entradilla, acciones y escenario, y por último las piezas se colocan sobre la funda una a una (70ms). Fuera de la carga solo se anima lo que responde a una acción: desplegables, aviso de cuenta, `+` y flechas. Con `prefers-reduced-motion` todo se reduce a un instante y el ciclo automático y el carril fijo se desactivan.

## Do's and Don'ts

### Do:
- **Do** usar la rejilla de 12 columnas con medianil de 24px y margen `lado`, a pantalla completa.
- **Do** dar pesos desiguales a cabecera y contenido (6/3/3, 6 + 5, 4/5/3, 4 + 7); columnas iguales solo para listas paralelas reguladas por filete.
- **Do** dibujar el instrumental en SVG con el degradado de acero y contorno `acero-filo`, en sus posiciones reales de la mesa.
- **Do** usar solo datos reales (la mesa de Mayo de Tiroidectomía, técnicas del catálogo, estudios con autor y año) y marcar todo lo ilustrativo con «demostración» en Martian Mono.
- **Do** ordenar listas con filetes de 1px, sin íconos.
- **Do** alternar `fondo` y `superficie` entre secciones, con fundido solo en los rellenos; oscuro solo en la vista Cámara y el pie.
- **Do** alinear el contenido de las secciones con titular lateral en la columna 7.
- **Do** dar al texto secundario sobre fondos de color el tinte de su fondo (`niebla-noche`, `niebla-marca`, `niebla-pano`).
- **Do** mantener titulares a 650 y -0.04em, nunca más apretados.
- **Do** convertir en celular las filas de columnas paralelas en carriles horizontales con `scroll-snap`.
- **Do** probar en 1100px y 760px y respetar `prefers-reduced-motion`.

### Don't:
- **Don't** dar a cada sección un color distinto; los fondos son neutros.
- **Don't** hablar del funcionamiento interno (versiones, revisión, roles, licencia, despliegue) ni mostrar cifras del catálogo.
- **Don't** poner créditos ni el nombre de la institución fuera de «Quiénes somos».
- **Don't** mostrar estados de disponibilidad («Disponible», «Próximamente») en los mockups.
- **Don't** usar kickers ni eyebrows sobre los títulos; el número de paso va en línea, no encima.
- **Don't** armar filas de tarjetas con ícono en recuadro.
- **Don't** usar sombras de color, brillos ni sombras duras desplazadas.
- **Don't** aplicar `--tela` ni ninguna textura a superficies de página; solo a la funda.
- **Don't** usar menta o rojo fuera de la cámara (la menta, salvo enlaces sobre oscuro).
- **Don't** usar entradas genéricas de aparecer al hacer scroll; la carga tiene una sola coreografía.
- **Don't** volver a texturas artesanales o rústicas.
