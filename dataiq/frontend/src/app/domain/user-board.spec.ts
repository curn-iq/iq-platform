import type { Role } from './role';
import {
  activityLine,
  describeRoleChange,
  formatPersonDate,
  MAX_SEARCH_RESULTS,
  peopleWithRole,
  recentUsers,
  replacePerson,
  searchPeople,
  splitEmail,
  summaryLine,
  verificationFor,
  type Person,
} from './user-board';

const NO_ACTIVITY = { drafts: 0, returned: 0, in_review: 0, published_techniques: 0, reviewed: 0 };

function person(name: string, role: Role = 'user', createdAt = '2026-10-01T10:00:00Z'): Person {
  const slug = name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replaceAll(' ', '.');
  return {
    id: `id-${slug}`,
    name,
    email: `${slug}@correo.com`,
    role,
    created_at: createdAt,
    policy_accepted_at: createdAt,
    policy_version: '1.0',
    activity: NO_ACTIVITY,
  };
}

describe('peopleWithRole', () => {
  it('lista las cuentas de un rol por nombre, sin tildes ni mayúsculas', () => {
    const people = [
      person('Óscar Peña', 'reviewer'),
      person('andrés Gómez', 'reviewer'),
      person('Zoe Ruiz', 'reviewer'),
      person('Daniela Ortiz', 'contributor'),
    ];
    expect(peopleWithRole(people, 'reviewer').map((p) => p.name)).toEqual([
      'andrés Gómez',
      'Óscar Peña',
      'Zoe Ruiz',
    ]);
  });
});

describe('recentUsers', () => {
  const people = [
    person('Uno', 'user', '2026-10-01T10:00:00Z'),
    person('Dos', 'user', '2026-10-05T10:00:00Z'),
    person('Tres', 'user', '2026-10-03T10:00:00Z'),
    person('Cuatro', 'user', '2026-10-04T10:00:00Z'),
    person('Cinco', 'user', '2026-10-02T10:00:00Z'),
    person('Seis', 'user', '2026-10-06T10:00:00Z'),
    person('Revisor', 'reviewer', '2026-10-07T10:00:00Z'),
  ];

  it('son los cinco usuarios con el registro más reciente, y solo usuarios', () => {
    expect(recentUsers(people).map((p) => p.name)).toEqual([
      'Seis',
      'Dos',
      'Cuatro',
      'Tres',
      'Cinco',
    ]);
  });

  it('deja fuera los ya mostrados y completa con los siguientes', () => {
    const shown = new Set([person('Seis').id]);
    expect(recentUsers(people, shown).map((p) => p.name)).toEqual([
      'Dos',
      'Cuatro',
      'Tres',
      'Cinco',
      'Uno',
    ]);
  });
});

describe('summaryLine', () => {
  it('cuenta cada rol, en plural', () => {
    const people = [
      person('A', 'admin'),
      person('B', 'admin'),
      person('C', 'admin'),
      person('D', 'reviewer'),
      person('E', 'reviewer'),
      person('F', 'contributor'),
      person('G', 'contributor'),
      person('H', 'user'),
      person('I', 'user'),
    ];
    expect(summaryLine(people)).toBe('3 admin · 2 revisores · 2 colaboradores · 2 usuarios');
  });

  it('dice «1 revisor» y «1 usuario» en singular, y 0 en plural', () => {
    const people = [person('A', 'admin'), person('D', 'reviewer'), person('H', 'user')];
    expect(summaryLine(people)).toBe('1 admin · 1 revisor · 0 colaboradores · 1 usuario');
  });
});

describe('searchPeople', () => {
  const people = [
    person('Laura Pérez', 'reviewer'),
    person('Camila Herrera', 'user'),
    person('Pedro Camargo', 'user'),
  ];

  it('busca en el nombre y en el correo, sin tildes ni mayúsculas', () => {
    expect(searchPeople(people, 'perez').shown.map((p) => p.name)).toEqual(['Laura Pérez']);
    // «herrera@correo» solo está en el correo
    expect(searchPeople(people, 'HERRERA@correo').shown.map((p) => p.name)).toEqual([
      'Camila Herrera',
    ]);
    expect(searchPeople(people, 'cam').shown.map((p) => p.name)).toEqual([
      'Camila Herrera',
      'Pedro Camargo',
    ]);
  });

  it('sin nada escrito, o solo con espacios, no hay resultados', () => {
    expect(searchPeople(people, '')).toEqual({ shown: [], more: 0 });
    expect(searchPeople(people, '   ')).toEqual({ shown: [], more: 0 });
  });

  it('puede limitarse a un rol', () => {
    expect(searchPeople(people, 'a', 'reviewer').shown.map((p) => p.name)).toEqual(['Laura Pérez']);
  });

  it('muestra hasta el tope y dice cuántas coincidencias más hay', () => {
    const many = Array.from({ length: MAX_SEARCH_RESULTS + 3 }, (_, i) =>
      person(`Persona ${String(i).padStart(2, '0')}`),
    );
    const result = searchPeople(many, 'persona');
    expect(result.shown).toHaveLength(MAX_SEARCH_RESULTS);
    expect(result.more).toBe(3);
  });
});

