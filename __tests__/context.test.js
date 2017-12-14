import Context from '../src/context';
import Node, { MISSING_NODE } from '../src/node';
import { EOF, ROOT, TEXT } from '../src/opcodes';


test('node constructor', () => {
  const ctx = new Context(new Node(123));
  expect(ctx.node()).toEqual(new Node(123));
});


test('injectables', () => {
  const ctx = new Context(123, { injectables: { foo: new Node(123) } });
  expect(ctx.getInjectable('foo')).toEqual(new Node(123));
});


test('buffer append', () => {
  const ctx = new Context({});
  expect(ctx.buf).toEqual('');
  ctx.append('a');
  expect(ctx.buf).toEqual('a');
});


test('invalid push', () => {
  const ctx = new Context( { a: { b: 1 } });
  ctx.pushNames([]);
  expect(ctx.frame.node).toBe(MISSING_NODE);
});


test('push / pop', () => {
  const o1 = { a: { b: [1, 2, 3] } };
  const ctx = new Context(o1);
  expect(ctx.node().value).toEqual(o1);
  expect(ctx.frame.node.value).toEqual(o1);
  ctx.pushNames(['a']);
  expect(ctx.frame.node.value).toEqual({ b: [1, 2, 3] });
  ctx.pop();
  expect(ctx.frame.node.value).toEqual(o1);

  ctx.pushNames(['a', 'b']);
  expect(ctx.frame.node.value).toEqual([1, 2, 3]);
  ctx.pushNames([1]);
  expect(ctx.frame.node.value).toEqual(2);
  ctx.pop();
  expect(ctx.frame.node.value).toEqual([1, 2, 3]);
  ctx.pop();
  expect(ctx.frame.node.value).toEqual(o1);

  ctx.pushNames(['@']);
  expect(ctx.frame.node.value).toEqual(o1);
  ctx.pop();
  expect(ctx.frame.node.value).toEqual(o1);
});


test('variable resolution', () => {
  const o1 = { a: { b: [1, 2, { c: 4 }] } };
  const ctx = new Context(o1);

  expect(ctx.resolve(['a', 'b']).value).toEqual([1, 2, { c: 4 }]);
  ctx.pushNames(['a']);
  expect(ctx.resolve(['a', 'b']).value).toEqual([1, 2, { c: 4 }]);
  ctx.pushNames(['b']);
  expect(ctx.resolve(['a', 'b']).value).toEqual([1, 2, { c: 4 }]);
  ctx.pop();
  ctx.pop();
});


test('lookup stack', () => {
  const o1 = { a: { b: [1, 2, { c: [4, 5] }] }, d: [6, 7] };
  const ctx = new Context(o1);
  ctx.pushNames(['a', 'b', 2]);

  expect(ctx.lookupStack('a').value).toEqual({ b: [1, 2, { c: [4, 5] }] });
  expect(ctx.lookupStack('b')).toBe(MISSING_NODE);

  expect(ctx.lookupStack('d').value).toEqual([6, 7]);
  expect(ctx.lookupStack('x')).toBe(MISSING_NODE);

  ctx.pop();
  expect(ctx.lookupStack('a').value).toEqual({ b: [1, 2, { c: [4, 5] }] });

  ctx.pushNames(['a']);
  ctx.pushNames(['b']);
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

  ctx.pushNames(['a']);
  ctx.pushNames(['b']);
  expect(ctx.lookupStack('a').value).toEqual({ b: { c: 1 } });
  expect(ctx.lookupStack('b').value).toEqual({ c: 1 });
  ctx.pop();
  ctx.pop();

  ctx.pushNames(['a']);
  ctx.stopResolution(true);
  ctx.pushNames(['b']);
  expect(ctx.lookupStack('a')).toBe(MISSING_NODE);
  expect(ctx.lookupStack('b').value).toEqual({ c: 1 });
  ctx.pop();
  ctx.pop();
});


test('set variable', () => {
  const ctx = new Context({ a: { b: { c: 1 } } });
  ctx.pushNames(['a']);
  ctx.setVar('@foo', new Node(5));
  expect(ctx.lookupStack('@foo').value).toEqual(5);

  ctx.pushNames(['b']);
  expect(ctx.lookupStack('@foo').value).toEqual(5);

  ctx.pop();
  expect(ctx.lookupStack('@foo').value).toEqual(5);

  ctx.pop();
  expect(ctx.lookupStack('@foo')).toBe(MISSING_NODE);
});


test('set macro', () => {
  const ctx = new Context({});
  const inst = [ROOT, 1, [
    [TEXT, 'Hi']
  ], EOF];
  ctx.setMacro('foo', inst);
  expect(ctx.getPartial('foo')).toEqual(inst);
});


test('too many pops', () => {
  const ctx = new Context({ a: 1 });
  ctx.pushNames(['a']);
  ctx.pop();
  expect(() => ctx.pop()).toThrowError(Error);
});
