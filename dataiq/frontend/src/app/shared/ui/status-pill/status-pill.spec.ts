import { TestBed } from '@angular/core/testing';
import { STATUS_PILL_LABELS, StatusPill, type StatusPillKind } from './status-pill';

describe('StatusPill', () => {
  function create(kind: StatusPillKind) {
    const fixture = TestBed.createComponent(StatusPill);
    fixture.componentRef.setInput('kind', kind);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('dice el estado con su texto', () => {
    expect(create('draft').textContent!.trim()).toBe('Borrador');
    expect(create('returned').textContent!.trim()).toBe('Devuelta');
    expect(create('in_review').textContent!.trim()).toBe('En revisión');
    expect(create('approved').textContent!.trim()).toBe('Aprobada');
  });

  it('cada estado tiene su ícono, decorativo, y no se repiten', () => {
    const icons = (Object.keys(STATUS_PILL_LABELS) as StatusPillKind[]).map((kind) => {
      const svg = create(kind).querySelector('svg')!;
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      return svg.innerHTML;
    });

    expect(new Set(icons).size).toBe(4);
  });

  it('el estado queda en un atributo del host, que es lo que lo pinta', () => {
    expect(create('returned').getAttribute('data-kind')).toBe('returned');
  });
});
