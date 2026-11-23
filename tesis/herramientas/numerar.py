"""Numera las referencias, las tablas y las figuras de tesis/ por orden de aparición.

Uso, desde la raíz del repositorio: python3 -I tesis/herramientas/numerar.py

- Referencias (IEEE): por orden de la primera cita en el texto de las
  secciones y los anexos (sin contar los comentarios HTML con las notas de
  trabajo), en el orden del documento. Cambia las citas en todos
  los archivos y reordena la lista de 12-referencias.md.
- Tablas: en números romanos, por orden de su título («**TABLA … Título**»).
- Figuras: en arábigos, por orden de su pie («*Fig. … Pie*» o «*Figura … Pie*»).

Una tabla o figura nueva se escribe con una clave en lugar del número
(«**TABLA [t:clave]. Título**», «*Figura [f:clave]. Pie*») y se cita con la
misma clave («la Tabla [t:clave]», «la Fig. [f:clave]»); el script la numera
y renumera las demás. Es idempotente: correrlo dos veces no cambia nada.
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ORDER = [
    "secciones/00-resumen.md",
    "secciones/01-introduccion.md",
    "secciones/02-planteamiento-del-problema.md",
    "secciones/03-justificacion.md",
    "secciones/04-objetivos.md",
    "secciones/05-marco-de-referencia.md",
    "secciones/06-metodologia.md",
    "secciones/07-desarrollo/dataiq.md",
    "secciones/07-desarrollo/plataforma.md",
    "secciones/07-desarrollo/simiq3d.md",
    "secciones/07-desarrollo/sivri.md",
    "secciones/08-resultados.md",
    "secciones/09-discusion.md",
    "secciones/10-conclusiones.md",
    "secciones/11-recomendaciones.md",
    "secciones/12-referencias.md",
    "anexos/a-b-cortes-anteriores.md",
    "anexos/c-enlaces.md",
    "anexos/d-tercer-corte.md",
    "anexos/e-instrumentos.md",
]
REFS = "secciones/12-referencias.md"


def roman(n: int) -> str:
    out = ""
    for value, digits in ((10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I")):
        while n >= value:
            out, n = out + digits, n - value
    return out


def texto(content: str) -> str:
    """El texto del informe: el archivo sin los comentarios HTML (notas de trabajo)."""
    return re.sub(r"<!--.*?-->", "", content, flags=re.S)


files = {name: (ROOT / name).read_text(encoding="utf-8") for name in ORDER}
problems = []

# Referencias
order = []
for name in ORDER:
    if name == REFS:
        continue
    for m in re.finditer(r"\[(\d+)\]", texto(files[name])):
        n = int(m.group(1))
        if n not in order:
            order.append(n)
entries = {int(m.group(1)) for m in re.finditer(r"^\[(\d+)\] ", texto(files[REFS]), re.M)}
for n in sorted(entries - set(order)):
    problems.append(f"Referencia [{n}] en la lista pero sin citar")
    order.append(n)
for n in sorted(set(order) - entries):
    problems.append(f"Referencia [{n}] citada pero sin entrada en la lista")
ref_map = {old: new for new, old in enumerate(order, 1)}

# Tablas y figuras: etiqueta (clave o número viejo) -> número nuevo
TABLE_CAPTION = re.compile(r"\*\*TABLA (\[t:[\w-]+\]|[IVXL]+)\.")
FIG_CAPTION = re.compile(r"(^> \*|^\*)(?:Figura|Fig\.)( \[f:[\w-]+\]| \d+)?\. ", re.M)
table_map, fig_map = {}, {}
tables = figures = 0
for name in ORDER:
    for m in TABLE_CAPTION.finditer(files[name]):
        tables += 1
        table_map[m.group(1)] = roman(tables)
    for m in FIG_CAPTION.finditer(files[name]):
        figures += 1
        if m.group(2):
            fig_map[m.group(2).strip()] = str(figures)

for name in ORDER:
    s = files[name]
    s = re.sub(r"\[(\d+)\]", lambda m: f"[{ref_map.get(int(m.group(1)), m.group(1))}]", s)
    s = TABLE_CAPTION.sub(lambda m: f"**TABLA {table_map[m.group(1)]}.", s)
    s = re.sub(
        r"(?<!\*\*)(Tabla|TABLA)(\s+)(\[t:[\w-]+\]|[IVXL]+\b)",
        lambda m: f"Tabla{m.group(2)}{table_map.get(m.group(3), m.group(3))}",
        s,
    )
    counter = iter(range(1, 10_000))
    start = sum(len(FIG_CAPTION.findall(files[n])) for n in ORDER[: ORDER.index(name)])
    s = FIG_CAPTION.sub(lambda m: f"{m.group(1)}Fig. {start + next(counter)}. ", s)
    s = re.sub(
        r"(?<!\*)Fig\.(\s+)(\[f:[\w-]+\]|\d+\b)",
        lambda m: f"Fig.{m.group(1)}{fig_map.get(m.group(2), m.group(2))}",
        s,
    )
    for key in re.findall(r"\[[tf]:[\w-]+\]", s):
        problems.append(f"{name}: clave sin título o pie: {key}")
    files[name] = s

# Reordenar la lista de referencias
s = files[REFS]
first = re.search(r"^\[\d+\] ", s, re.M)
intro, listing = s[: first.start()], s[first.start():]
blocks = [b.strip() for b in re.split(r"\n\s*\n(?=\[\d+\] )", listing) if b.strip()]
blocks.sort(key=lambda b: int(re.match(r"\[(\d+)\]", b).group(1)))
files[REFS] = intro + "\n\n".join(blocks) + "\n"

for name in ORDER:
    (ROOT / name).write_text(files[name], encoding="utf-8")
print(f"{len(order)} referencias, {tables} tablas y {figures} figuras numeradas.")
for p in problems:
    print("Aviso:", p)
sys.exit(1 if problems else 0)
