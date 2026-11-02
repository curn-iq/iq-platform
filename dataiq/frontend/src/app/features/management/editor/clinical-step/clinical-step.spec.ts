import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { VersionDetail } from '../../../../data/api/models';
import { provideRepositoryTesting } from '../../../../data/testing';
import { EditorState } from '../editor-state';
import { ClinicalStep } from './clinical-step';

function version(state = 'draft', content: Record<string, unknown> = {}): VersionDetail {
  return {
    summary: {
      id: 'v-1',
      technique_id: 't-1',
      technique: 'Colecistectomía',
      specialty: 'Cirugía general',
      number: 2,
      state,
      created_by: 'u-1',
      author: 'Ana Ruiz',
      updated_at: '2026-10-03T15:00:00Z',
    },
    content: {
      id: 't-1',
      name: 'Colecistectomía',
      specialty: 'Cirugía general',
      version_number: 2,
      cups_code: null,
      anesthesia: null,
      patient_position: null,
      drapes: null,
      description: null,
      indications: null,
      complications: null,
      surgical_technique: null,
      source: null,
      zones: [],
      items: [],
      sutures: [],
      equipment: [],
      devices: [],
      ...content,
    },
    rejections: [],
  } as unknown as VersionDetail;
}

const FILLED = {
  description: 'Extirpar la vesícula.',
  indications: 'Colelitiasis.',
  complications: 'Lesión de la vía biliar.',
  surgical_technique: 'Primer tiempo.',
  source: 'Documento de IQ.',
  cups_code: '511101',
  anesthesia: 'General.',
  drapes: 'Paquete de laparotomía.',
  patient_position: 'Decúbito supino.',
  equipment: [{ id: 'e-1', name: 'Electrobisturí', description: null }],
  devices: [{ id: 'd-1', name: 'Trocar', description: null }],
  sutures: [
    { id: 's-1', name: 'Seda', gauge: '2/0', needle_type: 'aguja cortante', usage: 'Piel; Fascia' },
  ],
};

