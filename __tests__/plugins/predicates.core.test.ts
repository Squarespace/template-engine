import { join } from 'path';
import { Context } from '../../src/context';
import { CORE_PREDICATES as Core } from '../../src/plugins/predicates.core';
import { TemplateTestLoader } from '../loader';

const loader = new TemplateTestLoader(join(__dirname, 'resources'));

loader.paths('p-debug-%N.html').forEach((path) => {
  test(`debug - ${path}`, () => loader.execute(path));
});

loader.paths('p-comparisons-%N.html').forEach((path) => {
  test(`comparisons - ${path}`, () => loader.execute(path));
});

loader.paths('p-even-odd-%N.html').forEach((path) => {
  test(`even-odd - ${path}`, () => loader.execute(path));
});

loader.paths('p-nth-%N.html').forEach((path) => {
  test(`nth - ${path}`, () => loader.execute(path));
});

test('debug?', () => {
  const impl = Core['debug?'];

  let ctx = new Context({ a: 1 });
  expect(impl.apply([], ctx)).toEqual(false);

  ctx = new Context({ debug: false, a: { b: 1 } });
  ctx.pushSection(['a']);
  expect(impl.apply([], ctx)).toEqual(false);

  ctx = new Context({ debug: true, a: { b: 1 } });
  ctx.pushSection(['a']);
  expect(impl.apply([], ctx)).toEqual(true);
});

test('equal?', () => {
  const impl = Core['equal?'];

  let ctx = new Context(3);
  expect(impl.apply([], ctx)).toEqual(false);

  ctx = new Context(3);
  expect(impl.apply(['3'], ctx)).toEqual(true);
  expect(impl.apply(['4'], ctx)).toEqual(false);
  expect(impl.apply(['foo'], ctx)).toEqual(false);

  ctx = new Context({ a: 1, b: 1 });
  expect(impl.apply(['1', 'a'], ctx)).toEqual(true);
  expect(impl.apply(['a', '1'], ctx)).toEqual(true);
  expect(impl.apply(['a', 'b'], ctx)).toEqual(true);
  expect(impl.apply(['b', 'a'], ctx)).toEqual(true);

  expect(impl.apply(['2', 'a'], ctx)).toEqual(false);
  expect(impl.apply(['a', '2'], ctx)).toEqual(false);

  ctx = new Context({ a: 1, b: 2 });
  expect(impl.apply(['a', 'b'], ctx)).toEqual(false);
  expect(impl.apply(['b', 'a'], ctx)).toEqual(false);

  ctx = new Context({ a: [1, 2], b: [1, 2], c: [1, 3] });
  expect(impl.apply(['a', 'b'], ctx)).toEqual(true);
  expect(impl.apply(['b', 'a'], ctx)).toEqual(true);
  expect(impl.apply(['a', 'c'], ctx)).toEqual(false);
  expect(impl.apply(['c', 'a'], ctx)).toEqual(false);

  ctx = new Context('foo');
  expect(impl.apply(['"foo"'], ctx)).toEqual(true);
});

test('even?', () => {
  const impl = Core['even?'];
  let ctx = new Context(1);
  expect(impl.apply([], ctx)).toEqual(false);

  ctx = new Context(4);
  expect(impl.apply([], ctx)).toEqual(true);

  ctx = new Context({ a: 7, b: 10 });
  expect(impl.apply(['a'], ctx)).toEqual(false);
  expect(impl.apply(['b'], ctx)).toEqual(true);

  ctx = new Context({ a: 'foo' });
  expect(impl.apply(['a'], ctx)).toEqual(false);
});

test('greaterThan?', () => {
  const impl = Core['greaterThan?'];

  let ctx = new Context(3);
  expect(impl.apply([], ctx)).toEqual(false);

  ctx = new Context(3);
  expect(impl.apply(['1'], ctx)).toEqual(true);
  expect(impl.apply(['3'], ctx)).toEqual(false);
  expect(impl.apply(['10'], ctx)).toEqual(false);

  ctx = new Context({ a: 3 });
  expect(impl.apply(['1', 'a'], ctx)).toEqual(false);
  expect(impl.apply(['3', 'a'], ctx)).toEqual(false);
  expect(impl.apply(['10', 'a'], ctx)).toEqual(true);

  expect(impl.apply(['a', '1'], ctx)).toEqual(true);
  expect(impl.apply(['a', '3'], ctx)).toEqual(false);
  expect(impl.apply(['a', '10'], ctx)).toEqual(false);

  ctx = new Context('bbb');
  expect(impl.apply(['"aaa"'], ctx)).toEqual(true);
  expect(impl.apply(['"bbb"'], ctx)).toEqual(false);
  expect(impl.apply(['"ccc"'], ctx)).toEqual(false);
});

test('greaterThanOrEqual?', () => {
  const impl = Core['greaterThanOrEqual?'];

  let ctx = new Context(3);
  expect(impl.apply([], ctx)).toEqual(false);

  ctx = new Context(3);
  expect(impl.apply(['1'], ctx)).toEqual(true);
  expect(impl.apply(['3'], ctx)).toEqual(true);
  expect(impl.apply(['10'], ctx)).toEqual(false);

  ctx = new Context({ a: 3 });
  expect(impl.apply(['1', 'a'], ctx)).toEqual(false);
  expect(impl.apply(['3', 'a'], ctx)).toEqual(true);
  expect(impl.apply(['10', 'a'], ctx)).toEqual(true);

  expect(impl.apply(['a', '1'], ctx)).toEqual(true);
  expect(impl.apply(['a', '3'], ctx)).toEqual(true);
  expect(impl.apply(['a', '10'], ctx)).toEqual(false);
});

