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
  headline-panel:
    fontFamily: "Host Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "40px"
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
  title-menu:
    fontFamily: "Host Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 650
    letterSpacing: "-0.01em"
  pregunta:
    fontFamily: "Host Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 600
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
  seccion: "clamp(72px, 10vh, 112px)"
  seccion-compacta: "clamp(64px, 9vh, 104px)"
  carril: "48px"
  columna-tecnicas: "300px"
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
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 18px"
    height: "42px"
  button-soft-hover:
    backgroundColor: "{colors.marca-claro-hover}"
    textColor: "{colors.marca-hondo}"
  button-soft-small:
    backgroundColor: "{colors.marca-claro}"
    textColor: "{colors.marca-hondo}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "38px"
  button-ghost:
    textColor: "{colors.tinta-2}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 14px"
    height: "40px"
  button-ghost-hover:
    backgroundColor: "{colors.hover-neutro}"
    textColor: "{colors.tinta}"
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
  nav-item-current:
    textColor: "{colors.marca-hondo}"
  menu-link:
    textColor: "{colors.tinta}"
    typography: "{typography.title-columna}"
    padding: "16px 4px"
  menu-link-hover:
    textColor: "{colors.marca}"
    padding: "16px 4px 16px 12px"
  view-selector-tab:
    textColor: "{colors.tinta-3}"
    rounded: "{rounded.md}"
    padding: "12px 18px 0"
    height: "46px"
  view-selector-tab-selected:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
  search-field:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: "0 20px 0 54px"
    height: "60px"
  filter-option:
    textColor: "{colors.tinta-2}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
    height: "46px"
  filter-option-selected:
    backgroundColor: "{colors.marca-claro}"
    textColor: "{colors.marca-hondo}"
  filter-chip:
    textColor: "{colors.tinta-2}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
    height: "40px"
  filter-chip-selected:
    backgroundColor: "{colors.marca}"
    textColor: "{colors.superficie}"
  tecnica-row:
    textColor: "{colors.tinta-2}"
    padding: "11px 0"
  tecnica-row-active:
    textColor: "{colors.marca}"
  tecnica-row-catalogo:
    textColor: "{colors.tinta}"
    padding: "17px 4px"
  tecnica-row-catalogo-active:
    textColor: "{colors.marca}"
    padding: "17px 4px 17px 10px"
  tecnica-tab:
    textColor: "{colors.tinta-3}"
    padding: "10px 0 12px"
  tecnica-tab-selected:
    textColor: "{colors.tinta}"
  lado-item:
    textColor: "{colors.tinta-2}"
    rounded: "{rounded.sm}"
    padding: "8px 10px"
  lado-item-current:
    backgroundColor: "{colors.marca-claro}"
    textColor: "{colors.marca-hondo}"
  mesa-diagrama:
    backgroundColor: "{colors.superficie}"
    rounded: "{rounded.xl}"
  leyenda-item:
    textColor: "{colors.tinta-2}"
    padding: "8px 6px"
    height: "44px"
  leyenda-item-active:
    backgroundColor: "{colors.marca-claro}"
    textColor: "{colors.tinta}"
  sin-mesa:
    textColor: "{colors.tinta-3}"
    rounded: "{rounded.xl}"
    height: "220px"
  faq-group:
    textColor: "{colors.tinta}"
    typography: "{typography.title-ventana}"
    padding: "22px 0"
  faq-item:
    textColor: "{colors.tinta}"
    typography: "{typography.pregunta}"
    padding: "14px 0"
  perfil-row:
    textColor: "{colors.tinta}"
    padding: "24px 0"
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

La composición es ancha y horizontal, a pantalla completa: rejilla de 12 columnas con medianil de 24 px y márgenes laterales fluidos, nunca una columna centrada con vacíos a los lados. El recorrido del inicio es un camino de aprendizaje: la mesa en la portada, las tres herramientas de lado a lado (DataIQ, SIMIQ3D, SIVRI), el catálogo por especialidad, la investigación, los perfiles, las preguntas frecuentes y el pie oscuro. Las páginas de trabajo (catálogo y detalle de técnica) usan el mismo mundo con una columna fija a la izquierda y el contenido a la derecha. Las secciones alternan `fondo` y `superficie` y se separan por espacio y tipografía, no por color. La tipografía es una sola familia, Host Grotesk, grande y apretada en titulares; Martian Mono aparece solo cuando el dato es de la máquina.

El objeto firma es la mesa de Mayo real (Tiroidectomía), dibujada por código: la funda verde con el instrumental de acero en sus posiciones reales. La misma mesa se muestra como referencia, inclinada en 3D y escaneada por la cámara. En el detalle de técnica la mesa deja de ser objeto y pasa a diagrama sereno. Los datos reales se muestran como tales (técnicas del catálogo, estudios citados con autor y año); lo que es ilustrativo se marca «demostración».

**Key Characteristics:**
- Blanco clínico frío, tinta petróleo y verde de paño como única marca.
- Acero satinado dibujado en SVG para el instrumental; ningún raster.
- Menta exclusiva de las detecciones de cámara; rojo exclusivo de «fuera de lugar».
- Fondos neutros que alternan `fondo` y `superficie` con un fundido casi imperceptible; el verde de marca se reserva para acciones, enlaces y la espiral, y lo oscuro para la vista Cámara y el pie.
- Host Grotesk en todo; Martian Mono solo para datos de máquina.
- Composiciones anchas y horizontales a pantalla completa; listas paralelas en columnas separadas por filete.
- Sombras neutras, sin brillos; filetes finos de 1 px como estructura.
- La mesa es objeto en el inicio (paño, tela, 3D) y diagrama sereno en el detalle (superficie, rejilla fina, sin paño).

## Colors

Paleta fría y contenida: neutros clínicos con matiz petróleo, un verde de paño como marca, el acero como material y dos acentos funcionales que solo existen dentro de la cámara.

### Primary
- **Verde quirúrgico** (`marca`): botones primarios, enlaces con flecha, números de leyenda, trazos de progreso, los `+` y flechas de las preguntas, la técnica señalada en el catálogo, la espiral de la investigación, el chip elegido en celular, foco (`outline` de 2.5 px) y selección de texto.
- **Verde quirúrgico hondo** (`marca-hondo`): hover del botón primario, texto sobre fondos verdes claros (botón suave, placa del filtro, técnica actual), «Especialidades» marcada como sección actual y el pulso de la espiral.
- **Verde de agua clara** (`marca-claro`): fondo de acciones suaves («Ver las 10 piezas», «Ver en 3D»), del candado de la puerta de cuenta, de la placa del filtro del catálogo, de la técnica actual en la columna de técnicas, de la fila señalada de la leyenda, del avatar, de los pictogramas de perfiles y del resaltado de la búsqueda. Su paso de hover es `marca-claro-hover`, que también es el color de la etiqueta de módulo sobre el botón verde.
- **Verde paño** (`pano`): el color de la funda de Mayo. Es el paño quirúrgico; es objeto, no fondo de página. Sobre la funda lleva un velo diagonal de `brillo-pano` a `sombra-pano` (`linear-gradient(150deg, …)` en `soft-light`).

### Secondary
- **Menta de detección** (`menta`): solo para la cámara: cajas de detección, sus etiquetas, el barrido de escaneo, el punto «En vivo», los conteos «en su lugar» y los enlaces dentro de capítulos oscuros.
- **Rojo de alerta** (`alerta-noche`): solo para «fuera de lugar»: la caja de la pieza mal ubicada, el destino punteado «Va aquí», el número del riel en vista de cámara y el conteo «por mover».

### Tertiary
- **Acero satinado** (`acero-brillo`, `acero`, `acero-caja`, `acero-sombra`, `acero-raya`, `acero-linea`, `acero-filo`): el instrumental. Se aplica como degradado lateral (gradiente `#acero` de cinco paradas, de `#e4eaed` a `acero-brillo`, `acero`, `acero-sombra` y `#d3dbdf`) con contorno `acero-filo` de 0.6 px. Las hojas usan el degradado `#hoja` (blanco a `#aab5bb`) con contorno `acero-linea`; las cajas y cierres, relleno `acero-caja` con contorno `acero-linea`; las estrías y ranuras son trazos `acero-raya` de 0.5 px. En el diagrama de la mesa de reserva, lo que no es instrumental (compresas, riñonera, bandeja) va plano: relleno `#eef3f3` o `#dde4e7` con contorno `acero-sombra`.