describe('ClinicalStep', () => {
  let state: EditorState;
  let http: HttpTestingController;
  let fixture: ComponentFixture<ClinicalStep>;
  let root: HTMLElement;

  async function mount(detail: VersionDetail = version()): Promise<void> {
    TestBed.configureTestingModule({ providers: [provideRepositoryTesting(), EditorState] });
    state = TestBed.inject(EditorState);
    http = TestBed.inject(HttpTestingController);
    state.load(detail);
    fixture = TestBed.createComponent(ClinicalStep);
    fixture.componentRef.setInput('technique', 'Colecistectomía');
    fixture.componentRef.setInput('specialty', 'Cirugía general');
    root = fixture.nativeElement;
    await fixture.whenStable();
  }

  afterEach(() => {
    // Lo que quedó escrito no se manda al cerrar la prueba
    state.abandon();
    http.verify();
  });

  const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim();
  /** El campo (de texto o área) que tiene esa etiqueta. */
  const field = (label: string) => {
    const wanted = Array.from(root.querySelectorAll('label')).find((l) =>
      text(l.querySelector('span'))!.startsWith(label),
    )!;
    return root.querySelector<HTMLInputElement | HTMLTextAreaElement>(
      `#${wanted.getAttribute('for')}`,
    )!;
  };
  const labelOf = (label: string) =>
    Array.from(root.querySelectorAll('label')).find((l) =>
      text(l.querySelector('span'))!.startsWith(label),
    )!;
  const pills = () => root.querySelectorAll('.badge');

  async function type(label: string, value: string): Promise<void> {
    const element = field(label);
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  }

  describe('la hoja', () => {
    beforeEach(() => mount(version('draft', FILLED)));

    it('se titula «Datos clínicos» y dice para qué es', () => {
      expect(text(root.querySelector('h2'))).toBe('Datos clínicos');
      expect(text(root.querySelector('.title p'))).toBe(
        'Lo que se sabe del procedimiento antes de armar la mesa.',
      );
    });

    it('tiene dos tarjetas: Descripción y Preparación', () => {
      expect(Array.from(root.querySelectorAll('.card > h3')).map((h) => text(h))).toEqual([
        'Descripción',
        'Preparación',
      ]);
    });

    it('el nombre y la especialidad se ven de solo lectura y sin pastilla', () => {
      expect(field('Nombre de la técnica').value).toBe('Colecistectomía');
      expect(field('Nombre de la técnica').readOnly).toBe(true);
      expect(field('Especialidad').value).toBe('Cirugía general');
      expect(field('Especialidad').readOnly).toBe(true);
      expect(labelOf('Nombre de la técnica').querySelector('.badge')).toBeNull();
    });

    it('cada campo muestra lo que trae la versión', () => {
      expect(field('Para qué sirve').value).toBe('Extirpar la vesícula.');
      expect(field('Indicaciones').value).toBe('Colelitiasis.');
      expect(field('Complicaciones').value).toBe('Lesión de la vía biliar.');
      expect(field('Técnica quirúrgica').value).toBe('Primer tiempo.');
      expect(field('Fuente').value).toBe('Documento de IQ.');
      expect(field('Código CUPS').value).toBe('511101');
      expect(field('Anestesia').value).toBe('General.');
      expect(field('Ropa').value).toBe('Paquete de laparotomía.');
      expect(field('Posición del paciente').value).toBe('Decúbito supino.');
    });

    it('los textos de ayuda son los del mockup, y la fuente tiene el suyo', () => {
      expect(field('Para qué sirve').placeholder).toBe(
        'En qué consiste el procedimiento y qué busca resolver.',
      );
      expect(field('Fuente').placeholder).toBe('De qué documento sale esta información.');
      expect(field('Código CUPS').placeholder).toBe('Código del procedimiento');
    });

    it('el CUPS pide el teclado numérico', () => {
      expect(field('Código CUPS').getAttribute('inputmode')).toBe('numeric');
    });

    it('con todo lleno no hay ninguna pastilla «Falta»', () => {
      expect(pills()).toHaveLength(0);
    });

    it('las complicaciones, la técnica quirúrgica y el CUPS dicen «Opcional»; lo demás no', () => {
      const optional = Array.from(root.querySelectorAll('label'))
        .filter((l) => l.querySelector('.optional'))
        .map((l) => text(l.querySelector('span')));

      expect(optional).toEqual(['Complicaciones', 'Técnica quirúrgica', 'Código CUPS']);
    });
  });

  describe('lo que falta', () => {
    beforeEach(() => mount());

    it('cada obligatorio vacío lleva «Falta», y las suturas también', () => {
      const missing = Array.from(root.querySelectorAll('label'))
        .filter((l) => l.querySelector('.badge'))
        .map((l) => text(l.querySelector('span')));

      expect(missing).toEqual([
        'Para qué sirve',
        'Indicaciones',
        'Fuente',
        'Anestesia',
        'Ropa',
        'Posición del paciente',
      ]);
      expect(text(root.querySelector('.sutures .label'))).toBe('Suturas por plano Falta');
      expect(pills()).toHaveLength(7);
    });

    it('un campo en blanco, solo espacios, sigue faltando', async () => {
      await type('Anestesia', '   ');

      expect(labelOf('Anestesia').querySelector('.badge')).not.toBeNull();
    });

    it('al escribir un campo pierde su «Falta»', async () => {
      await type('Anestesia', 'General.');

      expect(labelOf('Anestesia').querySelector('.badge')).toBeNull();
      expect(pills()).toHaveLength(6);
    });

    it('los opcionales no llevan «Falta» estén vacíos o no', () => {
      expect(labelOf('Complicaciones').querySelector('.badge')).toBeNull();
      expect(labelOf('Código CUPS').querySelector('.badge')).toBeNull();
    });
  });

  describe('escribir', () => {
    beforeEach(() => mount());

    it('lo que se escribe pasa al contenido de la versión y programa el guardado', async () => {
      await type('Para qué sirve', 'Extirpar la vesícula.');

      expect(state.content()?.description).toBe('Extirpar la vesícula.');
      expect(state.saveStatus()).toBe('saving');
    });

    it('cada campo escribe en el suyo', async () => {
      await type('Indicaciones', 'a');
      await type('Complicaciones', 'b');
      await type('Técnica quirúrgica', 'c');
      await type('Fuente', 'd');
      await type('Código CUPS', 'e');
      await type('Anestesia', 'f');
      await type('Ropa', 'g');
      await type('Posición del paciente', 'h');

      expect(state.content()).toMatchObject({
        indications: 'a',
        complications: 'b',
        surgical_technique: 'c',
        source: 'd',
        cups_code: 'e',
        anesthesia: 'f',
        drapes: 'g',
        patient_position: 'h',
      });
    });

    it('el avance de la versión lo ve: la sutura sigue siendo lo que falta', async () => {
      await type('Anestesia', 'General.');

      expect(state.content()?.sutures).toEqual([]);
    });
  });

  describe('equipos y equipo médico-quirúrgico', () => {
    beforeEach(() => mount(version('draft', FILLED)));

    const chips = (title: string) =>
      Array.from(
        Array.from(root.querySelectorAll('app-chip-list'))
          .find((list) => text(list.querySelector('.label')) === title)!
          .querySelectorAll('.chip'),
      ).map((chip) => chip.firstChild!.textContent!.trim());
    const list = (title: string) =>
      Array.from(root.querySelectorAll('app-chip-list')).find(
        (l) => text(l.querySelector('.label')) === title,
      )!;

    async function add(title: string, name: string): Promise<void> {
      list(title).querySelector<HTMLButtonElement>('button.add')!.click();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve));
      const input = list(title).querySelector<HTMLInputElement>('input.new')!;
      input.value = name;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await Promise.resolve();
    }

    it('muestran lo que trae la versión, por nombre', () => {
      expect(chips('Equipos biomédicos')).toEqual(['Electrobisturí']);
      expect(chips('Equipo médico-quirúrgico')).toEqual(['Trocar']);
    });

    it('agregar suma al equipo que corresponde y programa el guardado', async () => {
      await add('Equipos biomédicos', 'Aspirador');

      expect(state.content()?.equipment).toEqual(['Electrobisturí', 'Aspirador']);
      expect(state.content()?.devices).toEqual(['Trocar']);
      expect(state.saveStatus()).toBe('saving');
    });

    it('agregar al equipo médico-quirúrgico', async () => {
      await add('Equipo médico-quirúrgico', 'Pinza de clips');

      expect(state.content()?.devices).toEqual(['Trocar', 'Pinza de clips']);
    });

    it('un nombre que ya está no se repite: la API lo rechazaría', async () => {
      await add('Equipos biomédicos', 'electrobisturi');

      expect(state.content()?.equipment).toEqual(['Electrobisturí']);
    });

    it('quitar saca el nombre de la lista', async () => {
      list('Equipos biomédicos').querySelector<HTMLButtonElement>('.remove')!.click();
      await Promise.resolve();

      expect(state.content()?.equipment).toEqual([]);
    });

    it('cada lista nombra su ficha nueva para quien no la ve', async () => {
      list('Equipos biomédicos').querySelector<HTMLButtonElement>('button.add')!.click();
      await new Promise((resolve) => setTimeout(resolve));
      expect(root.querySelector('input.new')!.getAttribute('aria-label')).toBe('Nuevo equipo');

      root.querySelector('input.new')!.dispatchEvent(new Event('blur'));
      list('Equipo médico-quirúrgico').querySelector<HTMLButtonElement>('button.add')!.click();
      await new Promise((resolve) => setTimeout(resolve));
      expect(root.querySelector('input.new')!.getAttribute('aria-label')).toBe(
        'Nuevo equipo médico-quirúrgico',
      );
    });
  });

  describe('suturas', () => {
    it('se ven una por plano, con el plano y la sutura con su calibre y su aguja', async () => {
      await mount(version('draft', FILLED));

      const rows = Array.from(root.querySelectorAll('.sutures dl > div'));
      expect(
        rows.map((row) => [text(row.querySelector('dt')), text(row.querySelector('dd'))]),
      ).toEqual([
        ['Piel', 'Seda 2/0, aguja cortante'],
        ['Fascia', 'Seda 2/0, aguja cortante'],
      ]);
      expect(root.querySelector('.sutures .badge')).toBeNull();
    });

    it('una sutura sin plano es solo su texto', async () => {
      await mount(
        version('draft', {
          sutures: [{ id: 's-1', name: 'Seda', gauge: '3/0', needle_type: null, usage: null }],
        }),
      );

      const row = root.querySelector('.sutures dl > div')!;
      expect(text(row)).toBe('Seda 3/0');
      expect(row.querySelector('dt')).toBeNull();
    });

    it('no hay botones para editarlas: eso llega en su casilla', async () => {
      await mount(version('draft', FILLED));

      expect(root.querySelector('.sutures button')).toBeNull();
      expect(root.querySelector('.sutures input')).toBeNull();
    });
  });

  describe('una versión en solo lectura (en revisión)', () => {
    beforeEach(() => mount(version('in_review', FILLED)));

    it('todo se ve y nada se puede cambiar', () => {
      for (const label of [
        'Para qué sirve',
        'Indicaciones',
        'Complicaciones',
        'Técnica quirúrgica',
        'Fuente',
        'Código CUPS',
        'Anestesia',
        'Ropa',
        'Posición del paciente',
      ]) {
        expect(field(label).readOnly, label).toBe(true);
      }
      expect(field('Anestesia').value).toBe('General.');
    });

    it('las listas no se pueden quitar ni agregar', () => {
      expect(root.querySelector('app-chip-list .remove')).toBeNull();
      expect(root.querySelector('app-chip-list .add')).toBeNull();
      expect(text(root.querySelector('app-chip-list .chip'))).toBe('Electrobisturí');
    });

    it('escribir no cambia nada ni guarda', async () => {
      await type('Anestesia', 'Local.');

      expect(state.content()?.anesthesia).toBe('General.');
      expect(state.saveStatus()).toBe('unchanged');
    });
  });
});
