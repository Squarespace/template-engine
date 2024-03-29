import { isTruthy, Node } from '../src/node';
import { deepCopy, deepEquals, deepMerge, isJsonStart, repeat, splitVariable, stringCompare } from '../src/util';
import { removeTags } from '../src/plugins/util.string';

test('variable splitting', () => {
  expect(splitVariable('@')).toEqual(['@']);
  expect(splitVariable('@index')).toEqual(['@index']);
  expect(splitVariable('@index0')).toEqual(['@index0']);
  expect(splitVariable('a')).toEqual(['a']);
  expect(splitVariable('a.b.c')).toEqual(['a', 'b', 'c']);
  expect(splitVariable('a.1.b.2')).toEqual(['a', 1, 'b', 2]);
  expect(splitVariable('0.1.2')).toEqual([0, 1, 2]);
});

test('large integer', () => {
  const s = '333333333333333333333333333333';
  expect(splitVariable(s)).toStrictEqual([s]);
});

test('variable truthiness', () => {
  expect(isTruthy(null)).toEqual(false);
  expect(isTruthy(undefined)).toEqual(false);
  expect(isTruthy(NaN)).toEqual(false);
  expect(isTruthy(Infinity)).toEqual(true);
  expect(isTruthy(-Infinity)).toEqual(true);

  expect(isTruthy(false)).toEqual(false);
  expect(isTruthy(true)).toEqual(true);

  expect(isTruthy(0)).toEqual(false);
  expect(isTruthy(1)).toEqual(true);
  expect(isTruthy(-5)).toEqual(true);
  expect(isTruthy(3.14159)).toEqual(true);

  expect(isTruthy('')).toEqual(false);
  expect(isTruthy('abc')).toEqual(true);

  expect(isTruthy([])).toEqual(false);
  expect(isTruthy([1, 2, 3])).toEqual(true);

  expect(isTruthy({})).toEqual(false);
  expect(isTruthy({ a: 1 })).toEqual(true);

  expect(isTruthy(new Node({}))).toEqual(false);
  expect(isTruthy(new Node({ a: 1 }))).toEqual(true);
});

test('json start', () => {
  expect(isJsonStart('abc')).toEqual(false);
  expect(isJsonStart('--')).toEqual(false);

  expect(isJsonStart('null')).toEqual(true);
  expect(isJsonStart(0)).toEqual(true);
  expect(isJsonStart('"abc"')).toEqual(true);
  expect(isJsonStart('false')).toEqual(true);
  expect(isJsonStart('true')).toEqual(true);
  expect(isJsonStart('{}')).toEqual(true);
  expect(isJsonStart('[]')).toEqual(true);
});

test('deep equals', () => {
  expect(deepEquals([], [])).toEqual(true);
  expect(deepEquals([], [1])).toEqual(false);

  expect(deepEquals({}, {})).toEqual(true);
  expect(deepEquals({}, { a: 1 })).toEqual(false);

  let o: any = { a: 1, b: [2, { c: false }, null] };
  expect(deepEquals(o, o)).toEqual(true);
  expect(deepEquals(o, { a: 1, b: [3, { c: false }, null] })).toEqual(false);
  expect(deepEquals(o, { a: 1 })).toEqual(false);
  expect(deepEquals(o, { a: 1, b: [2, { c: false }, null], d: 3 })).toEqual(false);
  expect(deepEquals(o, { a: 1, b: [] })).toEqual(false);

  o = { a: { b: { c: { d: 789 } } } };
  expect(deepEquals(o, o)).toEqual(true);
  expect(deepEquals(o, { a: { b: [1, 2, 3] } })).toEqual(false);

  const common = { x: { y: 123 } };
  o = { a: { b: common } };
  expect(deepEquals(o, o)).toEqual(true);
  expect(deepEquals(o, { a: { b: common } })).toEqual(true);

  // refrerence cycle
  o = { a: { b: null } };
  o.a.b = o;
  expect(deepEquals(o, o)).toEqual(true);

  deepEquals({ a: { c: 1 }, b: { c: 1 } }, { a: { c: 1 }, b: { c: 1 } });
});

test('string compare', () => {
  expect(stringCompare('', 'aaa')).toEqual(-3);
  expect(stringCompare('aaa', '')).toEqual(3);
  expect(stringCompare('aaa', 'aaa')).toEqual(0);
  expect(stringCompare('aaa', 'bbb')).toEqual(-1);
  expect(stringCompare('bbb', 'aaa')).toEqual(1);
});

test('repeat', () => {
  expect(repeat(3, 'a')).toEqual('aaa');
  expect(repeat(5, 'xyz')).toEqual('xyzxyzxyzxyzxyz');
});

test('deep merge', () => {
  const foo = Object.freeze({ a: { b: 1, c: [1, 2, 3] } });
  const bar = Object.freeze({ b: 3.14159, d: { e: 'hello, world' } });
  let obj: any = { c: 'nothing' };
  let result = deepMerge(obj, foo, bar);
  expect(result).toEqual({
    a: { b: 1, c: [1, 2, 3] },
    b: 3.14159,
    c: 'nothing',
    d: { e: 'hello, world' },
  });

  obj = { a: 1, b: 2, c: 3 };
  result = deepMerge(obj, foo);
  expect(result).toEqual(obj);

  obj = { a: 1, c: 3 };
  result = deepMerge(obj, bar);
  expect(result).toEqual({
    a: 1,
    b: 3.14159,
    c: 3,
    d: { e: 'hello, world' },
  });
});

test('deep copy', () => {
  const foo = { a: 1, b: 'hello', c: { d: 3.14, e: [1, 2, 3] } };
  const bar = deepCopy(foo);
  expect(foo).toEqual(bar);
  expect(foo).not.toBe(bar);
});

test('remove tags', () => {
  const src = '<b>bold</b><div><i>italics</i></div>';
  const dst = removeTags(src);
  expect(dst).toEqual(' bold   italics  ');
});
