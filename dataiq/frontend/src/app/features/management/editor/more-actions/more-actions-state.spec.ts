import { HttpTestingController } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { VersionDetail } from '../../../../data/api/models';
import { provideRepositoryTesting, TEST_API_BASE } from '../../../../data/testing';
import { EditorState } from '../editor-state';
import { MoreActions } from './more-actions';

@Component({ template: '' })
class Blank {}

const VERSION = {
  summary: {
    id: 'v-2',
    technique_id: 't-1',
    technique: 'Colecistectomía',
    specialty: 'Cirugía general',
    number: 2,
    state: 'draft',
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
  },
  rejections: [],
} as unknown as VersionDetail;

describe('MoreActions con el autoguardado del editor', () => {
  it('al descartar el borrador, lo pendiente ya no se manda: la versión no existe', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRepositoryTesting(),
        provideRouter([{ path: 'gestion/borradores', component: Blank }]),
        EditorState,
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const state = TestBed.inject(EditorState);
    state.load(VERSION);
    state.edit((content) => ({ ...content, description: 'Pendiente' }));

    const fixture = TestBed.createComponent(MoreActions);
    fixture.componentRef.setInput('version', VERSION.summary);
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    root.querySelector<HTMLButtonElement>('.trigger')!.click();
    await fixture.whenStable();
    root.querySelector<HTMLButtonElement>('.item')!.click();
    await fixture.whenStable();
    root.querySelector<HTMLButtonElement>('.confirm button')!.click();
    await fixture.whenStable();

    http
      .expectOne(`${TEST_API_BASE}/versions/v-2`)
      .flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();

    expect(state.hasUnsaved()).toBe(false);
    state.flush();
    http.expectNone(() => true);
    http.verify();
  });
});
