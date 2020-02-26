import { join } from 'path';
import { pathseq } from '../helpers';
import { CLDR } from '@phensley/cldr';
import { framework } from '../cldr';
import { Context } from '../../src/context';
import { Variable } from '../../src/variable';
import { COMMERCE_FORMATTERS as TABLE } from '../../src/plugins/formatters.commerce';
import { TemplateTestLoader } from '../loader';

const EN = framework.get('en');

const loader = new TemplateTestLoader(join(__dirname, 'resources'));

const variables = (...n: any[]) => n.map((v, i) => new Variable('var' + i, v));

const formatPercentage = (cldr: CLDR | undefined, n: string, args: string[]) => {
  const impl = TABLE['percentage-format'];
  const ctx = new Context({}, { cldr });
  const vars = variables(n);
  impl.apply(args, vars, ctx);
  return vars[0].get();
};

pathseq('f-add-to-cart-btn-%N.html', 5).forEach(path => {
  test(`add to cart btn - ${path}`, () => loader.execute(path));
});

pathseq('f-bookkeeper-money-format-%N.html', 1).forEach(path => {
  test(`bookkeeper money format - ${path}`, () => loader.execute(path));
});

pathseq('f-cart-quantity-%N.html', 2).forEach(path => {
  test(`cart quantity - ${path}`, () => loader.execute(path));
});

pathseq('f-cart-url-%N.html', 1).forEach(path => {
  test(`cart url - ${path}`, () => loader.execute(path));
});

// TODO: these return double in Java and get formatted with trailing zero,
// e.g. '100.0'. Javascript formats as '100'.
pathseq('f-from-price-%N.html', 7).forEach(path => {
  test(`from price - ${path}`, () => loader.execute(path));
});

// TODO: these return double in Java and get formatted with trailing zero,
// e.g. '100.0'. Javascript formats as '100'.
pathseq('f-normal-price-%N.html', 7).forEach(path => {
  test(`normal price - ${path}`, () => loader.execute(path));
});

pathseq('f-percentage-format-%N.html', 2).forEach(path => {
  test(`percentage format - ${path}`, () => loader.execute(path));
});

test('percentage', () => {
  expect(formatPercentage(EN, '53.6', [])).toEqual('53.60');

  // Undefined cldr produces empty output
  expect(formatPercentage(undefined, '53.6', [])).toEqual('');
});

pathseq('f-product-checkout-%N.html', 1).forEach(path => {
  test(`product checkout - ${path}`, () => loader.execute(path));
});

pathseq('f-product-quick-view-%N.html', 5).forEach(path => {
  test(`product quick view - ${path}`, () => loader.execute(path));
});

// TODO product-scarcity (depends on 'message' formatter which requires i18n branch)

pathseq('f-product-status-%N.html', 8).forEach(path => {
  test(`product status - ${path}`, () => loader.execute(path));
});

pathseq('f-quantity-input-%N.html', 5).forEach(path => {
  test(`quantity input - ${path}`, () => loader.execute(path));
});

// TODO: these return double in Java and get formatted with trailing zero,
// e.g. '100.0'. Javascript formats as '100'.
pathseq('f-sale-price-%N.html', 7).forEach(path => {
  test(`sale price - ${path}`, () => loader.execute(path));
});

pathseq('f-summary-form-field-address-%N.html', 2).forEach(path => {
  test(`summary form field address - ${path}`, () => loader.execute(path));
});

pathseq('f-summary-form-field-checkbox-%N.html', 3).forEach(path => {
  test(`summary form field checkbox - ${path}`, () => loader.execute(path));
});

pathseq('f-summary-form-field-date-%N.html', 1).forEach(path => {
  test(`summary form field date - ${path}`, () => loader.execute(path));
});

pathseq('f-summary-form-field-likert-%N.html', 1).forEach(path => {
  test(`summary form field likert - ${path}`, () => loader.execute(path));
});

pathseq('f-summary-form-field-name-%N.html', 1).forEach(path => {
  test(`summary form field name - ${path}`, () => loader.execute(path));
});

pathseq('f-summary-form-field-phone-%N.html', 1).forEach(path => {
  test(`summary form field phone - ${path}`, () => loader.execute(path));
});

pathseq('f-summary-form-field-time-%N.html', 1).forEach(path => {
  test(`summary form field time - ${path}`, () => loader.execute(path));
});

pathseq('f-variant-descriptor-%N.html', 2).forEach(path => {
  test(`variant descriptor - ${path}`, () => loader.execute(path));
});

pathseq('f-variants-select-%N.html', 3).forEach(path => {
  test(`variants select - ${path}`, () => loader.execute(path));
});
