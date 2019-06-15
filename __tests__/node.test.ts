import { Node, MISSING_NODE } from '../src/node';
import { Type } from '../src/types';


test('node is null', () => {
  const n1 = new Node(null);
  expect(n1.isNull()).toEqual(true);

  const n2 = new Node(undefined);
  expect(n2.isNull()).toEqual(false);

  const n3 = new Node(123);
  expect(n3.isNull()).toEqual(false);

  const n4 = new Node('abc');
  expect(n4.isNull()).toEqual(false);

  expect(MISSING_NODE.isNull()).toEqual(false);
});


test('node is missing', () => {
  const n1 = new Node(undefined);
  expect(n1.isMissing()).toEqual(true);

  const n2 = new Node(NaN);
  expect(n2.isMissing()).toEqual(true);

  const n3 = new Node('abc');
  expect(n3.isMissing()).toEqual(false);

  const n4 = new Node(123);
  expect(n4.isMissing()).toEqual(false);

  expect(MISSING_NODE.isMissing()).toEqual(true);
});


test('node size', () => {
  const n1 = new Node(false);
  expect(n1.size()).toEqual(0);

  const n2 = new Node({});
  expect(n2.size()).toEqual(0);

  const n3 = new Node({ a: 1, b: 2 });
  expect(n3.size()).toEqual(2);

  const n4 = new Node([]);
  expect(n4.size()).toEqual(0);

  const n5 = new Node([1, 2, 3, 4]);
  expect(n5.size()).toEqual(4);

  const n6 = new Node('hello, world');
  expect(n6.size()).toEqual(0);
});


test('node path resolution', () => {
  const o1 = { a: { b: { c: 123 } } };
  const n1 = new Node(o1);

  expect(n1.value).toEqual(o1);
  expect(n1.type).toEqual(Type.OBJECT);

  expect(n1.path([]).value).toEqual(o1);
  expect(n1.path([]).type).toEqual(Type.OBJECT);

  expect(n1.path(['a', 'b', 'c']).value).toEqual(123);
  expect(n1.path(['a', 'b', 'c']).type).toEqual(Type.NUMBER);

  expect(n1.path(['a', 'x'])).toBe(MISSING_NODE);

  const o2 = [{ a: 1 }];
  const n2 = new Node(o2);

  expect(n2.value).toEqual(o2);
  expect(n2.type).toEqual(Type.ARRAY);
  expect(n2.path([]).value).toEqual([{ a: 1 }]);
  expect(n2.path([]).type).toEqual(Type.ARRAY);

  expect(n2.path([0]).value).toEqual({ a: 1 });
  expect(n2.path([0]).type).toEqual(Type.OBJECT);

  expect(n2.path([0, 'a']).value).toEqual(1);
  expect(n2.path([0, 'a']).type).toEqual(Type.NUMBER);

  expect(n2.path([1, 'a'])).toBe(MISSING_NODE);

  const o3 = [{ a: [1, 2, { b: [3, 4, 5] }] }];
  const n3 = new Node(o3);

  expect(n3.value).toEqual(o3);
  expect(n3.type).toEqual(Type.ARRAY);

  expect(n3.path([]).value).toEqual(o3);
  expect(n3.path([]).type).toEqual(Type.ARRAY);

  expect(n3.path([0, 'a', 2]).value).toEqual( { b: [3, 4, 5] });
  expect(n3.path([0, 'a', 2]).type).toEqual(Type.OBJECT);

  expect(n3.path([0, 'a', 2, 'b', 2]).value).toEqual(5);
  expect(n3.path([0, 'a', 2, 'b', 2]).type).toEqual(Type.NUMBER);

  expect(n3.path([1, 'a', 2])).toBe(MISSING_NODE);
  expect(n3.path([0, 'a', 5])).toBe(MISSING_NODE);
  expect(n3.path([0, 'd'])).toBe(MISSING_NODE);
  expect(n3.path([0, 'a', 'b'])).toBe(MISSING_NODE);

  const n4 = MISSING_NODE;

  expect(n4.path([])).toBe(MISSING_NODE);
  expect(n4.path(['a'])).toBe(MISSING_NODE);
});


