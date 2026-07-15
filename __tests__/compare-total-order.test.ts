import { join } from 'path';
import { Context } from '../src/context';
import { CompatLevel } from '../src/compat/compat-level';
import { Node } from '../src/node';
import { CORE_PREDICATES as Core } from '../src/plugins/predicates.core';
import { TemplateTestLoader } from './loader';

/**
 * Port of the Java comparison-order tests (JsonUtilsTest.testCompareLegacyOrder,
 * testCompareCrossTypes, testCompareTotalOrder and CorePredicatesTest
 * gated on Patch.COMPARE_TOTAL_ORDER). The released order stays the default
 * for the two-arg compare and for a level 0 context; the total order applies
 * at the patch threshold and above.
 */

const fixtures = new TemplateTestLoader(join(__dirname, 'plugins', 'resources'));

fixtures.paths('f-compare-total-order-%N.html').forEach((path) => {
  test(`compare-total-order fixtures - ${path}`, () => fixtures.execute(path));
});

const legacy = (a: any, b: any) => new Node(a).compare(b);
const fixed = (a: any, b: any) => new Node(a).compare(b, false);

test('released order keys off the left operand', () => {
  // A fractional right operand truncates to long.
  expect(legacy(2, 2.5)).toBe(0);
  expect(legacy(2, 2.001)).toBe(0);

  // Text vs number compares whichever way the left side chooses, so the
  // two directions disagree with each other.
  expect(legacy('5', 40)).toBe(1);
  expect(legacy(40, '5')).toBe(1);

  // A null right side is a raw string diff against text.
  expect(legacy(null, 'a')).toBe(-1);
  expect(legacy('a', null)).toBe(-13);
});

test('total order compares numbers by value', () => {
  expect(fixed(2, 2.5)).toBe(-1);
  expect(fixed(2.5, 2)).toBe(1);
  expect(fixed(2, 2.0)).toBe(0);
});

test('total order ranks mixed types', () => {
  // Text ranks below numbers, booleans above them.
  expect(fixed('5', 40)).toBe(-1);
  expect(fixed(40, '5')).toBe(1);
  expect(fixed(true, 'true')).toBe(1);
  expect(fixed('true', true)).toBe(-1);
  expect(fixed(true, 1)).toBe(1);

  // Missing and null are both "nothing" and compare equal.
  expect(fixed(null, undefined)).toBe(0);
  expect(fixed(undefined, null)).toBe(0);
  expect(fixed(null, 'a')).toBe(-1);
  expect(fixed('a', null)).toBe(1);
  expect(fixed(null, 1)).toBe(-1);
  expect(fixed(1, null)).toBe(1);

  // Composites have no natural order and fall back to equality.
  expect(fixed({ a: 1 }, { a: 1 })).toBe(0);
  expect(fixed({}, [])).toBe(-1);
});

test('total order handles NaN like a value equal only to itself', () => {
  expect(fixed(NaN, 1.0)).toBe(-1);
  expect(fixed(1.0, NaN)).toBe(1);
  expect(fixed(NaN, NaN)).toBe(0);
});

test('total order is antisymmetric and transitive', () => {
  // Port of the Java property test over scalar kinds.
  const nodes = [
    new Node(undefined),
    new Node(null),
    new Node('z'),
    new Node(1),
    new Node(2),
    new Node(2.5),
    new Node(false),
    new Node(true),
  ];
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    for (let j = 0; j < nodes.length; j++) {
      const b = nodes[j];
      if (i === j) {
        expect(a.compare(b, false)).toBe(0);
      }
      const ab = a.compare(b, false);
      // A zero result negates to -0, the same comparison outcome.
      expect(ab).toBe(-b.compare(a, false) || 0);
      for (let k = 0; k < nodes.length; k++) {
        const c = nodes[k];
        if (ab < 0 && b.compare(c, false) < 0) {
          expect(a.compare(c, false)).toBeLessThan(0);
        }
      }
    }
  }
});

const gt = (args: string[], ctx: Context) => Core['greaterThan?'].apply(args, ctx);
const gte = (args: string[], ctx: Context) => Core['greaterThanOrEqual?'].apply(args, ctx);
const lt = (args: string[], ctx: Context) => Core['lessThan?'].apply(args, ctx);
const eq = (args: string[], ctx: Context) => Core['equal?'].apply(args, ctx);

const fixedCtx = (root: any) => {
  const ctx = new Context(root);
  ctx.setCompat(CompatLevel.fixed());
  return ctx;
};

test('ordering predicates, released order at the default level', () => {
  const ctx = new Context(2);
  expect(gte(['2', '2.5'], ctx)).toBe(true);
  expect(lt(['2', '2.001'], ctx)).toBe(false);
  expect(gt(['"5"', '40'], ctx)).toBe(true);
  expect(lt(['"5"', '40'], ctx)).toBe(false);

  // equal? keeps strict node equality. Java reports 2 != 2.0 because its
  // nodes distinguish int from double; TS numbers cannot.
  expect(eq(['2', '2'], ctx)).toBe(true);
  expect(eq(['2', '2.0'], ctx)).toBe(true);
});

test('ordering predicates, total order at the fixed level', () => {
  const ctx = fixedCtx(2);
  expect(gte(['2', '2.5'], ctx)).toBe(false);
  expect(lt(['2', '2.001'], ctx)).toBe(true);

  // Text ranks below numbers, never lexicographic.
  expect(gt(['"5"', '40'], ctx)).toBe(false);
  expect(gt(['40', '"5"'], ctx)).toBe(true);
  expect(lt(['"5"', '40'], ctx)).toBe(true);

  // The 1-arg form compares the current node against the argument.
  expect(gte(['2.5'], ctx)).toBe(false);
  expect(lt(['2.001'], ctx)).toBe(true);
});

test('the bug rows flip between released and total order', () => {
  const rows: { pred: (a: string[], c: Context) => boolean; args: string[] }[] = [
    { pred: gt, args: ['"5"', '40'] },
    { pred: lt, args: ['"5"', '40'] },
    { pred: gt, args: ['true', '1'] },
    { pred: lt, args: ['0', '0.5'] },
  ];
  for (const { pred, args } of rows) {
    expect(pred(args, new Context({}))).not.toBe(pred(args, fixedCtx({})));
  }

  expect(gt(['"5"', '40'], fixedCtx('5'))).toBe(false);
  expect(lt(['"5"', '40'], fixedCtx('5'))).toBe(true);
  expect(gt(['true', '1'], fixedCtx(true))).toBe(true);
  expect(lt(['0', '0.5'], fixedCtx(0))).toBe(true);

  // equal? keeps strict node equality at every level, so the string/number
  // pair stays false on both sides of the patch.
  expect(eq(['"1e3"', '1000'], new Context({}))).toBe(false);
  expect(eq(['"1e3"', '1000'], fixedCtx({}))).toBe(false);
});

test('null order between missing and text', () => {
  // Released: text compares against the literal "null", so "a" < null and
  // the pair reads equal on both sides of the comparison.
  expect(lt(['"a"', 'null'], new Context({}))).toBe(true);
  expect(lt(['null', '"a"'], new Context({}))).toBe(true);
  expect(gt(['"a"', 'null'], new Context({}))).toBe(false);

  // Total order: nothing ranks below text, so the pair orders one way only.
  expect(lt(['"a"', 'null'], fixedCtx({}))).toBe(false);
  expect(lt(['null', '"a"'], fixedCtx({}))).toBe(true);
  expect(gt(['"a"', 'null'], fixedCtx({}))).toBe(true);
  expect(gt(['null', '"a"'], fixedCtx({}))).toBe(false);
});