### Neutral
- **Blanco clínico** (`fondo`): fondo de página, barra superior, desplegables de la barra, fondos de ventanas de maqueta, encabezados fijos de la lista del catálogo y panel de la técnica en el detalle.
- **Superficie** (`superficie`): secciones alternas, menú de celular, leyenda flotante, buscador del catálogo, columna de técnicas y diagrama de mesa del detalle, burbujas y logros.
- **Hover neutro** (`hover-neutro`): fondo de los ítems de la barra al pasar o abiertos, de Ingresar y «Mi cuenta», de limpiar la búsqueda y del botón de menú en celular.
- **Filete** (`filete`) y **filete fuerte** (`filete-2`): líneas de 1 px que separan, ordenan listas y bordean ventanas; `filete-2` para puntos de ventana, la barra de desplazamiento, el borde del buscador, el recuadro «Sin mesa» y los huecos «Sin dato» de la leyenda.
- **Tinta petróleo** (`tinta`), **tinta media** (`tinta-2`), **tinta suave** (`tinta-3`): titulares, texto de cuerpo y texto secundario, en ese orden.
- **Noche** (`noche`), **noche 2** (`noche-2`), **filete noche** (`filete-noche`), **niebla** (`niebla-noche`): capítulos oscuros, sus paneles, sus líneas y su texto secundario.
- **Niebla de marca** (`niebla-marca`) y **niebla de paño** (`niebla-pano`): texto secundario sobre `marca-hondo` y sobre `pano`. Ninguna pantalla actual tiene esos fondos; quedan reservadas para cuando vuelvan.

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
- **Headline de sección** (650, `clamp(38px, 4.2vw, 68px)`, 1): títulos de sección, que terminan en punto («Técnicas por especialidad.»), y el titular «Técnicas» del catálogo.
- **Headline de producto** (650, `clamp(40px, 3.6vw, 60px)`, 1): nombres de herramienta en el carril.
- **Headline de panel** (650, 40px, 1, -0.04em): el nombre de cada desplegable de la barra y el nombre de la técnica en el detalle.
- **Número del riel** (650, 30px, 1, -0.03em): el número de la pieza elegida, en `marca` (rojo en vista de cámara).
- **Title** (650, 26px, -0.03em): la frase del desplegable ¿Por qué IQ Platform? y el título del estado vacío del catálogo.
- **Title de ventana** (650, 24px, -0.03em): el título de la técnica dentro de la maqueta de DataIQ, los perfiles (Estudiantes, Docentes), los grupos de preguntas y los encabezados fijos de especialidad del catálogo (20px en celular).
- **Lema** (550, `clamp(19px, 1.5vw, 23px)`, 1.35, máx. 26ch): la frase que dice qué resuelve cada herramienta.
- **Title de columna** (650, 20px, -0.02em): nombre de cada especialidad en el catálogo del inicio, opciones de los desplegables y título de cada mesa en el detalle.
- **Title de menú** (650, 18px): grupos plegables del menú de celular; con -0.01em, títulos de bloque de Datos clínicos («Para qué sirve», suturas, equipos).
- **Pregunta** (600, 17px, -0.01em): la pregunta de cada fila de preguntas frecuentes.
- **Body large** (400, 18px, 1.55-1.6): entradilla de portada (máx. 34ch) y texto de sección (máx. 46ch).
- **Body** (400, 17px, 1.6): texto base, filas del catálogo y conclusiones de la investigación (1.45); 15-16px en capacidades, filas de técnica del inicio, respuestas de preguntas (1.55, máx. 56ch), fichas, instrumental, leyenda, menús y pie.
- **Label** (550-650, 14-16px): navegación (15.5px 550), botones (15.5px 650), selector, pestañas y filtro del catálogo (16px, 550; 650 el elegido).
- **Label de ventana** (650, 11.5px): solo encabezados de grupo dentro de las maquetas de producto, que son interfaces a escala reducida; 13-14.5px para su texto. A 13px 650 en `tinta-3`, los encabezados de especialidad de la columna de técnicas; a 13px 500, la etiqueta de módulo dentro de los botones del detalle.
- **Data** (Martian Mono 400, 12.5px): etiquetas «demostración»; 600 a 14px en etiquetas de detección y «Va aquí» (26px en celular, dentro del SVG escalado).

### Named Rules
**The -0.04em Rule.** Los titulares de 38px o más van a 650 con -0.04em; nunca más apretado. Los de 24-30px van a -0.03em, los de 17-20px a -0.01/-0.02em.

**The Voz De La Máquina Rule.** Martian Mono solo para lo que dice la máquina: etiquetas de detección con su confianza, «Va aquí» y la marca «demostración». Nunca en titulares, botones, citas ni cuerpo.

**The Un Solo Gigante Rule.** En cada pantalla hay a lo sumo un momento tipográfico extremo; en el inicio es el titular de la portada y ningún otro texto compite con él.

**The Paso Callado Rule.** El número de paso va en línea antes del nombre, al mismo tamaño y en `filete-2`, nunca encima como rótulo. Es decorativo (`aria-hidden`) y solo se usa cuando el orden también se dice en texto. Hoy ninguna pantalla numera pasos: el carril y su recorrido nombran las herramientas.

## Layout

Pantalla completa. El margen lateral es `lado` (`clamp(20px, 4.4vw, 64px)`) y el contenido usa una rejilla de 12 columnas con medianil de 24 px. La portada ocupa el alto de la ventana menos la barra: titular en columnas 1-5, escenario en 6-12 cruzando hacia el centro. Las secciones respiran con `seccion` y `seccion-compacta` de padding vertical; entre dos secciones queda la suma de ambos, unos 130-220px. Más que eso, con fondos casi iguales, se lee como un hueco y no como una pausa.

Las cabeceras son anchas y asimétricas: «Tres formas de recorrer una técnica.» en 6/3/3 columnas (título, texto, recorrido); el catálogo en 6 + enlace (título en 1-6, «Ver todas las técnicas» al final de la fila). Las secciones con titular lateral siguen una sola regla (ver abajo): investigación (titular y conclusiones en 1-5, espiral en 6-12 saliendo por el borde derecho), perfiles (encabezado en 1-5, Estudiantes y Docentes en lista en 7-12), preguntas (encabezado en 1-5, grupos expandibles en 7-12) y la página del catálogo (titular y filtro en 1-5, buscador y lista en 7-12). Las herramientas se recorren de lado a lado: en escritorio la sección queda fija bajo la barra y el carril se traslada horizontalmente con el scroll, con tres trazos de progreso de 3 px; en celular el carril es un desplazamiento horizontal con `scroll-snap` y tarjetas de 82vw. El detalle de técnica es una aplicación: `columna-tecnicas` fija a la izquierda (240px en tableta) y el panel de la técnica a la derecha, con padding lateral `clamp(24px, 3vw, 48px)`; cada hoja de pestañas cabe en 1440 × 900.

Las listas paralelas del mismo tipo van en columnas iguales, sin tarjeta, separadas por filete vertical: cinco especialidades (tres en tableta), el instrumental del detalle (tres columnas) y las columnas del pie (marca a 1.6 fracciones más cuatro columnas). Los desplegables de la barra usan la rejilla de 12: nombre en 1-3, opciones en 4-8, vista previa en 9-12. En celular las especialidades pasan a una fila horizontal con `scroll-snap` de 74vw.

Puntos de corte: **960 px** (los menús de la barra pasan al botón de menú y al panel a pantalla completa, porque los cuatro menús, Ingresar y Crear cuenta ya no caben en una línea), **1100 px** (tableta: todo a columna completa, escenario cuadrado, herramienta en una columna de hasta 760px, filtro del catálogo en 1-4 y lista en 5-12, leyenda del detalle bajo la mesa) y **760 px** (celular: barra de 64px con menú a pantalla completa, selector a tres botones iguales, riel bajo la mesa, leyenda a una columna, carriles con `scroll-snap`, filtro del catálogo en chips, columna de técnicas plegada, pie a dos columnas).

