import { join } from 'path';
import { Compiler } from '../../src/compiler';
import { CompatLevel } from '../../src/compat';
import { TemplateTestLoader } from '../loader';

const compiler = new Compiler();
const loader = new TemplateTestLoader(join(__dirname, 'resources'));

loader.paths('p-has-variants-%N.html').forEach((path) => {
  test(`has-variants - ${path}`, () => loader.execute(path));
});

test('on sale', () => {
  loader.execute('p-on-sale.html');
});

test('sold out', () => {
  loader.execute('p-sold-out.html');
});

test('varied prices', () => {
  loader.execute('p-varied-prices.html');
  loader.execute('p-varied-prices-2.html');
  loader.execute('p-varied-prices-3.html');
  loader.execute('p-varied-prices-4.html');
});

/**
 * An object variants node with two or more fields. Levels below the patch
 * threshold keep the released throw, which safe mode records as one error,
 * leaving the predicate node empty. At the threshold the same input renders
 * the false branch with no error.
 */
test('varied prices non-array variants', () => {
  const code = '{.varied-prices?}y{.or}n{.end}';
  const json = {
    productType: 1,
    structuredContent: { productType: 1, variants: { a: 1, b: 2 } },
  };

  const legacy = compiler.execute({ code, json });
  expect(legacy.ctx.render()).toEqual('');
  expect(legacy.errors.length).toEqual(1);
  expect(legacy.errors[0].message).toContain('NullPointerException');

  // The patch threshold is 2, so level 1 keeps the legacy throw.
  const levelOne = compiler.execute({ code, json, compat: CompatLevel.at(1) });
  expect(levelOne.ctx.render()).toEqual('');
  expect(levelOne.errors.length).toEqual(1);
  expect(levelOne.errors[0].message).toContain('NullPointerException');

  const fixed = compiler.execute({ code, json, compat: CompatLevel.at(2) });
  expect(fixed.ctx.render()).toEqual('n');
  expect(fixed.errors.length).toEqual(0);
});
