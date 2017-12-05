import types from '../src/types';

test('types', () => {
  expect(types.of(undefined)).toBe(types.MISSING);
  expect(types.of(NaN)).toBe(types.MISSING);
  expect(types.of(Infinity)).toBe(types.MISSING);
  expect(types.of(-Infinity)).toBe(types.MISSING);

  const func = () => {};
  expect(types.of(func)).toBe(types.MISSING);

  const val = { a: 1 };
  expect(types.of(val.b)).toBe(types.MISSING);

  expect(types.of({})).toBe(types.OBJECT);
  expect(types.of({ a: 1 })).toBe(types.OBJECT);

  expect(types.of([])).toBe(types.ARRAY);
  expect(types.of([1, 2])).toBe(types.ARRAY);

  expect(types.of(false)).toBe(types.BOOLEAN);
  expect(types.of(false)).toBe(types.BOOLEAN);

  expect(types.of('')).toBe(types.STRING);
  expect(types.of('abc')).toBe(types.STRING);

  expect(types.of(0)).toBe(types.NUMBER);
  expect(types.of(-1)).toBe(types.NUMBER);
  expect(types.of(123)).toBe(types.NUMBER);
  expect(types.of(3.14159)).toBe(types.NUMBER);

  expect(types.of(null)).toBe(types.NULL);
});
