import { TestBed } from '@angular/core/testing';
import type { EditorContent, EditorItem, EditorZone } from '../../../../domain/editor-content';
import { zoneDiff } from '../../../../domain/version-diff';
import { ReviewTable } from './review-table';

const MAYO: EditorZone = {
  zone_id: 'z-mayo',
  zone: 'Mesa de Mayo',
  used: true,
  rows: 4,
  columns: 6,
};

function content(items: EditorItem[] = [], zones: EditorZone[] = [MAYO]): EditorContent {
  return {
    cups_code: null,
    anesthesia: null,
    patient_position: null,
    drapes: null,
    description: null,
    indications: null,
    complications: null,
    surgical_technique: null,
    source: null,
    zones,
    items,
    sutures: [],
    equipment: [],
    devices: [],
  };
}

function item(number: number, name: string, row: number, column: number): EditorItem {
  return {
    zone_id: 'z-mayo',
    legend_number: number,
    source_text: name,
    components: [{ instrument_id: `i-${name}`, suture_id: null, name }],
    cells: [{ row, column }],
  };
}

const BEFORE = content([item(4, 'Pinza Kelly', 1, 1), item(6, 'Separador de Senn Miller', 4, 4)]);
const AFTER = content([item(4, 'Pinza Kelly', 1, 1), item(6, 'Separador de Senn Miller', 4, 3)]);