test('lessThan?', () => {
  const impl = Core['lessThan?'];

  let ctx = new Context(3);
  expect(impl.apply([], ctx)).toEqual(false);

  ctx = new Context(3);
  expect(impl.apply(['1'], ctx)).toEqual(false);
  expect(impl.apply(['3'], ctx)).toEqual(false);
  expect(impl.apply(['10'], ctx)).toEqual(true);

  ctx = new Context({ a: 3 });
  expect(impl.apply(['1', 'a'], ctx)).toEqual(true);
  expect(impl.apply(['3', 'a'], ctx)).toEqual(false);
  expect(impl.apply(['10', 'a'], ctx)).toEqual(false);

  expect(impl.apply(['a', '1'], ctx)).toEqual(false);
  expect(impl.apply(['a', '3'], ctx)).toEqual(false);
  expect(impl.apply(['a', '10'], ctx)).toEqual(true);
});

test('lessThanOrEqual?', () => {
  const impl = Core['lessThanOrEqual?'];

  let ctx = new Context(3);
  expect(impl.apply([], ctx)).toEqual(false);

  ctx = new Context(3);
  expect(impl.apply(['1'], ctx)).toEqual(false);
  expect(impl.apply(['3'], ctx)).toEqual(true);
  expect(impl.apply(['10'], ctx)).toEqual(true);

  ctx = new Context({ a: 3 });
  expect(impl.apply(['1', 'a'], ctx)).toEqual(true);
  expect(impl.apply(['3', 'a'], ctx)).toEqual(true);
  expect(impl.apply(['10', 'a'], ctx)).toEqual(false);

  expect(impl.apply(['a', '1'], ctx)).toEqual(false);
  expect(impl.apply(['a', '3'], ctx)).toEqual(true);
  expect(impl.apply(['a', '10'], ctx)).toEqual(true);
});

test('notEqual?', () => {
  const impl = Core['notEqual?'];

  let ctx = new Context(3);
  expect(impl.apply([], ctx)).toEqual(false);

  ctx = new Context(3);
  expect(impl.apply(['1'], ctx)).toEqual(true);
  expect(impl.apply(['3'], ctx)).toEqual(false);
  expect(impl.apply(['10'], ctx)).toEqual(true);

  ctx = new Context({ a: 3 });
  expect(impl.apply(['1', 'a'], ctx)).toEqual(true);
  expect(impl.apply(['3', 'a'], ctx)).toEqual(false);
  expect(impl.apply(['10', 'a'], ctx)).toEqual(true);

  expect(impl.apply(['a', '1'], ctx)).toEqual(true);
  expect(impl.apply(['a', '3'], ctx)).toEqual(false);
  expect(impl.apply(['a', '10'], ctx)).toEqual(true);
});

test('nth?', () => {
  const impl = Core['nth?'];

  let ctx = new Context(3);
  expect(impl.apply([], ctx)).toEqual(false);

  ctx = new Context(3);
  expect(impl.apply(['0'], ctx)).toEqual(false);
  expect(impl.apply(['3'], ctx)).toEqual(true);
  expect(impl.apply(['4'], ctx)).toEqual(false);
  expect(impl.apply(['"foo"'], ctx)).toEqual(false);

  ctx = new Context('abc');
  expect(impl.apply(['3'], ctx)).toEqual(false);

  ctx = new Context({});
  expect(impl.apply(['3', '3'], ctx)).toEqual(true);
  expect(impl.apply(['3', '4'], ctx)).toEqual(false);
  expect(impl.apply(['3', '9'], ctx)).toEqual(false);
  expect(impl.apply(['9', '3'], ctx)).toEqual(true);

  expect(impl.apply(['0', '3'], ctx)).toEqual(true);
  expect(impl.apply(['3', '0'], ctx)).toEqual(false);
});

test('odd?', () => {
  const impl = Core['odd?'];
  let ctx = new Context(1);
  expect(impl.apply([], ctx)).toEqual(true);

  ctx = new Context(4);
  expect(impl.apply([], ctx)).toEqual(false);

  ctx = new Context({ a: 7, b: 10 });
  expect(impl.apply(['a'], ctx)).toEqual(true);
  expect(impl.apply(['b'], ctx)).toEqual(false);

  ctx = new Context({ a: 'foo' });
  expect(impl.apply(['a'], ctx)).toEqual(false);
});

loader.paths('p-plural-%N.html').forEach((path) => {
  test(`plural - ${path}`, () => loader.execute(path));
});

test('plural?', () => {
  const impl = Core['plural?'];
  let ctx = new Context('1');
  expect(impl.apply([], ctx)).toEqual(false);

  ctx = new Context('3');
  expect(impl.apply([], ctx)).toEqual(true);

  ctx = new Context({ a: 'foo' });
  expect(impl.apply([], ctx)).toEqual(false);
});

loader.paths('p-singular-%N.html').forEach((path) => {
  test(`singular - ${path}`, () => loader.execute(path));
});

test('singular?', () => {
  const impl = Core['singular?'];
  let ctx = new Context('1');
  expect(impl.apply([], ctx)).toEqual(true);

  ctx = new Context('3');
  expect(impl.apply([], ctx)).toEqual(false);

  ctx = new Context({ a: 'foo' });
  expect(impl.apply([], ctx)).toEqual(false);
});