**The Titular Lateral Rule.** Cuando el titular va al costado del contenido, ocupa las columnas 1-5, la 6 queda libre como respiro y el contenido va en 7-12 (la espiral, por ser figura, puede empezar en la 6). La misma línea vertical se repite en toda la página, como en las páginas de producto de Apple.

**The Sin Columna Central Rule.** Nada se centra en una columna angosta con vacíos a los lados. El ancho de la ventana es el lienzo.

**The Columnas Iguales Solo Para Pares Rule.** Los repartos iguales son solo para listas del mismo tipo (especialidades, instrumental, columnas del pie), reguladas por filetes. Las composiciones de cabecera y contenido llevan pesos desiguales.

## Elevation & Depth

Sistema plano con objetos que sí tienen cuerpo. La interfaz se ordena con filetes de 1 px y capas tonales (`fondo`, `superficie`, `noche`, `noche-2`); las sombras son neutras (tinta petróleo `rgba(10, 27, 34, …)` o casi negra) y difusas, con offset negativo de spread para que se queden pegadas al objeto. La profundidad real la dan la funda (con su canto `#0e463c` a -16px en Z y la inclinación 3D `rotateX(44deg) rotateZ(-28deg)`) y las piezas de acero con doble `drop-shadow`.

### Shadow Vocabulary
- **Botón en reposo** (`box-shadow: inset 0 1px 0 rgba(255,255,255,.14), 0 1px 2px rgba(10,27,34,.25)`): botón primario.
- **Botón al pasar** (`box-shadow: inset 0 1px 0 rgba(255,255,255,.14), 0 8px 16px -10px rgba(10,27,34,.5)`): con `translateY(-1px)`.
- **Escenario** (`box-shadow: 0 1px 2px rgba(10,27,34,.05), 0 16px 32px -24px rgba(10,27,34,.3)`): el contenedor del héroe.
- **Desplegable** (`box-shadow: 0 24px 40px -32px rgba(10,27,34,.4)`): los cuatro paneles de la barra.
- **Buscador** (`box-shadow: inset 0 0 0 1px var(--filete-2), 0 10px 24px -18px rgba(10,27,34,.35)`): el campo del catálogo; al enfocar, el filete pasa a `inset 0 0 0 2px var(--marca)`.
- **Funda** (`box-shadow: 0 1px 2px rgba(0,0,0,.25), 0 28px 50px -22px rgba(10,27,34,.55)`): el objeto paño.
- **Pieza de acero** (`filter: drop-shadow(0 2px 1.4px rgba(3,20,28,.6)) drop-shadow(0 6px 8px rgba(3,20,28,.22))`): cada instrumento; al marcarla sube a `drop-shadow(0 12px 8px rgba(3,20,28,.4))` con `translate(-2px, -6px)`.
- **Pieza en diagrama** (`filter: drop-shadow(0 1px 1px rgba(3,20,28,.22)) drop-shadow(0 4px 6px rgba(3,20,28,.08))`): el instrumental en la mesa del detalle; al señalarla, `drop-shadow(0 18px 10px rgba(3,20,28,.45))` con `translate(-3px, -12px)`.
- **Panel flotante** (`box-shadow: 0 12px 30px -16px rgba(10,27,34,.45)`): la leyenda «Ver las 10 piezas».

### Named Rules
**The Sombra Neutra Rule.** Toda sombra es tinta neutra difusa. Sin sombras de color, sin brillos (`glow`), sin sombras duras desplazadas. El barrido de la cámara es un instrumento de escaneo, no un brillo decorativo.

**The El Objeto Pesa Rule.** La elevación fuerte es de los objetos dibujados (funda, piezas, riel) y de lo que se superpone (desplegables, leyenda). Las tarjetas de interfaz se bordean con filete (`inset 0 0 0 1px`), no se levantan.

## Shapes

Esquinas suaves y técnicas, escaladas por tamaño del contenedor: 6px en filas de la maqueta, 8px en ítems de la barra, filas de leyenda y técnicas de la columna lateral, 9px en controles pequeños de 30-34px (cerrar, enviar, botón del pie de cámara), 10px en botones, pestañas del selector, opciones del filtro y su placa, 12px en botón grande, funda y botón de cuenta, 14px en el selector, el buscador del catálogo, la leyenda flotante, el diagrama de mesa, la tarjeta «Para qué sirve» y el recuadro «Sin mesa», 16px en ventanas de producto, vistas previas de los desplegables y la tarjeta de la puerta de cuenta, 20px en el escenario en celular, 24px en el escenario y en los pictogramas de perfiles; píldora (99px) en sugerencias del chat, logros de la espiral y chips del filtro en celular. Los trazos de progreso redondean a la mitad de su grosor: 2px en el del selector, 3px en los del recorrido. Las líneas son filetes de 1 px; las listas se ordenan con filete arriba de cada fila y uno al cierre, y las listas del catálogo abren con un filete de 2px en `tinta` (las preguntas, con uno de 1px). Las pestañas del detalle se marcan con una raya de 2px en `tinta`. Los números de la mesa van en círculos `rgba(6,18,23,.72)`. Los visores de cámara son esquinas en L de 30px con trazo de 2px. Las burbujas de chat recortan a 4px la esquina del lado que habla.

## Components

### Buttons
Firmes y clínicos: verde lleno, sin adornos, con una flecha que avanza al pasar.
- **Shape:** esquinas suaves (10px; 12px en el grande).
- **Primary:** `marca` con texto blanco, 650, 42px de alto y 18px de padding; el grande mide 56px, 26px de padding y 17px.
- **Hover / Focus:** pasa a `marca-hondo`, sube 1px y la flecha se desplaza 3px (`.35s` en `expo`). Foco: contorno `marca` de 2.5px a 3px de distancia.
- **Suave:** `marca-claro` con texto `marca-hondo`, sin sombra, del tamaño del primario («Ver en 3D», «Ver todas las técnicas» del estado vacío); 38px y 14px para «Ver las 10 piezas»; hover `marca-claro-hover`.
- **Fantasma:** Ingresar y «Ya tengo cuenta»: sin fondo, 40px, 8px de radio, texto `tinta-2` 600; hover `hover-neutro`.
- **Con etiqueta de módulo:** las acciones del detalle llevan tras el verbo el nombre del módulo en 13px 500 («Ver en 3D SIMIQ3D», «Comprobar con la cámara SIVRI»): `marca-hondo` sobre el suave, `marca-claro-hover` sobre el verde.
- **Claro:** blanco con texto `marca-hondo`, sin sombra, solo sobre fondos verdes; hover `marca-claro`. Ninguna pantalla actual lo usa.
- **Ícono pequeño:** 34px, `fondo`, 9px (cerrar la leyenda).
- **Enlace con flecha:** texto `marca` 650 con flecha SVG de 16px; en capítulos oscuros, `menta`.

### Chips
- **Etiqueta «demostración»:** Martian Mono 12.5px en `tinta-3` (`niebla-noche` sobre noche), sin fondo ni borde. Marca todo dato ilustrativo; junto al nombre de una técnica plantilla va en línea tras el titular.
- **Filtro en celular:** píldoras de 40px con filete interior `filete-2`, 15px; la elegida en `marca` lleno con texto blanco.
- **Sugerencias del chat:** píldora `fondo`, 13px, solo dentro de la maqueta de SIMIQ3D.

### Cards / Containers
- **Corner Style:** 14px (diagrama, «Para qué sirve», «Sin mesa»), 16px (ventanas, vistas previas, aviso), 24px (escenario).
- **Background:** `superficie` sobre `fondo`; `noche-2` sobre `noche`.
- **Shadow Strategy:** filete interior de 1px; ver Elevation & Depth.
- **Border:** `filete` / `filete-noche`.
- **Internal Padding:** 18-26px.
- **Ventana de producto:** barra de 44px blanca con tres puntos `filete-2`, nombre en 650 y «demostración» a la derecha; dentro, la maqueta de la interfaz del producto. La de SIVRI es oscura (`noche-2`) con pie de conteos.
- **Listas de capacidades:** filas reguladas por filetes de 1px, 16px, sin íconos ni viñetas.

