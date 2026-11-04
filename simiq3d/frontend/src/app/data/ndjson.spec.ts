import { NdjsonReader } from './ndjson';

describe('NdjsonReader', () => {
  it('devuelve cada línea completa una sola vez, a medida que llega', () => {
    const reader = new NdjsonReader<{ n: number }>();

    expect(reader.read('{"n":1}\n{"n"')).toEqual([{ n: 1 }]);
    expect(reader.read('{"n":1}\n{"n"')).toEqual([]);
    expect(reader.read('{"n":1}\n{"n":2}\n')).toEqual([{ n: 2 }]);
    expect(reader.read('{"n":1}\n{"n":2}\n{"n":3}', true)).toEqual([{ n: 3 }]);
  });
});
