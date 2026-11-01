import { isUuid } from './uuid';

describe('isUuid', () => {
  it('reconoce un UUID, con mayúsculas o minúsculas', () => {
    expect(isUuid('019a0c1e-7b3d-7c2a-9e4f-0a1b2c3d4e5f')).toBe(true);
    expect(isUuid('019A0C1E-7B3D-7C2A-9E4F-0A1B2C3D4E5F')).toBe(true);
  });

  it('rechaza lo que no lo es', () => {
    expect(isUuid('')).toBe(false);
    expect(isUuid('t-1')).toBe(false);
    expect(isUuid('tiroidectomia')).toBe(false);
    expect(isUuid('019a0c1e-7b3d-7c2a-9e4f-0a1b2c3d4e5')).toBe(false);
    expect(isUuid('019a0c1e-7b3d-7c2a-9e4f-0a1b2c3d4e5f0')).toBe(false);
  });
});
