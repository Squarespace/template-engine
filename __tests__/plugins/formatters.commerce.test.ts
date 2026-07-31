import { join } from 'path';
import { CLDR } from '@phensley/cldr';
import { framework } from '../cldr';
import { Compiler } from '../../src/compiler';
import { Context } from '../../src/context';
import { Node } from '../../src/node';
import { Variable } from '../../src/variable';
import { CompatLevel } from '../../src/compat/compat-level';
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

// The variable node is the field object and the context root is the JSON
// object, so the formatter resolves localizedStrings from the root, the
// way a template execution does.
const formatSummaryField = (json: any, level: number) => {
  const root = new Node(json);
  const ctx = new Context(root, { compat: CompatLevel.at(level) });
  const vars = variables(root.get('field'));
  TABLE['summary-form-field'].apply([], vars, ctx);
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

loader.paths('f-product-restock-notification-%N.html').forEach((path) => {
  test(`product-restock-notification - ${path}`, () => loader.execute(path));
});

loader.paths('f-product-status-%N.html').forEach((path) => {
  test(`product status - ${path}`, () => loader.execute(path));
});

loader.paths('f-product-scarcity-%N.html').forEach((path) => {
  test(`product scarcity - ${path}`, () => loader.execute(path));
});

// The hyphenated name breaks the f-product-scarcity-%N glob, so it runs
// with an explicit loader.execute call. The file pins level 3.
test('product scarcity - f-scarcity-no-enabled-field.html', () =>
  loader.execute('f-scarcity-no-enabled-field.html'));

const compiler = new Compiler();

// The subscription option id sat behind an eval'd flag variable, so it
// disappeared under enableExpr:false. The gate reads the raw variables
// now and renders the attribute either way.
test('add to cart btn - subscription option id renders with eval off', () => {
  const spec = loader.load('f-add-to-cart-btn-8.html');
  const { ctx, errors } = compiler.execute({
    code: spec.TEMPLATE,
    json: spec.JSON,
    cldr: EN,
    enableExpr: false,
  });
  expect(errors).toEqual([]);
  expect(ctx.render().trim()).toEqual(spec.OUTPUT);
});

test('add to cart btn - subscription option id renders by default', () => {
  const spec = loader.load('f-add-to-cart-btn-8.html');
  const { ctx, errors } = compiler.execute({
    code: spec.TEMPLATE,
    json: spec.JSON,
    cldr: EN,
  });
  expect(errors).toEqual([]);
  expect(ctx.render().trim()).toEqual(spec.OUTPUT);
});

// An entry without scarcityEnabled throws below the threshold and safe
// mode records one NullPointerException. The variable stays the untouched
// product, so the block renders empty either way.
const SCARCITY_NO_ENABLED_JSON = {
  item: { id: '560c37c1a7c8465c4a71d99a' },
  productMerchandisingContext: { '560c37c1a7c8465c4a71d99a': {} },
};

test('product scarcity: context entry without scarcityEnabled', () => {
  const code = '[{item|product-scarcity}]';
  for (const compat of [CompatLevel.defaultLevel(), CompatLevel.at(2)]) {
    const { ctx, errors } = compiler.execute({ code, json: SCARCITY_NO_ENABLED_JSON, compat });
    expect(errors.length).toEqual(1);
    expect(errors[0].message).toContain('NullPointerException');
    expect(ctx.render()).toEqual('[]');
  }

  const fixed = compiler.execute({ code, json: SCARCITY_NO_ENABLED_JSON, compat: CompatLevel.fixed() });
  expect(fixed.errors).toEqual([]);
  expect(fixed.ctx.render()).toEqual('[]');
});

// A product without an id throws below the threshold for both
// formatters. Above it the missing id behaves like any missing field:
// scarcity renders empty.
test('product scarcity: product without id', () => {
  const code = '[{item|product-scarcity}]';
  const json = { item: {}, productMerchandisingContext: {} };

  const legacy = compiler.execute({ code, json });
  expect(legacy.errors.length).toEqual(1);
  expect(legacy.errors[0].message).toContain('NullPointerException');
  expect(legacy.ctx.render()).toEqual('[]');

  const fixed = compiler.execute({ code, json, compat: CompatLevel.fixed() });
  expect(fixed.errors).toEqual([]);
  expect(fixed.ctx.render()).toEqual('[]');
});

test('product restock: product without id', () => {
  const code = '[{item|product-restock-notification}]';
  const json = { item: {}, productMerchandisingContext: {} };

  for (const compat of [CompatLevel.defaultLevel(), CompatLevel.at(2)]) {
    const { ctx, errors } = compiler.execute({ code, json, compat });
    expect(errors.length).toEqual(1);
    expect(errors[0].message).toContain('NullPointerException');
    expect(ctx.render()).toEqual('[]');
  }

  // At the fixed level the missing id leaves the template's static
  // whitespace in the output. Java renders the same whitespace string
  // (CommerceFormattersTest.testRestockMissingProductId pins it).
  const fixed = compiler.execute({ code, json, compat: CompatLevel.fixed() });
  expect(fixed.errors).toEqual([]);
  expect(fixed.ctx.render()).toEqual('[\n\n\n\n\n\n]');
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

loader.paths('f-summary-form-field-escape-%N.html').forEach((path) => {
  test(`summary form field escape - ${path}`, () => loader.execute(path));
});

// rawTitle and the fallback text stay raw below the patch threshold at
// levels 0 to 2 and escape as user data from level 3 on. The rendered
// value is template output and stays raw at every level. The level-3
// expectations mirror the Java fixture output.
const summaryFieldDiv = (title: string, value: string) =>
  '<div style="font-size:11px; margin-top:3px">\n' +
  `  <span style="font-weight:bold;">${title}:</span> ${value}\n` +
  '</div>';

const SUMMARY_FIELD_JSON = {
  field: {
    type: 'unknown',
    rawTitle: 'A <B> & "C"',
    value: '<b>bold</b>',
  },
};

// rawTitle with special chars renders raw at level 0 and level 2, below
// the level-3 threshold, and escapes at level 3. The value stays raw in
// the level-3 output.
test('summary form field: rawTitle escapes at level 3 only', () => {
  expect(formatSummaryField(SUMMARY_FIELD_JSON, 0)).toBe(summaryFieldDiv('A <B> & "C"', '<b>bold</b>'));
  expect(formatSummaryField(SUMMARY_FIELD_JSON, 2)).toBe(summaryFieldDiv('A <B> & "C"', '<b>bold</b>'));
  expect(formatSummaryField(SUMMARY_FIELD_JSON, 3)).toBe(summaryFieldDiv('A &lt;B&gt; &amp; "C"', '<b>bold</b>'));
});

// A value containing markup is rendered output, not user data, so it
// stays raw at level 3.
test('summary form field: the value stays raw at level 3', () => {
  expect(formatSummaryField(SUMMARY_FIELD_JSON, 3)).toContain(':</span> <b>bold</b>\n</div>');
});

// The no-answer fallback text renders raw below the level-3 threshold and
// escapes from level 3 on, matching the Java fixture output.
test('summary form field: fallback text escapes at level 3 only', () => {
  const json = {
    field: {
      type: 'unknown',
      rawTitle: 'Q <&> "T"',
    },
    localizedStrings: {
      productSummaryFormNoAnswerText: 'No answer <&> "x"',
    },
  };
  expect(formatSummaryField(json, 0)).toBe(summaryFieldDiv('Q <&> "T"', 'No answer <&> "x"'));
  expect(formatSummaryField(json, 3)).toBe(summaryFieldDiv('Q &lt;&amp;&gt; "T"', 'No answer &lt;&amp;&gt; "x"'));
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

loader.paths('f-product-price-%N.html').forEach((path) => {
  test(`product price - ${path}`, () => loader.execute(path));
});

loader.paths('f-product-price-subscription-weekly.html').forEach((path) => {
  test(`product price subscription weekly - ${path}`, () => loader.execute(path));
});

loader.paths('f-product-price-subscription-bi-weekly.html').forEach((path) => {
  test(`product price subscription bi-weekly - ${path}`, () => loader.execute(path));
});

loader.paths('f-product-price-subscription-monthly.html').forEach((path) => {
  test(`product price subscription monthly - ${path}`, () => loader.execute(path));
});

loader.paths('f-product-price-subscription-bi-monthly.html').forEach((path) => {
  test(`product price subscription bi-monthly - ${path}`, () => loader.execute(path));
});

loader.paths('f-product-price-subscription-from-weekly.html').forEach((path) => {
  test(`product price subscription from weekly - ${path}`, () => loader.execute(path));
});

loader.paths('f-product-price-subscription-from-bi-weekly.html').forEach((path) => {
  test(`product price subscription from bi-weekly - ${path}`, () => loader.execute(path));
});

loader.paths('f-product-price-subscription-from-monthly.html').forEach((path) => {
  test(`product price subscription from monthly - ${path}`, () => loader.execute(path));
});

loader.paths('f-product-price-subscription-from-bi-monthly.html').forEach((path) => {
  test(`product price subscription from bi-monthly - ${path}`, () => loader.execute(path));
});

loader.paths('f-product-price-subscription-from-weekly-on-sale.html').forEach((path) => {
  test(`product price subscription from weekly on-sale - ${path}`, () => loader.execute(path));
});

loader.paths('f-product-price-subscription-on-sale-bi-monthly.html').forEach((path) => {
  test(`product price subscription on-sale bi-monthly - ${path}`, () => loader.execute(path));
});

loader.paths('f-product-price-subscription-on-sale-bi-weekly.html').forEach((path) => {
  test(`product price subscription on-sale bi-weekly - ${path}`, () => loader.execute(path));
});

loader.paths('f-product-price-subscription-on-sale-monthly.html').forEach((path) => {
  test(`product price subscription on-sale monthly - ${path}`, () => loader.execute(path));
});

loader.paths('f-product-price-subscription-on-sale-weekly.html').forEach((path) => {
  test(`product price subscription on-sale weekly - ${path}`, () => loader.execute(path));
});

loader.paths('f-product-price-subscription-weekly-localized.html').forEach((path) => {
  test(`product price subscription weekly localized - ${path}`, () => loader.execute(path));
});

loader.paths('f-product-price-subscription-weekly-localized-multiple.html').forEach((path) => {
  test(`product price subscription weekly localized multiple - ${path}`, () => loader.execute(path));
});

loader.paths('f-product-price-finite-subscription-weekly.html').forEach((path) => {
  test(`product price finite subscription weekly - ${path}`, () => loader.execute(path));
});

loader.paths('f-product-price-finite-subscription-bi-weekly.html').forEach((path) => {
  test(`product price finite subscription bi-weekly - ${path}`, () => loader.execute(path));
});

loader.paths('f-product-price-finite-subscription-monthly.html').forEach((path) => {
  test(`product price finite subscription monthly - ${path}`, () => loader.execute(path));
});

loader.paths('f-product-price-finite-subscription-bi-monthly.html').forEach((path) => {
  test(`product price finite subscription bi-monthly - ${path}`, () => loader.execute(path));
});

loader.paths('f-product-price-finite-subscription-bi-weekly-for-a-year.html').forEach((path) => {
  test(`product price finite subscription bi-weekly for a year - ${path}`, () => loader.execute(path));
});

loader.paths('f-product-price-finite-subscription-monthly-for-a-year.html').forEach((path) => {
  test(`product price finite subscription monthly for a year - ${path}`, () => loader.execute(path));
});

loader.paths('f-product-price-finite-subscription-from-weekly.html').forEach((path) => {
  test(`product price finite subscription from weekly - ${path}`, () => loader.execute(path));
});

loader.paths('f-product-price-finite-subscription-from-bi-weekly.html').forEach((path) => {
  test(`product price finite subscription from bi-weekly - ${path}`, () => loader.execute(path));
});

loader.paths('f-product-price-finite-subscription-from-monthly.html').forEach((path) => {
  test(`product price finite subscription from monthly - ${path}`, () => loader.execute(path));
});

loader.paths('f-product-price-finite-subscription-from-bi-monthly.html').forEach((path) => {
  test(`product price finite subscription from bi-monthly - ${path}`, () => loader.execute(path));
});

loader.paths('f-product-price-finite-subscription-from-weekly-on-sale.html').forEach((path) => {
  test(`product price finite subscription from weekly on-sale - ${path}`, () => loader.execute(path));
});

loader.paths('f-product-price-finite-subscription-on-sale-bi-monthly.html').forEach((path) => {
  test(`product price finite subscription on-sale bi-monthly - ${path}`, () => loader.execute(path));
});

loader.paths('f-product-price-finite-subscription-on-sale-bi-weekly.html').forEach((path) => {
  test(`product price finite subscription on-sale bi-weekly - ${path}`, () => loader.execute(path));
});

loader.paths('f-product-price-finite-subscription-on-sale-monthly.html').forEach((path) => {
  test(`product price finite subscription on-sale monthly - ${path}`, () => loader.execute(path));
});

loader.paths('f-product-price-finite-subscription-on-sale-weekly.html').forEach((path) => {
  test(`product price finite subscription on-sale weekly - ${path}`, () => loader.execute(path));
});

loader.paths('f-product-price-finite-subscription-weekly-localized.html').forEach((path) => {
  test(`product price finite subscription weekly localized - ${path}`, () => loader.execute(path));
});

loader.paths('f-product-price-finite-subscription-weekly-localized-multiple.html').forEach((path) => {
  test(`product price finite subscription weekly localized multiple - ${path}`, () => loader.execute(path));
});

loader.paths('f-product-price-subscription-weekly-plan-unavailable.html').forEach((path) => {
  test(`product price subscription weekly plan unavailable - ${path}`, () => loader.execute(path));
});

// The two fixtures pin the no-billing-period slot at level 0 and level 3,
// and their names break the f-product-price-%N glob, so each runs with an
// explicit loader.execute call.
test('product price subscription plan unavailable true slot', () =>
  loader.execute('f-product-price-subscription-plan-unavailable-true-slot.html'));

test('product price subscription plan unavailable true slot level 3', () =>
  loader.execute('f-product-price-subscription-plan-unavailable-true-slot-level-3.html'));

test('product price unavailable default text', () => {
  // Without localizedStrings the branch falls back to 'Unavailable' and
  // the slot value never reaches the output, at both levels.
  const compiler = new Compiler();
  const json = {
    structuredContent: { productType: 1, isSubscribable: 'true', subscriptionPlan: {} },
  };
  for (const compat of [CompatLevel.defaultLevel(), CompatLevel.fixed()]) {
    const { ctx, errors } = compiler.execute({ code: '{@|product-price}', json, cldr: EN, compat });
    expect(errors).toEqual([]);
    expect(ctx.render()).toContain('Unavailable');
  }
});

test('product price unavailable localized price slot', () => {
  // A subscribable product whose plan has no billing period. The
  // localized unavailable text embeds a price placeholder.
  const compiler = new Compiler();
  const json = {
    structuredContent: { productType: 1, isSubscribable: 'true', subscriptionPlan: {} },
    localizedStrings: { productPriceUnavailable: 'Price ({price})' },
  };

  // Below the threshold the slot keeps the legacy literal.
  for (const compat of [CompatLevel.defaultLevel(), CompatLevel.at(2)]) {
    const { ctx, errors } = compiler.execute({ code: '{@|product-price}', json, cldr: EN, compat });
    expect(errors).toEqual([]);
    expect(ctx.render()).toContain('Price (true)');
  }

  // At the fixed level the placeholder renders nothing.
  const { ctx, errors } = compiler.execute({ code: '{@|product-price}', json, cldr: EN, compat: CompatLevel.fixed() });
  expect(errors).toEqual([]);
  const output = ctx.render();
  expect(output).toContain('Price ( )');
  expect(output).not.toContain('true');
});
