import { TestBed } from '@angular/core/testing';
import { NoticeService } from './notice.service';

describe('NoticeService', () => {
  let service: NoticeService;

  beforeEach(() => {
    service = TestBed.inject(NoticeService);
  });

  it('empieza sin avisos', () => {
    expect(service.notices()).toEqual([]);
  });

  it('agrega los avisos en orden, cada uno con su id', () => {
    service.show('error', ['Uno']);
    service.show('confirmation', ['Dos']);

    const [first, second] = service.notices();
    expect(first).toMatchObject({ kind: 'error', messages: ['Uno'] });
    expect(second).toMatchObject({ kind: 'confirmation', messages: ['Dos'] });
    expect(first.id).not.toBe(second.id);
  });

  it('no repite un aviso igual a uno que sigue a la vista', () => {
    service.show('error', ['Hace falta iniciar sesión']);
    service.show('error', ['Hace falta iniciar sesión']);

    expect(service.notices()).toHaveLength(1);
  });

  it('distingue por tipo y por mensajes', () => {
    service.show('error', ['A']);
    service.show('confirmation', ['A']);
    service.show('error', ['A', 'B']);

    expect(service.notices()).toHaveLength(3);
  });

  it('quita un aviso por su id, y uno igual puede volver a mostrarse', () => {
    service.show('error', ['A']);
    service.show('error', ['B']);
    const [first, second] = service.notices();

    service.dismiss(first.id);
    expect(service.notices()).toEqual([second]);

    service.show('error', ['A']);
    expect(service.notices().map((n) => n.messages[0])).toEqual(['B', 'A']);
  });

  it('descartar un id que no existe no cambia nada', () => {
    service.show('error', ['A']);
    service.dismiss(999);
    expect(service.notices()).toHaveLength(1);
  });
});
