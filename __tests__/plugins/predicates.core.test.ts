import { join } from 'path';
import { CompatLevel } from '../../src/compat/compat-level';
import { Compiler } from '../../src/compiler';
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

loader.paths('f-nth-modulo-zero-%N.html').forEach((path) => {
  test(`nth modulo zero - ${path}`, () => loader.execute(path));
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

  // A zero modulus only returns false once fixed; legacy throws instead.
  ctx = new Context(3, { compat: CompatLevel.fixed() });
  expect(impl.apply(['0'], ctx)).toEqual(false);

  ctx = new Context({}, { compat: CompatLevel.fixed() });
  expect(impl.apply(['3', '0'], ctx)).toEqual(false);
});

test('nth? zero modulus', () => {
  const compiler = new Compiler();
  const impl = Core['nth?'];
  const render = (template: string, compat?: CompatLevel, json: any = { n: 6 }) => {
    const { ctx, errors } = compiler.execute({ code: template, json, compat });
    return { output: ctx.render(), errors };
  };

  // Legacy, a zero modulus reaches the division. The engine records the
  // throw at the block level and skips both branches of the if.
  const legacy = render('X{.nth? n 0}A{.or}B{.end}Y');
  expect(legacy.errors.length).toEqual(1);
  expect(legacy.errors[0].type).toEqual('engine');
  expect(legacy.errors[0].message).toContain('ArithmeticException');
  expect(legacy.errors[0].message).toContain('/ by zero');
  expect(legacy.output).toEqual('XY');

  // The direct call throws the same shape as the mod formatter.
  expect(() => impl.apply(['0'], new Context(6))).toThrow('/ by zero');

  // Fixed, a zero modulus is not a match and the .or clause renders.
  for (const compat of [CompatLevel.at(1), CompatLevel.fixed()]) {
    const fixed = render('X{.nth? n 0}A{.or}B{.end}Y', compat);
    expect(fixed.errors).toEqual([]);
    expect(fixed.output).toEqual('XBY');
  }

  // The integrality guard runs before the zero modulus branch, so none of
  // these throw at either level.
  for (const compat of [CompatLevel.defaultLevel(), CompatLevel.fixed()]) {
    // A nonzero modulus matches.
    expect(render('{.nth? n 3}A{.or}B{.end}', compat).output).toEqual('A');

    // A fractional value is not integral and never reaches the division.
    const frac = render('{.nth? n 0}A{.or}B{.end}', compat, { n: 6.5 });
    expect(frac.errors).toEqual([]);
    expect(frac.output).toEqual('B');

    // A text modulus fails the integrality guard without an error.
    const text = render('{.nth? n "0"}A{.or}B{.end}', compat);
    expect(text.errors).toEqual([]);
    expect(text.output).toEqual('B');
  }
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