describe('ReviewTable', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<ReviewTable>>;
  let root: HTMLElement;

  function mount(
    published: EditorContent | null,
    proposed: EditorContent,
    zoneName = 'Mesa de Mayo',
  ) {
    fixture = TestBed.createComponent(ReviewTable);
    fixture.componentRef.setInput('diff', zoneDiff(published, proposed, zoneName));
    fixture.componentRef.setInput('zoneName', zoneName);
    fixture.componentRef.setInput('publishedLabel', 'Publicada · versión 1');
    fixture.componentRef.setInput('proposedLabel', 'Propuesta · versión 2');
    fixture.componentRef.setInput('isNew', published === null);
    fixture.detectChanges();
    root = fixture.nativeElement;
  }

  const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim();
  const diagrams = () => Array.from(root.querySelectorAll('app-table-diagram'));
  const change = () => root.querySelector<HTMLElement>('.change')!;

  describe('con cambios', () => {
    beforeEach(() => mount(BEFORE, AFTER));

    it('pone la publicada y la propuesta lado a lado, cada una con su título', () => {
      expect(diagrams()).toHaveLength(2);
      expect(
        Array.from(root.querySelectorAll('.side-head')).map(
          (head) => `${text(head.querySelector('h3'))} / ${text(head.querySelector('span'))}`,
        ),
      ).toEqual([
        'Publicada · versión 1 / La que ven hoy los estudiantes',
        'Propuesta · versión 2 / La que se revisa',
      ]);
    });

    it('lista los cambios con su número, su nombre y de dónde a dónde', () => {
      expect(text(root.querySelector('.changes-col h3'))).toBe('Cambios');
      expect(text(change().querySelector('.number'))).toBe('6');
      expect(text(change().querySelector('strong'))).toBe('Separador de Senn Miller');
      expect(text(change().querySelector('.detail'))).toBe(
        'Fila 4 · Columna 4 → Fila 4 · Columna 3',
      );
      expect(text(root.querySelector('.help'))).toBe(
        'Señalar un cambio lo levanta en las dos mesas.',
      );
    });

    it('no dice «sin cambios»', () => {
      expect(root.querySelector('.unchanged')).toBeNull();
    });

    it('cada mesa lleva sus marcas encima: de dónde salió y adónde llegó', () => {
      const marks = Array.from(root.querySelectorAll('app-table-marks'));

      expect(marks.map((m) => m.querySelectorAll('rect').length)).toEqual([1, 2]);
      expect(marks[0].querySelector('.origin')).not.toBeNull();
      expect(marks[1].querySelector('.destination')).not.toBeNull();
      expect(marks[1].querySelector('.path')).not.toBeNull();
    });

    it('señalar un cambio con el puntero lo levanta en las dos mesas', () => {
      change().dispatchEvent(new MouseEvent('mouseenter'));
      fixture.detectChanges();

      expect(change().classList.contains('active')).toBe(true);
      for (const diagram of diagrams()) {
        expect(diagram.querySelector('.piece[data-n="6"]')!.classList.contains('active')).toBe(
          true,
        );
        expect(diagram.querySelector('.piece[data-n="4"]')!.classList.contains('active')).toBe(
          false,
        );
      }
      expect(root.querySelector('app-table-marks .path.active')).not.toBeNull();

      change().dispatchEvent(new MouseEvent('mouseleave'));
      fixture.detectChanges();
      expect(change().classList.contains('active')).toBe(false);
    });

    it('también con el teclado: el cambio recibe el foco', () => {
      expect(change().getAttribute('tabindex')).toBe('0');

      change().dispatchEvent(new FocusEvent('focus'));
      fixture.detectChanges();
      expect(change().classList.contains('active')).toBe(true);

      change().dispatchEvent(new FocusEvent('blur'));
      fixture.detectChanges();
      expect(change().classList.contains('active')).toBe(false);
    });

    it('señalar una pieza de la mesa enciende su cambio en la lista', () => {
      diagrams()[1]
        .querySelector('.piece[data-n="6"]')!
        .dispatchEvent(new MouseEvent('mouseenter'));
      fixture.detectChanges();

      expect(change().classList.contains('active')).toBe(true);
    });
  });

  it('un cambio de tamaño de la mesa no tiene número y no se puede señalar', () => {
    mount(BEFORE, content(BEFORE.items, [{ ...MAYO, columns: 7 }]));

    const [resized] = Array.from(root.querySelectorAll<HTMLElement>('.change'));
    expect(text(resized)).toBe('La mesa pasa de 4 × 6 a 4 × 7');
    expect(resized.getAttribute('tabindex')).toBeNull();
    expect(resized.querySelector('strong')).toBeNull();
    // Sin número no deja un hueco a la izquierda: el texto ocupa toda la fila
    expect(resized.querySelector('.number')).toBeNull();
    expect(resized.classList.contains('whole')).toBe(true);
  });

  describe('sin cambios', () => {
    beforeEach(() => mount(BEFORE, BEFORE));

    it('lo dice y muestra solo la propuesta, sin título ni marcas', () => {
      expect(text(root.querySelector('.unchanged'))).toBe(
        'Sin cambios frente a la versión publicada.',
      );
      expect(diagrams()).toHaveLength(1);
      expect(root.querySelector('.side-head')).toBeNull();
      expect(root.querySelector('app-table-marks')).toBeNull();
      expect(root.querySelector('.changes-col')).toBeNull();
    });
  });

  describe('una técnica nueva', () => {
    beforeEach(() => mount(null, AFTER));

    it('muestra solo la propuesta, con su título, y no dice «sin cambios»', () => {
      expect(diagrams()).toHaveLength(1);
      expect(text(root.querySelector('.side-head h3'))).toBe('Propuesta · versión 2');
      expect(root.querySelector('.unchanged')).toBeNull();
      expect(root.querySelector('.changes-col')).toBeNull();
    });
  });

  describe('una mesa que no se dibuja', () => {
    it('la que la versión no lleva dice «Sin mesa de Mayo.»', () => {
      mount(BEFORE, content([], [{ ...MAYO, used: false, rows: null, columns: null }]));

      const blanks = Array.from(root.querySelectorAll('.blank')).map((b) => text(b));
      expect(blanks).toEqual(['Sin mesa de Mayo.']);
      expect(text(root.querySelector('.change'))).toBe('La mesa pasa de 4 × 6 a no llevarse');
    });

    it('de la que la versión no dice nada: «Mesa de Mayo sin arreglo disponible.»', () => {
      mount(BEFORE, content([], []));

      expect(text(root.querySelector('.blank'))).toBe('Mesa de Mayo sin arreglo disponible.');
    });

    it('la de reserva se nombra con su nombre', () => {
      const reserve: EditorZone = {
        ...MAYO,
        zone_id: 'z-r',
        zone: 'Mesa de reserva',
        used: false,
      };
      mount(content([], [reserve]), content([], [reserve]), 'Mesa de reserva');

      expect(text(root.querySelector('.blank'))).toBe('Sin mesa de reserva.');
    });
  });
});