### Inputs / Fields
- **Buscador del catálogo:** 60px, `superficie`, 14px de radio, filete interior `filete-2` y sombra de buscador; lupa de 20px en `tinta-3` a 20px del borde; texto 17px. Foco: filete interior de 2px en `marca`, sin contorno exterior. Al escribir aparece a la derecha un botón limpiar de 40px que al pasar toma `hover-neutro`.
- **Buscador de la columna de técnicas:** 42px, `fondo`, 10px de radio, filete interior `filete`, 15px; foco igual, 2px en `marca`.

### Navigation
- **Barra:** fija arriba, 72px (64px en celular), fondo `fondo` con filete inferior. Marca: un cuadrado de 30px y 8px de radio en `marca` con rejilla blanca, más «IQ Platform» 700 a 19px; a la izquierda cuatro categorías con flecha: Herramientas, Especialidades, ¿Por qué IQ Platform?, Ayuda; a la derecha Ingresar y Crear cuenta. Con sesión iniciada, en su lugar va «Mi cuenta»: avatar redondo de 32px en `marca-claro` con su ícono en `marca-hondo`, 44px de alto y 12px de radio.
- **Ítems:** 15.5px 550 en `tinta-2`, 40px de alto, 8px de radio; hover y abierto con `hover-neutro` y `tinta`. La flecha gira 180° al abrir. La sección actual («Especialidades» en el catálogo y el detalle) lleva `aria-current` y texto `marca-hondo` 650.
- **Comportamiento de los botones de la barra:** un clic abre su desplegable; un segundo clic sobre el mismo botón, con el desplegable abierto, lleva a la página de la sección (Especialidades → catálogo). El desplegable de Especialidades ofrece «Ver todas las técnicas» bajo su descripción, y cada especialidad abre el catálogo ya filtrado; lo mismo en el menú del celular y en el pie.
- **Desplegables:** un solo panel abierto a la vez, a todo el ancho bajo la barra (`fondo`, filete inferior y sombra de desplegable), entra bajando 8px en `.4s expo`; se cierra con Escape, al hacer clic fuera o al elegir un enlace. En la rejilla de 12: a la izquierda (1-3) el nombre del menú (headline de panel), una línea `tinta-3` de 26ch y, si corresponde, un enlace con flecha; al centro (4-8) las opciones como filas reguladas por filete, con título de 20px 650 y una línea `tinta-3` de 15px, que al pasar se corren 12px, pasan a `marca` y muestran su flecha; a la derecha (9-12) una vista previa que responde a la opción señalada.
  - *Herramientas:* DataIQ, SIMIQ3D y SIVRI; la vista previa es el pictograma de la herramienta señalada (96px, recuadro `marca-claro` de 24px de radio con dibujo de línea en `tinta` y acento `marca`: documento con lista, cubo y visor de cámara) junto a su nombre y sus tres capacidades en filas con filete. No repite la mesa del inicio.
  - *Especialidades:* las cinco especialidades; la vista previa lista las técnicas reales de la señalada.
  - *¿Por qué IQ Platform?* y *Ayuda:* tres opciones cada uno; la vista previa es una frase en una tarjeta `marca-claro` con texto `marca-hondo` y el final en `marca` (title) o la lista «Lo más preguntado».
- **Celular:** el botón de menú (44px) abre un panel `superficie` a pantalla completa con grupos plegables (`details`, filete inferior, flecha que gira) y, al final, Crear cuenta gratis (botón grande) e Ingresar (enmarcado con filete).
- **Pie:** oscuro (`noche`), marca y frase en 1.6 fracciones y cuatro columnas: Herramientas, Especialidades, ¿Por qué IQ Platform?, Ayuda.

### Escenario de la mesa (firma)
La misma mesa en tres vistas, dentro de un contenedor de 24px con degradado blanco a `#eef3f4`.
- **Selector Referencia · 3D · Cámara:** pestañas de 46px sobre un carril tintado; la seleccionada es blanca. Cambia sola cada 5.5s con un trazo de progreso de 2px bajo la pestaña activa; se pausa al pasar el puntero y se detiene al interactuar. Con movimiento reducido no corre.
- **Funda:** cuadrada, `pano` con `--tela`, borde interior blanco al 20% y rejilla de celdas; las piezas de acero en sus posiciones reales, con su número en un círculo oscuro. Tocar una pieza la marca (número en blanco).
- **3D:** la funda se inclina; piezas a escala 1.3 y números a 1.55 para que sigan legibles.
- **Cámara:** el escenario pasa a noche, la funda se desatura, aparecen esquinas de visor, un barrido menta y cajas de detección que se trazan una a una; una pieza aparece fuera de lugar en rojo con su destino «Va aquí». Las etiquetas evitan chocar entre sí y con «Va aquí»; en celular muestran solo el nombre, más grandes.
- **Riel:** la pieza elegida en acero a gran escala, con número (número del riel) y nombre. No muestra el texto crudo de la fuente: la web no habla de dónde salen los datos.
- **«Ver las 10 piezas»:** leyenda superpuesta sobre la mesa, a dos columnas.

### Carril «Tres formas de recorrer una técnica»
Tres herramientas de lado a lado (DataIQ, SIMIQ3D, SIVRI). Cada una lleva su nombre (headline de producto), el lema, capacidades reguladas, enlace con flecha («Conocer DataIQ») y su ventana; separadas por filete vertical y 48px. El recorrido de la cabecera repite los nombres con su trazo de progreso.

### Catálogo por especialidad
Cinco columnas abiertas por un filete de 2px `tinta`; cada una con su nombre (title de columna) y sus técnicas como filas-botón de 15.5px en `tinta-2`, con filete superior y 11px de padding. Al pasar o al tocar, la fila pasa a `marca` y aparece una flecha que entra 4px. Tocar una técnica abre su detalle (los datos clínicos son libres).

### Puerta de cuenta (detalle sin sesión)
Sin sesión, el detalle de una técnica deja ver los datos clínicos completos; el instrumental y las mesas piden cuenta en su propia pestaña, después de mostrar un vistazo real (registro diferido: primero el valor, luego la cuenta). Las pestañas Instrumental, Mesa de Mayo y Mesa de reserva llevan un candado de 13px en `tinta-3`. Instrumental muestra sus dos primeras filas de instrumentos reales, difuminadas hacia abajo (la misma máscara que las mesas), y debajo la tarjeta. Cada mesa sigue el mismo estilo: la mesa (centrada, con celdas de 104px en toda técnica, así que mide según sus columnas) se recorta a sus primeras dos filas y media, sin números ni leyenda, se difumina hacia abajo y la tarjeta va debajo, centrada, sin tapar nada; el título de la mesa no se repite, porque ya lo dice la pestaña. «Ver en 3D» y «Comprobar con la cámara» también llevan a la cuenta. Sin sesión nunca se dice si una técnica no tiene una mesa: se muestra una cuadrícula vacía con la misma puerta, y el texto de la tarjeta no promete contenido («Con una cuenta gratuita se abre la mesa de Mayo de esta técnica.»). La tarjeta: `superficie` con anillo `filete` y sombra suave, radio 16, candado en círculo `marca-claro` de 44px, título de 18px 650 («Ver la mesa de Mayo»), una línea `tinta-2` de lo que abre la cuenta, «Crear cuenta gratis» (`boton` a todo el ancho) y «Ya tengo cuenta» en `marca`; ambos llevan a la cuenta con la técnica, y al ingresar se vuelve a ella. La barra muestra Ingresar y Crear cuenta en lugar de «Mi cuenta», y no aparece «Editar técnica». Sin paño difuminado: el vistazo es real y se dice qué falta.

