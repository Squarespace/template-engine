import { join } from 'path';
import { Compiler } from '../src/compiler';
import { CompatLevel } from '../src/compat/compat-level';
import { Patch } from '../src/compat/patch';
import { prettyJson } from '../src/pretty';
import { TemplateTestLoader } from './loader';

/**
 * Port of the Java CompatPlumbingTest. It pins the compat level plumbing
 * and the released surface parity: while no patch is wired to a code path,
 * rendering and the parsed code shape stay identical at every level.
 *
 * The templates below are the ones no patch touches. When a gated-fix todo
 * (004-037) wires a patch, its templates move out of this set into the
 * patch's own level tests, so the set shrinks as the ladder fills in. At
 * the time of writing no patch has graduated.
 *
 * Each gated-fix todo follows two conventions:
 *
 * 1. A per-patch unit test asserts the LEGACY result at the default level
 *    and the FIXED result at CompatLevel.fixed(), mirroring the Java
 *    per-patch tests.
 * 2. Where the Java tree has a level-pinned fixture (:PROPERTIES level=N),
 *    the fixture is ported into __tests__/plugins/resources/ with the
 *    header intact.
 */

// Ported verbatim from Java CompatPlumbingTest.TEMPLATES and JSON.
const TEMPLATES = [
  'plain text',
  '{a} {b.c} {d[0]}',
  '{a|str} {s|truncate 3} {n|mod 3}',
  '{.if a}{yes}{.end}',
  '{.section items}{i}{.end}',
  '{.include part} {missing}',
  '{.eval 2 * 3 + 40}',
  '{o|json}',
  '{.if nth? n 2}{y}{.end}',
];

const DATA = {
  a: true,
  s: 'abcdef',
  n: 7,
  d: { c: 5, items: [1, 2] },
  o: { k: 'v' },
};

const compiler = new Compiler();

/**
 * Every rung of the ladder, plus the two named statics. The default and
 * fixed positions are the ends of the ladder today; listing them by name
 * keeps the test honest if the table ever changes.
 */
const levels = (): CompatLevel[] => {
  const res = [CompatLevel.defaultLevel()];
  for (let n = 0; n <= Patch.maxThreshold(); n++) {
    res.push(CompatLevel.at(n));
  }
  res.push(CompatLevel.fixed());
  return res;
};

const render = (template: string, compat: CompatLevel): string => {
  const { ctx, errors } = compiler.execute({
    code: template,
    json: DATA,
    // Mirrors Java render(): a part partial, plus expr and include enabled.
    partials: { part: 'p' },
    enableExpr: true,
    enableInclude: true,
    compat,
  });
  expect(errors).toEqual([]);
  return ctx.render();
};

const parse = (template: string, compat: CompatLevel): string => {
  const { code, errors } = compiler.parse(template, compat);
  expect(errors).toEqual([]);
  return prettyJson(code);
};

test('fixture level property', () => {
  // The Java runner executes every compat-level-%N.html fixture at its
  // pinned level, which must reach both parse and execute.
  const loader = new TemplateTestLoader(join(__dirname, 'plugins', 'resources'));
  for (const path of loader.paths('compat-level-%N.html')) {
    loader.execute(path);
  }
});

test('default level is released', () => {
  // Executing without a level stays on the default, released surface.
  const { ctx } = compiler.execute({ code: '{a}', json: { a: 1 } });
  expect(ctx.compat.equals(CompatLevel.defaultLevel())).toBe(true);
});

test('executor plumbing', () => {
  // A numeric level plus a forced patch combine into one CompatLevel that
  // reaches the context. compat.test.ts covers the same ground with both
  // Java setter orders; this mirrors the Java test as written.
  const { ctx } = compiler.execute({
    code: '{a}',
    json: { a: 1 },
    compatLevel: 2,
    compatPatch: Patch.MOD_ZERO,
  });
  expect(ctx.compat.equals(CompatLevel.at(2).withPatch(Patch.MOD_ZERO))).toBe(true);
  expect(ctx.compatEnabled(Patch.MOD_ZERO)).toBe(true);
  expect(ctx.compatEnabled(Patch.JSON_START_KEYWORD)).toBe(false);
});

test('parity across levels', () => {
  // Output must not differ between the default level and any other level
  // while no patch is wired.
  for (const template of TEMPLATES) {
    const base = render(template, CompatLevel.defaultLevel());
    for (const compat of levels()) {
      expect(render(template, compat)).toEqual(base);
    }
  }
});

test('compile parity across levels', () => {
  // The parsed code shape must not differ between levels. Java emits the
  // tree with TreeEmitter; this port serializes the parse via prettyJson.
  for (const template of TEMPLATES) {
    const base = parse(template, CompatLevel.defaultLevel());
    for (const compat of levels()) {
      expect(parse(template, compat)).toEqual(base);
    }
  }
});