describe('splitEmail', () => {
  it('separa la parte local del dominio, que lleva la arroba', () => {
    expect(splitEmail('laura.perez@correo.com')).toEqual({
      local: 'laura.perez',
      domain: '@correo.com',
    });
  });

  it('un texto sin arroba es todo parte local', () => {
    expect(splitEmail('sin-arroba')).toEqual({ local: 'sin-arroba', domain: '' });
  });
});

describe('replacePerson', () => {
  it('cambia solo la cuenta con la misma id', () => {
    const a = person('A', 'user');
    const b = person('B', 'user');
    const updated = { ...a, role: 'reviewer' as const };
    expect(replacePerson([a, b], updated)).toEqual([updated, b]);
  });
});

describe('formatPersonDate', () => {
  const now = new Date(2026, 9, 6, 15, 0);

  it('dice Hoy y Ayer', () => {
    expect(formatPersonDate(new Date(2026, 9, 6, 9, 12), now)).toBe('Hoy');
    expect(formatPersonDate(new Date(2026, 9, 5, 23, 59), now)).toBe('Ayer');
  });

  it('escribe el día, el mes y el año, también si es del año en curso', () => {
    expect(formatPersonDate(new Date(2026, 8, 25, 10), now)).toBe('25 sep 2026');
    expect(formatPersonDate(new Date(2025, 11, 3, 10), now)).toBe('3 dic 2025');
  });
});

describe('activityLine', () => {
  it('junta las cifras que no son cero, en orden, con su singular y su plural', () => {
    expect(
      activityLine({ drafts: 4, returned: 1, in_review: 1, published_techniques: 1, reviewed: 2 }),
    ).toBe(
      '4 borradores · 1 devuelta · 1 versión en revisión · 1 técnica publicada · 2 versiones revisadas',
    );
  });

  it('omite lo que está en cero', () => {
    expect(activityLine({ ...NO_ACTIVITY, in_review: 2 })).toBe('2 versiones en revisión');
    expect(activityLine({ ...NO_ACTIVITY, drafts: 1, reviewed: 1 })).toBe(
      '1 borrador · 1 versión revisada',
    );
  });

  it('sin actividad dice que no la hay', () => {
    expect(activityLine(NO_ACTIVITY)).toBe('Sin actividad en DataIQ');
  });
});

describe('verificationFor', () => {
  it('pide verificar al dar el rol de revisor o de admin, y a ningún otro', () => {
    expect(verificationFor('reviewer')).toBe('Verifiqué que es docente o instrumentador titulado.');
    expect(verificationFor('admin')).toBe('Es parte del equipo operativo del proyecto.');
    expect(verificationFor('contributor')).toBeNull();
    expect(verificationFor('user')).toBeNull();
  });
});

describe('describeRoleChange', () => {
  it('al subir de rol dice lo que podrá hacer', () => {
    const change = describeRoleChange('contributor', 'reviewer');
    expect(change.upgrade).toBe(true);
    expect(change.consequence).toBe('Podrá publicar lo suyo y aprobar lo de los colaboradores.');
    expect(change.verification).toBe('Verifiqué que es docente o instrumentador titulado.');
  });

  it('al dar el rol de admin no dice nada de suspender cuentas', () => {
    const change = describeRoleChange('reviewer', 'admin');
    expect(change.consequence).toBe('Podrá asignar roles.');
    expect(change.verification).toBe('Es parte del equipo operativo del proyecto.');
  });

  it('al bajar de rol dice que deja de poder lo anterior', () => {
    const change = describeRoleChange('admin', 'reviewer');
    expect(change.upgrade).toBe(false);
    expect(change.consequence).toBe('Deja de poder lo que su rol actual le permitía.');
  });

  it('la verificación depende del rol que se da, no de si sube o baja', () => {
    expect(describeRoleChange('admin', 'reviewer').verification).toBe(
      'Verifiqué que es docente o instrumentador titulado.',
    );
    expect(describeRoleChange('reviewer', 'contributor').verification).toBeNull();
  });
});
