import { TestBed } from '@angular/core/testing';
import type { TechniquePublic } from '../../../data/api/models';
import { TechniqueClinical } from './technique-clinical';

const TECHNIQUE: TechniquePublic = {
  id: '019a0c1e-7b3d-7c2a-9e4f-0a1b2c3d4e5f',
  name: 'Tiroidectomía',
  specialty: 'Cirugía general',
  version_number: 1,
  cups_code: '061100',
  anesthesia: 'General',
  patient_position: 'Decúbito supino con hiperextensión de cuello',
  drapes: 'Paquete de ropa general',
  description: 'Extirpación de la glándula tiroides.',
  indications: 'Cáncer de tiroides.',
  complications: 'Lesión del nervio laríngeo recurrente.',
  surgical_technique: 'Incisión cervical.\nDisección por planos.',
  source: 'Documento de IQ',
};

describe('TechniqueClinical', () => {
  let root: HTMLElement;

  async function mount(technique: TechniquePublic = TECHNIQUE) {
    const fixture = TestBed.createComponent(TechniqueClinical);
    fixture.componentRef.setInput('technique', technique);
    root = fixture.nativeElement;
    await fixture.whenStable();
  }

  const facts = () =>
    Array.from(root.querySelectorAll('.facts div')).map((div) => [
      div.querySelector('dt')!.textContent,
      div.querySelector('dd')!.textContent,
    ]);
  const notes = () =>
    Array.from(root.querySelectorAll('.notes section')).map((section) => [
      section.querySelector('h2')!.textContent,
      section.querySelector('p')!.textContent,
    ]);

  it('«Para qué sirve» es la descripción, sin la marca «demostración»', async () => {
    await mount();

    expect(root.querySelector('.purpose h2')!.textContent).toBe('Para qué sirve');
    expect(root.querySelector('.purpose p')!.textContent).toBe(
      'Extirpación de la glándula tiroides.',
    );
    expect(root.textContent).not.toMatch(/demostración/i);
  });

  it('las fichas son anestesia, ropa, posición del paciente y código CUPS', async () => {
    await mount();

    expect(facts()).toEqual([
      ['Anestesia', 'General'],
      ['Ropa', 'Paquete de ropa general'],
      ['Posición del paciente', 'Decúbito supino con hiperextensión de cuello'],
      ['Código CUPS', '061100'],
    ]);
  });

  it('la posición del paciente y el código CUPS ocupan la fila entera', async () => {
    await mount();

    const wide = Array.from(root.querySelectorAll('.facts .wide dt')).map((dt) => dt.textContent);
    expect(wide).toEqual(['Posición del paciente', 'Código CUPS']);
  });

  it('las indicaciones, las complicaciones y la técnica quirúrgica van a la derecha', async () => {
    await mount();

    expect(notes()).toEqual([
      ['Indicaciones', 'Cáncer de tiroides.'],
      ['Complicaciones', 'Lesión del nervio laríngeo recurrente.'],
      ['Técnica quirúrgica', 'Incisión cervical.\nDisección por planos.'],
    ]);
  });

  it('dice de dónde salen los datos', async () => {
    await mount();

    expect(root.querySelector('.source')!.textContent!.replace(/\s+/g, ' ').trim()).toBe(
      'Fuente Documento de IQ',
    );
  });

  it('no muestra las suturas ni los equipos: son de Instrumental', async () => {
    await mount();

    expect(root.textContent).not.toMatch(/sutura|equipo/i);
  });

  it('lo que la técnica no trae no se muestra ni se rellena', async () => {
    await mount({
      ...TECHNIQUE,
      anesthesia: null,
      cups_code: null,
      indications: null,
      complications: null,
      surgical_technique: null,
      source: null,
    });

    expect(facts().map(([label]) => label)).toEqual(['Ropa', 'Posición del paciente']);
    expect(root.querySelector('.notes')).toBeNull();
    expect(root.querySelector('.source')).toBeNull();
    expect(root.querySelector('.clinical')!.classList).toContain('single');
  });

  it('sin descripción no hay tarjeta de «Para qué sirve»', async () => {
    await mount({ ...TECHNIQUE, description: null });

    expect(root.querySelector('.purpose')).toBeNull();
    expect(facts()).toHaveLength(4);
  });
});
