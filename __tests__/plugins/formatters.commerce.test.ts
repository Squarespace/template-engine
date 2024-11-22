import { join } from 'path';
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

loader.paths('f-add-to-cart-btn-%N.html').forEach((path) => {
  test(`add to cart btn - ${path}`, () => loader.execute(path));
});

loader.paths('f-bookkeeper-money-format-%N.html').forEach((path) => {
  test(`bookkeeper money format - ${path}`, () => loader.execute(path));
});

loader.paths('f-cart-quantity-%N.html').forEach((path) => {
  test(`cart quantity - ${path}`, () => loader.execute(path));
});

loader.paths('f-cart-subtotal-%N.html').forEach((path) => {
  test(`cart quantity - ${path}`, () => loader.execute(path));
});

loader.paths('f-cart-url-%N.html').forEach((path) => {
  test(`cart url - ${path}`, () => loader.execute(path));
});

// TODO: these return double in Java and get formatted with trailing zero,
// e.g. '100.0'. Javascript formats as '100'.
loader.paths('f-from-price-%N.html').forEach((path) => {
  test(`from price - ${path}`, () => loader.execute(path));
});

// TODO: these return double in Java and get formatted with trailing zero,
// e.g. '100.0'. Javascript formats as '100'.
loader.paths('f-normal-price-%N.html').forEach((path) => {
  test(`normal price - ${path}`, () => loader.execute(path));
});

loader.paths('f-percentage-format-%N.html').forEach((path) => {
  test(`percentage format - ${path}`, () => loader.execute(path));
});

test('percentage', () => {
  expect(formatPercentage(EN, '53.6', [])).toEqual('53.60');

  // Undefined cldr produces empty output
  expect(formatPercentage(undefined, '53.6', [])).toEqual('');
});

loader.paths('f-product-checkout-%N.html').forEach((path) => {
  test(`product checkout - ${path}`, () => loader.execute(path));
});

loader.paths('f-product-quick-view-%N.html').forEach((path) => {
  test(`product quick view - ${path}`, () => loader.execute(path));
});

// TODO product-price

// loader.paths('f-product-price-%N.html', 8).forEach((path) => {
//   test(`product price - ${path}`, () => loader.execute(path));
// });

loader.paths('f-product-restock-notification-%N.html').forEach((path) => {
  test(`product-restock-notification - ${path}`, () => loader.execute(path));
});

loader.paths('f-product-status-%N.html').forEach((path) => {
  test(`product status - ${path}`, () => loader.execute(path));
});

loader.paths('f-product-scarcity-%N.html').forEach((path) => {
  test(`product scarcity - ${path}`, () => loader.execute(path));
});

loader.paths('f-quantity-input-%N.html').forEach((path) => {
  test(`quantity input - ${path}`, () => loader.execute(path));
});

// TODO: these return double in Java and get formatted with trailing zero,
// e.g. '100.0'. Javascript formats as '100'.
loader.paths('f-sale-price-%N.html').forEach((path) => {
  test(`sale price - ${path}`, () => loader.execute(path));
});

loader.paths('f-summary-form-field-address-%N.html').forEach((path) => {
  test(`summary form field address - ${path}`, () => loader.execute(path));
});

loader.paths('f-summary-form-field-checkbox-%N.html').forEach((path) => {
  test(`summary form field checkbox - ${path}`, () => loader.execute(path));
});

loader.paths('f-summary-form-field-date-%N.html').forEach((path) => {
  test(`summary form field date - ${path}`, () => loader.execute(path));
});

loader.paths('f-summary-form-field-likert-%N.html').forEach((path) => {
  test(`summary form field likert - ${path}`, () => loader.execute(path));
});

loader.paths('f-summary-form-field-name-%N.html').forEach((path) => {
  test(`summary form field name - ${path}`, () => loader.execute(path));
});

loader.paths('f-summary-form-field-phone-%N.html').forEach((path) => {
  test(`summary form field phone - ${path}`, () => loader.execute(path));
});

loader.paths('f-summary-form-field-time-%N.html').forEach((path) => {
  test(`summary form field time - ${path}`, () => loader.execute(path));
});

loader.paths('f-summary-form-field-unk-%N.html').forEach((path) => {
  test(`summary form field unk - ${path}`, () => loader.execute(path));
});

loader.paths('f-variant-descriptor-%N.html').forEach((path) => {
  test(`variant descriptor - ${path}`, () => loader.execute(path));
});

loader.paths('f-variants-select-%N.html').forEach((path) => {
  test(`variants select - ${path}`, () => loader.execute(path));
});

loader.paths('f-variants-select-subscription.html').forEach((path) => {
  test(`variants select subscription - ${path}`, () => loader.execute(path));
});

loader.paths('f-subscription-price-multiple-variants-and-multiple-pricing-options.html').forEach((path) => {
  test(`subscription price multiple variants and multiple pricing options - ${path}`, () => loader.execute(path));
});

loader.paths('f-subscription-price-multiple-variants-from-price.html').forEach((path) => {
  test(`subscription price multiple variants from price - ${path}`, () => loader.execute(path));
});

loader.paths('f-subscription-price-on-sale-variants-pricing-options.html').forEach((path) => {
  test(`subscription price on sale variants pricing options - ${path}`, () => loader.execute(path));
});

loader.paths('f-subscription-price-one-on-sale-pricing-option.html').forEach((path) => {
  test(`subscription price one on sale pricing option - ${path}`, () => loader.execute(path));
});

loader.paths('f-subscription-price-one-pricing-option.html').forEach((path) => {
  test(`subscription price one pricing option - ${path}`, () => loader.execute(path));
});

loader.paths('f-subscription-price-variants-with-same-pricing.html').forEach((path) => {
  test(`subscription price variants with same pricing - ${path}`, () => loader.execute(path));
});

loader.paths('f-subscription-price-no-pricing-options.html').forEach((path) => {
  test(`subscription price no pricing options - ${path}`, () => loader.execute(path));
});