### Catálogo de técnicas (página)
Regla Titular Lateral: titular «Técnicas» y filtro de especialidades en 1-5, buscador y lista en 7-12, separados por el filete de 2px en `tinta`. El buscador es un campo de 60px en `superficie` con filete interior `filete-2` y foco de 2px en `marca`. El filtro («Todas» y las cinco especialidades) queda fijo al hacer scroll; la elegida se marca con una placa `marca-claro` que se desliza tras ella (`.45s expo`) y texto `marca-hondo` 650, nunca con un filete lateral de color. La lista agrupa por especialidad con encabezados fijos de 24px; cada técnica es una fila de 17px con filete superior, que al señalar pasa a `marca`, se corre 10px y muestra su flecha. Al buscar, la lista se reordena con FLIP y la coincidencia se resalta en `marca-claro` sin importar tildes. Tocar una técnica abre su detalle (`tecnica.html#v-<slug>` sin sesión); el estado vacío nombra la búsqueda y ofrece «Ver todas las técnicas». En celular el filtro pasa a chips con desplazamiento horizontal (el elegido en `marca` lleno). En la barra, «Especialidades» lleva `aria-current` y texto `marca-hondo` 650.

### Ingresar / Crear cuenta (página)
La puerta del shell: una sola pantalla con las pestañas Ingresar y Crear cuenta (raya de 2px en `tinta` que se desliza, como en el detalle). Mitad izquierda (columnas 1-6) sobre `fondo` con la técnica que se quería abrir: ruta, nombre a 40px, especialidad y una vista bloqueada en `superficie` con filete (sus pestañas atenuadas, barras `filete` y un candado en círculo `marca-claro` con la frase de lo que abre la cuenta, sobre un degradado blanco). La vista bloqueada muestra siempre sus cuatro pestañas y dice «Con una cuenta gratuita se abre todo el detalle de esta técnica.»: nunca revela si a la técnica le falta una mesa. Sin técnica (ingreso directo desde la barra) no hay nada bloqueado: la izquierda muestra un saludo según la hora («Buenos días.», «Buenas tardes.», «Buenas noches.») a la escala del titular de portada, sin línea debajo: «Buenos días.» al ingresar y «Mucho gusto.» al crear cuenta. Debajo del saludo de Ingresar va una ilustración plana de hasta 560px, dibujada en SVG (pedida por el usuario, en el estilo de unDraw: figuras sin rostro, planos sin trazo y un solo acento): una instrumentadora con bata `marca`, gorro #2f8f7b, mascarilla y guantes, que toma una pieza de la mesa de Mayo (paño en tonos de `pano`, poste y base en acero) bajo la lámpara cielítica, sobre una mancha #e3efec y con una insignia `marca` de verificación. Debajo de «Mucho gusto.», la de Crear cuenta, con el mismo trazo y la misma mancha: una estudiante en pijama quirúrgica `marca`, con el cabello recogido y una tablet en la mano, toca la ficha de un instrumento en una pantalla de la app (ventana blanca con tres puntos `filete-2`, una mesa en cuadrícula sobre `pano` con instrumental en trazo claro y una celda «va aquí» en `marca-claro` con borde punteado `marca`, la ficha en `marca-claro` y una barra de progreso); arriba, un anillo de progreso `marca`, y a sus pies, tres libros. Ninguna nombra un módulo. En celular las ilustraciones no se muestran. Al tocar Crear cuenta, las mitades cambian de lado en un solo movimiento (FLIP, 700ms `expo`): el formulario pasa a las columnas 1-6 y el saludo a las 7-12, con el filete al otro lado. Volver a Ingresar devuelve las mitades. Ingresar vuelve a la técnica de la que se venía, o al catálogo si se entró directo. Mitad derecha (7-12) en `superficie` con filete a la izquierda: título de 26px, pestañas, «Continuar con Google» (48px, filete `filete-2`, logo de Google con sus colores oficiales) con la nota «Admite cuentas personales e institucionales.», separador «o con correo y contraseña» y el formulario de 420px: campos de 48px con etiqueta de 14px 600 en `tinta-2`, filete `filete-2` y foco de 2px en `marca`; contraseña con «Mostrar»; «¿Olvidaste tu contraseña?» 14px en `marca`; casilla de la política con el enlace en `marca`. Las dos columnas se anclan arriba en la misma línea, así que al cambiar de pestaña solo se mueve la raya. La aceptación de la política es lo único que no se salta: sin ella, «Crear cuenta gratis» muestra el error en `tinta` 600 con ícono de alerta (no en rojo: el rojo es de la cámara). En celular las mitades se apilan, la vista bloqueada se reemplaza por una línea con el candado y el formulario va debajo; en el ingreso directo no hay cambio de lado: queda solo el saludo.

### Detalle de técnica (página)
La ventana de DataIQ a pantalla completa, vista con sesión iniciada (la barra cambia Ingresar y Crear cuenta por «Mi cuenta», con avatar `marca-claro`). A la izquierda, una columna `superficie` de 300px, fija al hacer scroll, con buscador y las técnicas agrupadas por especialidad (encabezados de 13px en `tinta-3`; la actual en `marca-claro` con texto `marca-hondo` 650). A la derecha, sobre `fondo`, el nombre de la técnica a 40px con su especialidad y las acciones «Ver en 3D» (`boton suave`) y «Comprobar con la cámara» (`boton`), cada una con la etiqueta de su módulo en 13px (`marca-hondo` sobre el suave, `marca-claro-hover` sobre el verde). Debajo, pestañas Datos clínicos, Instrumental, Mesa de Mayo y Mesa de reserva sobre un filete, con una raya de 2px en `tinta` que se desliza bajo la elegida (`.45s expo`); cada hoja cabe en 1440 × 900. Datos clínicos: a la izquierda «Para qué sirve» en una tarjeta `superficie` con filete (texto de muestra marcado «demostración» mientras no haya fuente) y las fichas Anestesia, Ropa, Posición del paciente y Equipos biomédicos; a la derecha las suturas por plano (plano en 600 `tinta-2`, sutura en `tinta`) y el equipo médico-quirúrgico. Instrumental: lista en tres columnas reguladas por filete. En esta página la mesa es un diagrama sereno, no el objeto firma: fondo `superficie` con filete, rejilla `filete` de 1px, sin paño ni tela, sombras suaves y entrada rápida (.35s, 25ms entre piezas); ocupa como máximo el 46 % del ancho. Cada mesa va con su título, indicación y leyenda a la derecha; leyenda y mesa están enlazadas: señalar un número levanta su pieza (`translate(-3px,-12px)` y sombra) y atenúa el dibujo de las demás (38 % el acero, 55 % la tela de la reserva), nunca sus números. La fila señalada de la leyenda toma `marca-claro` y su número pasa a un círculo `marca`; un número que la fuente no deja leer queda como hueco «Sin dato», con el círculo vacío en filete `filete-2` y texto `tinta-3`. La columna de técnicas navega entre técnicas sin salir de la página (la técnica va en el hash). Con sesión de colaborador, junto a las acciones de los módulos va «Editar técnica» (42px, anillo `filete-2`, lápiz); si la técnica ya tiene una versión en curso dice «Continuar borrador», o «Ver versión en revisión» con un reloj, y lleva a Mis borradores. Con sesión de usuario (sin rol de gestión) no hay «Editar técnica» y Mi cuenta solo muestra quién es y «Cerrar sesión». Para un revisor o admin, la versión en curso de otra persona no se abre: «Revisar versión 2» con el reloj lleva a Por revisar si está en revisión, y «En curso por …» queda inerte (texto `tinta-3`, anillo `filete`, sin ícono) si está en borrador. Tras publicar lo propio, bajo la especialidad aparece una sola vez «Versión 2 publicada hace un momento. La versión 1 quedó en el historial.» en `marca-hondo` 600, con el visto `marca` que se traza (.5s `expo`) y un lavado `marca-claro` que se apaga en 1,2s. Para un revisor o admin, junto a «Editar técnica» va «Más acciones» (42px, anillo `filete-2`, tres puntos), que abre un panel de 320px como el de Mi cuenta con «Archivar técnica» (ícono de caja); con una versión en curso la opción queda en `tinta-3` con «No se puede mientras tenga una versión en curso.». Archivar se confirma en el mismo panel (qué deja de verse y que las versiones quedan en el historial; «Archivar» `boton`, «Cancelar» `boton suave`). Una técnica archivada pierde Editar y los módulos, y bajo la especialidad muestra «Técnica archivada…» en una pastilla `fondo` con anillo `filete-2` y la caja, con el lavado `marca-claro` una sola vez, y recibe el foco. En la columna de técnicas la archivada pasa a `tinta-3` con la pastilla «Archivada» (anillo `filete-2`, 12px), y en el selector de celular suma « · archivada». El ítem bloqueado sigue siendo enfocable (`aria-disabled`) para que su motivo se lea con teclado. En celular «Más acciones» va junto a Editar y el panel ocupa el ancho. Cada mesa toma la proporción de su cuadrícula; si una técnica no tiene una de sus mesas, la pestaña muestra «Sin mesa de Mayo» o «Sin mesa de reserva» en un recuadro con filete `filete-2`. Una técnica sin datos se muestra como plantilla: barras `filete` en lugar de texto y la marca «demostración» junto al nombre. Los números van en la esquina libre de cada celda y el dibujo se separa del borde del paño. Los números se reescalan con la mesa para conservar el mismo tamaño en pantalla a cualquier ancho. La mesa de reserva dibuja cada objeto en sus celdas reales: instrumental en acero y el resto en plano, sin tela; un objeto en dos celdas es uno solo, con un número. En tableta la leyenda pasa debajo de la mesa, a dos columnas; en celular la columna de técnicas se pliega en un selector y las pestañas se desplazan con los bordes desvanecidos.