test('node get by key', () => {
  const n1 = new Node({ a: 1 });
  expect(n1.get('a').value).toEqual(1);
  expect(n1.get('b')).toBe(MISSING_NODE);

  expect(MISSING_NODE.get('a')).toBe(MISSING_NODE);
});


test('as string', () => {
  let n = new Node({ a: 1 });
  expect(n.asString()).toEqual('{"a":1}');

  n = new Node(false);
  expect(n.asString()).toEqual('false');

  n = new Node(true);
  expect(n.asString()).toEqual('true');

  n = new Node(123);
  expect(n.asString()).toEqual('123');

  n = new Node(NaN);
  expect(n.asString()).toEqual('');

  n = new Node(null);
  expect(n.asString()).toEqual('');

  n = MISSING_NODE;
  expect(n.asString()).toEqual('');
});


test('as number', () => {
  let n = new Node(123);
  expect(n.asNumber()).toEqual(123);

  n = new Node('3.14159');
  expect(n.asNumber()).toEqual(3.14159);

  n = new Node('12345');
  expect(n.asNumber()).toEqual(12345);

  n = new Node(false);
  expect(n.asNumber()).toEqual(0);

  n = new Node(true);
  expect(n.asNumber()).toEqual(1);

  n = new Node({});
  expect(n.asNumber()).toEqual(0);

  n = new Node({ a: 1 });
  expect(n.asNumber()).toEqual(0);

  n = new Node([]);
  expect(n.asNumber()).toEqual(0);

  n = new Node([1, 2, 3]);
  expect(n.asNumber()).toEqual(0);

  n = new Node(NaN);
  expect(n.asNumber()).toEqual(0);
});


test('equals', () => {
  let n = new Node(123);
  expect(n.equals(123)).toEqual(true);
  expect(n.equals(124)).toEqual(false);
  expect(n.equals({})).toEqual(false);
});


test('comparisons', () => {
  const compare = (v1: any, v2: any) => new Node(v1).compare(v2);

  expect(compare(1, 1)).toEqual(0);
  expect(compare(1, 0)).toEqual(1);
  expect(compare(0, 1)).toEqual(-1);
  expect(compare(1, 123)).toEqual(-1);
  expect(compare(1, -123)).toEqual(1);

  expect(compare(1.1, 1.1)).toEqual(0);
  expect(compare(1.1, 0)).toEqual(1);
  expect(compare(0, 1.1)).toEqual(-1);

  const pi = 3.14159;
  expect(compare(pi, pi)).toEqual(0);
  expect(compare(-pi, pi)).toEqual(-1);
  expect(compare(pi, -pi)).toEqual(1);

  expect(compare(true, true)).toEqual(0);
  expect(compare(false, true)).toEqual(-1);
  expect(compare(true, false)).toEqual(1);

  expect(compare(true, 1)).toEqual(0);
  expect(compare(true, 0)).toEqual(1);
  expect(compare(false, 1)).toEqual(-1);

  // Note: several comparisons are un-intuitive since the right
  // value is always cast to the left's type.

  expect(compare(pi, true)).toEqual(1);
  expect(compare(true, pi)).toEqual(1);
  expect(compare(false, pi)).toEqual(0);

  expect(compare('', false)).toEqual(-5);
  expect(compare(false, '')).toEqual(0);
  expect(compare('false', false)).toEqual(0);
  expect(compare(false, 'false')).toEqual(0);
  expect(compare('true', true)).toEqual(0);
  expect(compare(true, 'true')).toEqual(0);
  expect(compare(false, 'xyz')).toEqual(0);
  expect(compare('xyz', false)).toEqual(18);

  expect(compare(true, {})).toEqual(1);

  expect(compare({}, {})).toEqual(0);
  expect(compare('', {})).toEqual(-2);
  expect(compare({}, '')).toEqual(-1);
  expect(compare({}, [])).toEqual(-1);
  expect(compare([], {})).toEqual(-1);
});
