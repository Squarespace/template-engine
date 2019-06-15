import { nameOf, of, Type } from '../src/types';

test('types', () => {
  expect(of(undefined)).toBe(Type.MISSING);
  expect(of(NaN)).toBe(Type.MISSING);
  expect(of(Infinity)).toBe(Type.MISSING);
  expect(of(-Infinity)).toBe(Type.MISSING);

  const func = () => {};
  expect(of(func)).toBe(Type.MISSING);

  const val = { a: 1, b: undefined };
  expect(of(val.b)).toBe(Type.MISSING);

  expect(of({})).toBe(Type.OBJECT);
  expect(of({ a: 1 })).toBe(Type.OBJECT);

  expect(of([])).toBe(Type.ARRAY);
  expect(of([1, 2])).toBe(Type.ARRAY);

  expect(of(false)).toBe(Type.BOOLEAN);
  expect(of(false)).toBe(Type.BOOLEAN);

  expect(of('')).toBe(Type.STRING);
  expect(of('abc')).toBe(Type.STRING);

  expect(of(0)).toBe(Type.NUMBER);
  expect(of(-1)).toBe(Type.NUMBER);
  expect(of(123)).toBe(Type.NUMBER);
  expect(of(3.14159)).toBe(Type.NUMBER);

  expect(of(null)).toBe(Type.NULL);
});


test('type names', () => {
  expect(nameOf(Type.MISSING)).toEqual('MISSING');
  expect(nameOf(-5)).toEqual(undefined);
});