### Mi cuenta (menú)
Con sesión iniciada, la barra cambia Ingresar y Crear cuenta por el botón «Mi cuenta»: avatar `marca-claro` de 32px con las iniciales en `marca-hondo` 700, el texto y una flecha que gira al abrir. Abre un panel de 300px anclado a la derecha bajo la barra, en `superficie` con radio 16, un anillo de 1px `filete` y sombra suave (`0 16px 24px -14px`). Arriba, quién es: avatar de 44px, nombre en 650, correo en `tinta-3` y el rol en pastilla `marca-claro`. Debajo, «Gestión de DataIQ» (13px `tinta-3`) y los accesos que el rol permite, cada uno con su cifra tabular; el de la página actual en `marca-claro`. Al final, separado por filete, «Cerrar sesión» con su ícono. La gestión entra solo por aquí; la barra no suma botones. En celular el avatar abre el mismo panel a todo el ancho, y el menú completo repite nombre, rol, todos los accesos de gestión del rol y Cerrar sesión. La identidad se conserva al navegar entre pantallas de gestión.

### Mis borradores (página)
La primera pantalla de gestión, una matriz de avance sobre `fondo`. Arriba, «Mis borradores» a 40px con la marca «demostración», una línea de conteo en `tinta-2` y, a la derecha, «Editar una publicada» (`boton suave`) y «Nueva técnica» (`boton` con un + que gira al pasar). «Editar una publicada» abre un buscador de 380px (mismo panel que Mi cuenta) con las técnicas agrupadas por especialidad; las que ya tienen una versión en curso salen atenuadas con «Ya está en curso», porque cada técnica tiene una sola. Debajo, los filtros Todas / Devueltas / Borradores / En revisión con su cifra, en un control segmentado con la placa `marca-claro` que se desliza (`.45s expo`), y a la derecha la leyenda de las marcas. La tabla va en `superficie` con filete y radio 16: Técnica (nombre 17px 650, especialidad y versión en `tinta-3`), Estado, Editada y una columna por sección (Datos clínicos, Instrumental, Mesa de Mayo, Mesa de reserva) separadas por filete, con la acción al final («Continuar», o «Ver» si está en revisión). Estado en pastilla con ícono: Borrador con anillo `filete-2`, En revisión en `marca-claro`, Devuelta en `tinta` con texto blanco (nunca rojo). Las marcas de sección son círculos de 22px: completa, llena en `marca` con visto blanco; en curso, medio llena; pendiente, solo el anillo `filete-2`; la técnica que no tiene esa mesa, una raya `tinta-3`. Al cargar se trazan columna por columna (90ms entre columnas, 45ms entre filas). La fila devuelta lleva «Comentario de la revisión» y, debajo, la nota en `fondo` con radio 12 (fecha y sección a la que apunta), que se despliega al terminar el trazado; la celda de esa sección se señala en `marca-claro`. Por debajo de 1180px la fecha pasa bajo el estado y las secciones se angostan a 88px. Para quien publica lo suyo (revisor o admin) la página no tiene filtros, porque nunca tiene versiones devueltas ni en revisión: el conteo dice «1 técnica en curso. Se publica al terminarla, sin pasar por revisión.», y sin nada en curso la leyenda y la tabla se van y queda una tarjeta `superficie` (radio 16, anillo `filete`) con un visto `marca` y lo último que pasó («La versión 2 de Colecistectomía ya está publicada.»); en su buscador, las versiones ajenas dicen «En curso por …» bajo el nombre, en `tinta-3`. En celular cada técnica es una tarjeta: nombre, estado y fecha, las cuatro marcas con su rótulo, el comentario y «Continuar» al final; los filtros pasan a chips de 40px que se desplazan, el elegido en `marca` lleno.

