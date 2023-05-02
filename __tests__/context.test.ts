import { Context } from '../src/context';
import { MISSING_NODE, Node } from '../src/node';
import { Variable } from '../src/variable';
import { Opcode } from '../src/opcodes';
import { Code } from '../src/instructions';

test('node constructor', () => {
  const ctx = new Context(new Node(123));
  expect(ctx.node()).toEqual(new Node(123));
});

test('injects', () => {
  const ctx = new Context(123, { injects: { foo: new Node(123) } });
  expect(ctx.getInjectable('foo')).toEqual(new Node(123));
});

test('buffer append', () => {
  const ctx = new Context({});
  expect(ctx.render()).toEqual('');
  ctx.append('a');
  expect(ctx.render()).toEqual('a');
});

test('invalid push', () => {
  const ctx = new Context({ a: { b: 1 } });
  ctx.pushSection([]);
  expect(ctx.frame().node).toBe(MISSING_NODE);
});

test('push / pop', () => {
  const o1 = { a: { b: [1, 2, 3] } };
  const ctx = new Context(o1);
  expect(ctx.node().value).toEqual(o1);
  expect(ctx.frame().node.value).toEqual(o1);
  ctx.pushSection(['a']);
  expect(ctx.frame().node.value).toEqual({ b: [1, 2, 3] });
  ctx.pop();
  expect(ctx.frame().node.value).toEqual(o1);

  ctx.pushSection(['a', 'b']);
  expect(ctx.frame().node.value).toEqual([1, 2, 3]);
  ctx.pushSection([1]);
  expect(ctx.frame().node.value).toEqual(2);
  ctx.pop();
  expect(ctx.frame().node.value).toEqual([1, 2, 3]);
  ctx.pop();
  expect(ctx.frame().node.value).toEqual(o1);

  ctx.pushSection(['@']);
  expect(ctx.frame().node.value).toEqual(o1);
  ctx.pop();
  expect(ctx.frame().node.value).toEqual(o1);
});

test('parent', () => {
  const o = { a: { b: 2 } };
  const ctx = new Context(o);

  // root frame's parent is itself
  expect(ctx.parent().node.value).toEqual(o);

  ctx.pushSection(['a']);
  expect(ctx.parent().node.value).toEqual(o);
});

test('variable resolution', () => {
  const o1 = { a: { b: [1, 2, { c: 4 }] } };
  const ctx = new Context(o1);

  expect(ctx.resolve(['a', 'b']).value).toEqual([1, 2, { c: 4 }]);
  ctx.pushSection(['a']);
  expect(ctx.resolve(['a', 'b']).value).toEqual([1, 2, { c: 4 }]);
  ctx.pushSection(['b']);
  expect(ctx.resolve(['a', 'b']).value).toEqual([1, 2, { c: 4 }]);
  ctx.pop();
  ctx.pop();
});

test('resolve arg', () => {
  const o = { a: { b: [1, 2, 3] } };
  const ctx = new Context(o);

  expect(ctx.resolveArg(['a', 'b']).value).toEqual([1, 2, 3]);
});

test('lookup stack', () => {
  const o1 = { a: { b: [1, 2, { c: [4, 5] }] }, d: [6, 7] };
  const ctx = new Context(o1);
  ctx.pushSection(['a', 'b', 2]);

  expect(ctx.lookupStack('a').value).toEqual({ b: [1, 2, { c: [4, 5] }] });
  expect(ctx.lookupStack('b')).toBe(MISSING_NODE);

  expect(ctx.lookupStack('d').value).toEqual([6, 7]);
  expect(ctx.lookupStack('x')).toBe(MISSING_NODE);

  ctx.pop();
  expect(ctx.lookupStack('a').value).toEqual({ b: [1, 2, { c: [4, 5] }] });

  ctx.pushSection(['a']);
  ctx.pushSection(['b']);
  expect(ctx.lookupStack('a').value).toEqual({ b: [1, 2, { c: [4, 5] }] });
  expect(ctx.lookupStack('b').value).toEqual([1, 2, { c: [4, 5] }]);
  ctx.pop();
  ctx.pop();
  expect(ctx.lookupStack('a').value).toEqual({ b: [1, 2, { c: [4, 5] }] });
  expect(ctx.lookupStack('b')).toBe(MISSING_NODE);
});

test('frame stop resolution', () => {
  const o1 = { a: { b: { c: 1 } } };
  const ctx = new Context(o1);

  ctx.pushSection(['a']);
  ctx.pushSection(['b']);
  expect(ctx.lookupStack('a').value).toEqual({ b: { c: 1 } });
  expect(ctx.lookupStack('b').value).toEqual({ c: 1 });
  ctx.pop();
  ctx.pop();

  ctx.pushSection(['a']);
  ctx.stopResolution(true);
  ctx.pushSection(['b']);
  expect(ctx.lookupStack('a')).toBe(MISSING_NODE);
  expect(ctx.lookupStack('b').value).toEqual({ c: 1 });
  ctx.pop();
  ctx.pop();
});

test('new variable', () => {
  const ctx = new Context({ a: { b: { c: 1 } } });
  const v = ctx.newVariable('', ctx.resolve(['a', 'b', 'c']));
  expect(v.node.value).toEqual(1);
});

test('set variable', () => {
  const ctx = new Context({ a: { b: { c: 1 } } });
  ctx.pushSection(['a']);
  ctx.setVar('@foo', new Variable('@foo', new Node(5)));
  expect(ctx.lookupStack('@foo').value).toEqual(5);

  ctx.pushSection(['b']);
  expect(ctx.lookupStack('@foo').value).toEqual(5);

  ctx.pop();
  expect(ctx.lookupStack('@foo').value).toEqual(5);

  ctx.pop();
  expect(ctx.lookupStack('@foo')).toBe(MISSING_NODE);
});

test('set macro', () => {
  const ctx = new Context({});
  const inst: Code = [Opcode.ROOT, 1, [[Opcode.TEXT, 'Hi']], Opcode.EOF];
  ctx.setMacro('foo', inst);
  expect(ctx.getPartial('foo')).toEqual(inst);
});

test('too many pops', () => {
  const ctx = new Context({ a: 1 });
  ctx.pushSection(['a']);
  ctx.pop();
  expect(() => ctx.pop()).toThrowError(Error);
});

test('resolve missing', () => {
  const ctx = new Context({ a: 1 });
  expect(ctx.resolve([])).toBe(MISSING_NODE);
  expect(ctx.resolve(['x'])).toBe(MISSING_NODE);
});
