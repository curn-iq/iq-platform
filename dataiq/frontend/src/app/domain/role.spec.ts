import { hasAtLeast, publishesOwn, Role, ROLES } from './role';

describe('hasAtLeast', () => {
  it('cada rol alcanza su propio nivel', () => {
    for (const role of ROLES) {
      expect(hasAtLeast(role, role)).toBe(true);
    }
  });

  it('un rol mayor puede todo lo del menor (acumulativos)', () => {
    expect(hasAtLeast('admin', 'user')).toBe(true);
    expect(hasAtLeast('reviewer', 'contributor')).toBe(true);
    expect(hasAtLeast('contributor', 'user')).toBe(true);
  });

  it('un rol menor no alcanza el nivel de uno mayor', () => {
    expect(hasAtLeast('user', 'contributor')).toBe(false);
    expect(hasAtLeast('contributor', 'reviewer')).toBe(false);
    expect(hasAtLeast('reviewer', 'admin')).toBe(false);
  });

  it('respeta el orden usuario < colaborador < revisor < admin en todos los pares', () => {
    const order: Role[] = ['user', 'contributor', 'reviewer', 'admin'];
    order.forEach((role, i) => {
      order.forEach((minimum, j) => {
        expect(hasAtLeast(role, minimum)).toBe(i >= j);
      });
    });
  });
});

describe('publishesOwn', () => {
  it('un revisor o un admin publica lo suyo; un colaborador, un usuario o nadie, no', () => {
    expect(publishesOwn('reviewer')).toBe(true);
    expect(publishesOwn('admin')).toBe(true);
    expect(publishesOwn('contributor')).toBe(false);
    expect(publishesOwn('user')).toBe(false);
    expect(publishesOwn(null)).toBe(false);
  });
});