### Editor de técnica (página)
Un asistente de cinco pasos sobre `fondo`: Datos clínicos, Instrumental, Mesa de Mayo, Mesa de reserva y Revisar y enviar (Revisar y publicar para un revisor o admin). Arriba, la ruta «‹ Mis borradores», el nombre de la técnica a 40px con «demostración», la especialidad y versión con la pastilla de estado, y a la derecha el autoguardado («Guardando…» con un giro `marca`, luego «Guardado hace un momento» con visto) y «Ver la versión publicada». No hay botón Guardar. La fila de pasos es una rejilla de cinco columnas separadas por filete: cada paso lleva la marca de 22px de Mis borradores (completa, en curso o pendiente; el último, candado mientras falte algo y flecha cuando está listo), su número en `tinta-3`, el nombre en 600 (650 el abierto) y lo que falta en 14px `tinta-3`. Bajo el abierto se desliza la raya de 2px en `tinta`. Cuando un paso cambia de estado, su marca se traza de nuevo, partiendo siempre visible. Cada paso abre con su título a 26px y una línea en `tinta-3`; el contenido va en tarjetas `superficie` con anillo de 1px y radio 16. Campos de 48px con anillo `filete-2` y foco de 2px en `marca`; los obligatorios vacíos llevan la pastilla «Falta» y los demás «Opcional». Las listas editables (equipos, equipo médico-quirúrgico, suturas por plano) tienen un botón de quitar de 28px y «Agregar» con contorno punteado `filete-2`. El paso de instrumental se arma como una lista de reproducción, todo a la vista en un bloque del alto de la ventana (entre 460 y 760px), cada lista con su propio desplazamiento. A la derecha (4 columnas), «En esta técnica» con su cifra y lo elegido agrupado por tipo (nombre del tipo en 13px `tinta-3` sobre filete, filas de 40px con su botón de quitar; lo recién agregado se ilumina en `marca-claro` y se apaga). A la izquierda (8 columnas), como en la lista doble estándar (origen a la izquierda, lo elegido a la derecha), una sola tarjeta: arriba «Sugeridos para Cirugía general», lo que usan las otras técnicas de la especialidad y esta no tiene, como chips `marca-claro` de 34px con + y tres puntos que marcan cuántas técnicas lo usan (`marca` llenos), ocho a la vista y «Ver n más»; debajo, separado por filete, «Explorar el catálogo» con buscador, chips por tipo con su cifra en una fila que se desliza (el elegido lleno en `marca`) y el catálogo completo de DataIQ por categoría: encabezados fijos al desplazar, filas de 44px con «+ Agregar» en `marca` o con visto y «En la técnica», y lo buscado resaltado en `marca-claro`. Así se puede reconocer un instrumento leyéndolo, sin saber su nombre. El selector de catálogo, compacto (filas de 36px, lista de 300px), se abre bajo «Agregar objeto» en las mesas, en un panel `superficie` con «Listo»; en la mesa de reserva suma «Más usados en mesas de reserva»: chips de 34px con anillo `filete-2` (compresa, paquete de ropa, portaagujas, pinza de Foerster, bandeja, gasa, pinza de campo, por cuántas técnicas los usan), que pasan a `marca-claro` con visto al agregarlos. Los objetos planos que se agregan (ropa, compresas, bandeja, caucho) se dibujan planos y los que no tienen dibujo, con un contorno punteado. La mesa es la misma del detalle (rejilla `filete`, acero, números en círculo de 24px en pantalla a cualquier ancho), con una capa de celdas encima. Con ratón se arrastra un objeto de la lista o de la mesa a su celda; la celda de destino se pinta `marca-claro` con borde `marca`, y la pieza se asienta al soltarla (`.55s expo`). Al tocar, se elige un objeto y luego su celda, o se toca la celda y se elige en un panel de 300px qué va ahí: cada opción con su lugar actual y las sin ubicar primero, más «Vaciar celda». La lista de objetos (número en círculo, nombre y «Fila · Columna» o «Sin ubicar» en `tinta-2`) y la mesa forman un bloque fijo al desplazar, con la mesa limitada por el alto de la ventana. Arriba de la mesa, un contador de filas y columnas con − y + dibujados. Una mesa que la técnica no lleva se declara con una casilla («Esta técnica no lleva mesa de reserva») y cuenta como completa. En Revisar y enviar, a la izquierda, el resumen de las cuatro secciones con su marca y «Completar» en las que faltan. A la derecha, la nota para el revisor y «Enviar a revisión», bloqueado (`filete` con texto `tinta-2`) mientras falte algo, con el motivo en una nota `fondo` con candado. Un revisor o admin publica lo suyo sin revisión: el paso se llama «Revisar y publicar», la nota es «Nota de la versión» y el botón «Publicar versión 2», bloqueado igual. Al tocarlo, el botón cede su lugar a una confirmación dentro de la misma tarjeta, sin modal: panel `fondo` con radio 12 y 16px de padding, que entra con `bajar .3s expo`, dice qué versión pasa a ser la que ven estudiantes, SIVRI y SIMIQ3D, y lleva «Publicar» (`boton`) y «Cancelar» (`boton suave`); debajo, la aclaración de que la anterior queda como reemplazada en el historial. Publicar lleva al detalle de la técnica. «Nueva técnica» abre el mismo editor para una técnica que aún no existe: título «Técnica nueva» (cambia con lo que se escribe), «Versión 1», sin «Ver la versión publicada» y con «Sin cambios todavía» en el autoguardado; Datos clínicos empieza con Nombre de la técnica y Especialidad lado a lado (obligatorios, separados de la Descripción por un filete); todo lo demás arranca vacío, la mesa de Mayo en 4 × 6 y la reserva por armar; la Especialidad es un selector con la flecha de la casa (sin la nativa) y su texto vacío en `tinta-2`; los sugeridos explican que aparecen con la especialidad y toman su nombre al elegirla; el autoguardado no lleva visto mientras no haya cambios. Todos los obligatorios llevan «Falta», también Anestesia, Ropa, Posición del paciente y Suturas por plano. Quien publica lo suyo ve «Publicar versión 1» y una confirmación que dice que la técnica entra al catálogo; al volver a Mis borradores, una constancia «… se publicó y ya está en el catálogo.» en `marca-hondo` con visto y el lavado `marca-claro` una vez. Abajo, una barra fija `superficie` translúcida con desenfoque: «Paso n de 5 · nombre», «Anterior» (`boton suave`) y «Siguiente: …». Por debajo de 1100px los datos clínicos y el resumen pasan a una columna y la instrucción de la mesa ofrece solo tocar; en celular los pasos son una tira que se desplaza hasta el abierto, la mesa va sobre la lista y los botones de la barra fija ocupan todo el ancho.

### Versiones por revisar (página)
Pantalla del revisor, en dos vistas. **Lista:** «Por revisar» a 40px con la marca «demostración» y una línea que dice cuántas esperan y cuánto lleva la más antigua; un control segmentado «Por revisar» / «Revisadas por mí» con su cifra; las versiones en una tarjeta `superficie` con anillo de 1px (dibujado encima de las filas) y radio 16, filas de 20 × 24px con técnica (17px 650, especialidad y versión en `tinta-3`), autor, envío con su espera, tipo («Edición de la publicada» o técnica nueva), chips `marca-claro` de las secciones que cambian, la nota del autor entre comillas (dos líneas) y «Revisar» (`marca`, 40px) en una columna fija de 9.5rem. Las versiones propias del revisor no aparecen: las publica directo desde el editor. Las revisadas llevan la pastilla de su resultado (Devuelta en `tinta`, con ícono). **Revisión:** cabecera en dos columnas, a la izquierda la ruta, el nombre a 40px y «Versión 2 · edición de la publicada · enviada por…», a la derecha «Devolver con comentarios» (`boton suave`, cuenta los comentarios) y «Aprobar y publicar», con la nota del autor debajo en una tarjeta con ícono de mensaje. Pestañas por sección con la raya de 2px y una cifra de cambios en círculo `marca` (o «sin cambios» en `tinta-3`); abre en Mesa de Mayo. Ahí, la publicada y la propuesta lado a lado, cada una con su título a su mismo ancho, y una tercera columna «Cambios»: cada cambio con su número en círculo `marca`, el nombre y «Fila · Columna → Fila · Columna», y «Comentar». En la publicada, la celda de origen con contorno punteado `filete-2`; en la propuesta, la celda nueva con anillo `marca` y tinte, el fantasma punteado del origen y un trayecto `marca` con punta que reposa al 30 % y se traza al señalar el cambio, cuando la pieza se levanta en las dos mesas y el resto se atenúa al 38 %. Las mesas se limitan por el alto de la ventana para que todo quepa en la primera vista. Tocar una celda de la propuesta abre un comentario sobre esa celda, que queda con contorno punteado `marca-hondo`. Datos clínicos: tabla de cuatro columnas (campo, publicada, propuesta, comentar) con lo agregado en tinte `marca` y anillo de 1px al 35 %, rotulado «+ Agregado». Instrumental y reserva sin cambios lo dicen en una franja con visto y muestran el contenido. Los comentarios se ven bajo su sección en `fondo` con radio 12 y su botón de quitar. «Devolver» abre un panel que junta los comentarios por sección y suma una nota general; queda desactivado sin ninguno. «Aprobar y publicar» confirma que la versión anterior pasa a reemplazada. Al decidir, un aviso `tinta` abajo al centro. Nunca rojo. En tableta los cambios pasan bajo las mesas; en celular las mesas se apilan y las pestañas se deslizan con los bordes desvanecidos.

### Catálogo de instrumental (página)
Herramienta de consulta para el revisor, no galería ni tabla de administración: cada instrumento se explica por dónde va. A la izquierda, la columna de 300px del detalle como índice: buscador por nombre o alias y «Nuevo instrumento» (contorno punteado `filete-2`) fijos arriba sobre `superficie`, una línea que explica la cifra («técnicas en que va») y las categorías con su cifra de instrumentos; cada ítem con su cifra de técnicas, el elegido en `marca-claro` y siempre a la vista; al buscar por alias, el alias que coincidió en `tinta-3` bajo el nombre. Al centro, la entrada: ruta «Instrumental › Categoría», nombre a 40px, «En N técnicas · N mesas», «Editar esta entrada» con anillo `filete-2`; descripción (o «Sin descripción todavía» en un recuadro punteado con «Escribir descripción»); «También se escribe así» con los alias en chips `marca-claro`; el dibujo en acero a la derecha solo si la pieza tiene dibujo propio. «Dónde va» (24px) lista por especialidad cada técnica en dos columnas de filas reguladas por filete (una mesa de más de 10 columnas ocupa la fila entera; en tableta y celular, una columna): nombre, «Mesa de Mayo · n.° 4» y la mesa en miniatura al lado, a una sola escala (celdas de 22px, 18px en celular) sobre `fondo`, con las celdas del objeto en `marca` y la primera como círculo con el número; las mesas anchas se desplazan dentro de su marco con borde desvanecido; las celdas se encienden una tras otra al abrir la entrada. Editar no cambia de pantalla: cada bloque se vuelve editable en su sitio (la categoría como selector dentro de la ruta, el nombre como campo de 40px, la descripción como área, los alias como chips con quitar), «Dónde va» queda atenuado al 50 % debajo y una barra fija `superficie` dice en qué técnicas publicadas se verá el cambio, todas por nombre, con «Cancelar» y «Guardar» a la derecha. Nombres o alias que ya son de otro instrumento se avisan («Ya existe «…». Abrir esa entrada») y bloquean Guardar; «Nuevo instrumento» usa el mismo esqueleto y pide elegir la categoría. Nunca se borra.

### Usuarios y roles (página)
Pantalla del admin, con la forma «personas por rol»: los pocos con permisos se ven completos y los muchos usuarios se buscan. Cabecera con el título a 40px, «demostración» y una línea de cifras por rol en `tinta-2`, y a la derecha el control de dos vistas «Personas / Historial de cambios» (placa `marca-claro`). Debajo, un buscador grande (52px, hasta 640px) por nombre o correo en cualquier rol; los resultados salen en un desplegable `superficie` con el tramo que coincide en `mark` `marca-claro` y la pastilla del rol a la derecha. El tablero va en dos partes: cuatro columnas iguales regladas por filete bajo una cabecera de 2px en `tinta` (Admin, Revisores, Colaboradores, Usuarios), cada una con su nombre, su cifra en `tinta-3` y una línea de lo que puede el rol; Admin, Revisores y Colaboradores listan a todos, y Usuarios muestra la cifra a 40px («cuentas con rol Usuario»), su propio buscador, «Rol cambiado ahora» si alguien acaba de llegar y «Registrados recientemente» (cinco, por fecha). Cada persona es una fila con avatar de iniciales `marca-claro`, nombre que puede partirse en dos renglones y correo en `tinta-3` del que solo se recorta la parte local (el dominio siempre se lee); la elegida en `marca-claro`. Una cuenta suspendida no se tacha: el avatar cambia a un ícono de pausa en anillo `filete-2` sobre `fondo` y el nombre pasa a `tinta-3`. A la derecha, la ficha `superficie` fija al desplazar (radio 16, anillo `filete`): avatar de 52px, nombre a 24px, correo; «Rol» como selector segmentado de cuatro con placa `marca-claro` que se desliza; la confirmación aparece en un panel `fondo` debajo del selector, dice qué podrá hacer con el rol nuevo y, para Revisor o Admin, exige una casilla («Verifiqué que es docente o instrumentador titulado.» / «Es parte del equipo operativo del proyecto.») antes de habilitar el botón; «Cuenta» con registro, política de datos aceptada (versión y fecha) y actividad en DataIQ; su historial; y «Suspender la cuenta» (o «Reactivar») con anillo `filete-2` en `tinta`, nunca rojo, y la nota de que suspender no borra datos ni lo publicado. La cuenta propia no puede cambiarse el rol ni suspenderse, y siempre queda al menos un admin. Al cambiar el rol, la fila sale de su columna (opacidad y 16px a la derecha, 280ms `expo`) y entra en la nueva desde 24px arriba con un lavado `marca-claro` que se apaga en 1,2s. El historial ocupa todo el ancho, agrupado por día («Hoy», «Semana pasada»): hora, el cambio con los roles en pastilla y «Por …» en `tinta-3` alineado a la derecha. A ≤1100px las columnas van de a dos y la ficha baja debajo, con «Volver a la lista»; al elegir a alguien la página se desplaza hasta ella. A ≤760px, una columna, y en el historial el autor pasa debajo del cambio.
En la ficha, junto al nombre de una cuenta suspendida va la pastilla «Suspendida» (11.5px 650, `tinta-2`, anillo `filete-2`).

### Investigación
Sección `superficie`. A la izquierda, el titular y tres conclusiones (ícono de línea `marca`, texto `tinta-2` con el inicio en `tinta` 600) separadas por filete, y el enlace con flecha en `marca`. A la derecha, la espiral, sin marco: un pulso `marca-hondo` sube en tres vueltas cada vez más rápidas (velocidad que crece de forma exponencial), los puntos de cada vuelta se encienden en `marca`, el anillo del nivel destella al cerrarla y aparece un logro en píldora `superficie` con filete (Instrumental reconocido, Posiciones memorizadas, Mesa completa, sin errores); al final sale un haz hacia arriba con el logro «Un paso adelante» en `marca`. El pulso lleva un anillo `marca` sin desenfoque y una estela corta translúcida; la espiral completa lleva solo sombra neutra. Detrás, un resplandor verde muy tenue que crece con el avance y motas `marca` que suben. Solo corre en pantalla; con movimiento reducido queda el estado final. En celular los logros van como lista debajo de la espiral.

### Preguntas frecuentes
Secciones expandibles en columnas 7-12, abiertas por un filete de 1px en `tinta`: Cuenta (abierta al cargar), Técnicas y Herramientas. Cada sección es un `details` con su nombre a 24px 650 y una flecha `marca` que gira 180° al abrir (`.4s expo`), cerrado por un filete `filete-2`. Dentro, sus preguntas (17px 600) separadas por filete, cada una con un `+` SVG en `marca` que gira 45° al abrir (`.35s expo`); la respuesta es body `tinta-2` de 16px y hasta 56ch.

### Perfiles
Estudiantes y Docentes como dos filas de lista en columnas 7-12, reguladas por filete arriba de cada una y uno al cierre, con 24px de padding vertical. Cada fila lleva un pictograma de 120px (96px en celular) a la izquierda y, a la derecha, el nombre (24px 650) y una línea `tinta-2` de 16px. El pictograma es un cuadrado `marca-claro` de 24px de radio con hojas blancas trazadas en `tinta` o `marca` y un sello `marca`; al pasar sobre la fila las hojas se abren y el sello gira (`.6s expo`).

### Motion
Curvas propias: `expo` (`cubic-bezier(.16,1,.3,1)`) para entradas, desplazamientos y giros de flechas, `cuarta` (`cubic-bezier(.25,1,.5,1)`) para color y opacidad, `vaiven` (`cubic-bezier(.87,0,.13,1)`) para el barrido y el giro 3D. Una sola coreografía de carga: las líneas del titular suben desde su máscara (escalonadas 70ms), luego entradilla, acciones y escenario, y por último las piezas se colocan sobre la funda una a una (70ms). Fuera de la carga solo se anima lo que responde a una acción: desplegables, puerta de cuenta, placa del filtro, raya de las pestañas, reordenamiento FLIP de la lista, cambio de lado de la página de cuenta, `+` y flechas. Con `prefers-reduced-motion` todo se reduce a un instante y el ciclo automático y el carril fijo se desactivan.

## Do's and Don'ts

### Do:
- **Do** usar la rejilla de 12 columnas con medianil de 24px y margen `lado`, a pantalla completa.
- **Do** dar pesos desiguales a cabecera y contenido (6/3/3, 6 + 5, 4/5/3, 4 + 7); columnas iguales solo para listas paralelas reguladas por filete.
- **Do** dibujar el instrumental en SVG con el degradado de acero y contorno `acero-filo`, en sus posiciones reales de la mesa.
- **Do** usar solo datos reales (la mesa de Mayo de Tiroidectomía, técnicas del catálogo, estudios con autor y año) y marcar todo lo ilustrativo con «demostración» en Martian Mono.
- **Do** ordenar listas con filetes de 1px, sin íconos (la única excepción son las tres conclusiones de la investigación, con íconos de línea en `marca`).
- **Do** alternar `fondo` y `superficie` entre secciones, con fundido solo en los rellenos; oscuro solo en la vista Cámara y el pie.
- **Do** alinear el contenido de las secciones con titular lateral en la columna 7.
- **Do** no revelar sin sesión lo que la técnica tiene o no: toda pestaña cerrada muestra su puerta, con un texto que no promete contenido.
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
