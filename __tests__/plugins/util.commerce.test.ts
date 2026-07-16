import { join } from 'path';
import * as commerceutil from '../../src/plugins/util.commerce';
import { Node } from '../../src/node';
import { Context } from '../../src/context';
import { CompatLevel } from '../../src/compat';
import { ProductType } from '../../src/plugins/enums';
import { expectedTests, predicateTests, Product } from '../helpers';
import { TestLoader } from '../loader';

const PRODUCT = new Product();

const jsonLoader = new TestLoader(join(__dirname, 'resources'), { '*': JSON.parse });

test('from price', () => {
  const product = PRODUCT.type(ProductType.SERVICE);

  let item = product.variants([{ priceMoney: { value: '100.0' } }, { priceMoney: { value: '200.0' } }]).node();
  let price = commerceutil.getFromPrice(item);
  expect(price).toEqual(new Node({ value: '100.0' }));

  item = product
    .variants([{ priceMoney: { value: '1000' } }, { priceMoney: { value: '750' } }, { priceMoney: { value: '1500' } }])
    .node();
  price = commerceutil.getFromPrice(item);
  expect(price).toEqual(new Node({ value: '750' }));

  item = product.variants([]).node();
  price = commerceutil.getFromPrice(item);
  expect(price).toEqual(new Node({ value: '0', currency: 'USD' }));

  item = product.type(ProductType.UNDEFINED).node();
  price = commerceutil.getFromPrice(item);
  expect(price).toEqual(new Node({ value: '0', currency: 'USD' }));
});

const GET_ITEM_VARIANT_OPTIONS_SPEC = jsonLoader.load('get-item-variant-options.json');

expectedTests('get item variant options', GET_ITEM_VARIANT_OPTIONS_SPEC).forEach((t) => {
  test(t.name, () => {
    const actual = commerceutil.getItemVariantOptions(new Node(t.input));
    expect(actual).toEqual(t.expected);
  });
});

test('has variants', () => {
  const product = PRODUCT.variants([]);

  let item = product.node();
  let result = commerceutil.hasVariants(item);
  expect(result).toEqual(false);

  item = PRODUCT.variants([{ price: 123 }]).node();
  result = commerceutil.hasVariants(item);
  expect(result).toEqual(false);

  item = PRODUCT.variants([{ price: 123 }, { price: 456 }]).node();
  result = commerceutil.hasVariants(item);
  expect(result).toEqual(true);
});

const HAS_VARIANTS_SPEC = jsonLoader.load('has-variants.json');

predicateTests('has variants', HAS_VARIANTS_SPEC).forEach((t) => {
  test(t.name, () => {
    const actual = commerceutil.hasVariants(new Node(t.input));
    expect(actual).toEqual(t.expected);
  });
});

test('has varied prices', () => {
  const product = PRODUCT.type(ProductType.PHYSICAL);

  [ProductType.PHYSICAL, ProductType.GIFT_CARD, ProductType.SERVICE].forEach((type) => {
    let item = product
      .type(type)
      .variants([
        { price: 100.0, qtyInStock: 10 },
        { price: 200.0, qtyInStock: 15 },
      ])
      .node();

    let result = commerceutil.hasVariedPrices(item);
    expect(result).toEqual(true);

    item = product
      .type(type)
      .variants([{ price: 100.0 }, { price: 100.0 }])
      .node();

    result = commerceutil.hasVariedPrices(item);
    expect(result).toEqual(false);
  });

  const it = product.type(ProductType.DIGITAL).node();
  const res = commerceutil.hasVariedPrices(it);
  expect(res).toEqual(false);
});

const HAS_VARIED_PRICES_SPEC = jsonLoader.load('has-varied-prices.json');

predicateTests('has varied prices external', HAS_VARIED_PRICES_SPEC).forEach((t) => {
  test(t.name, () => {
    const actual = commerceutil.hasVariedPrices(new Node(t.input));
    expect(actual).toEqual(t.expected);
  });
});

test('is on sale', () => {
  const product = PRODUCT.type(ProductType.PHYSICAL);

  let item = product
    .variants([
      { priceMoney: { value: '100.0' } },
      { priceMoney: { value: '200.0' } },
      { onSale: true, priceMoney: { value: '50.0' } },
    ])
    .node();

  let result = commerceutil.isOnSale(item);
  expect(result).toEqual(true);

  item = product.variants([]).node();
  result = commerceutil.isOnSale(item);
  expect(result).toEqual(false);

  item = product.variants({}).node();
  result = commerceutil.isOnSale(item);
  expect(result).toEqual(false);

  item = product.type(ProductType.DIGITAL).set(true, 'structuredContent', 'onSale').node();
  result = commerceutil.isOnSale(item);
  expect(result).toEqual(true);

  [ProductType.GIFT_CARD, ProductType.UNDEFINED].forEach((type) => {
    item = PRODUCT.type(type).node();
    result = commerceutil.isOnSale(item);
    expect(result).toEqual(false);
  });
});

test('is sold out', () => {
  const product = PRODUCT.type(ProductType.PHYSICAL);

  let item = product.variants([{ qtyInStock: 0 }, { qtyInStock: 1 }]).node();

  let result = commerceutil.isSoldOut(item);
  expect(result).toEqual(false);

  item = product.variants([{ qtyInStock: 0 }, { qtyInStock: 0 }]).node();

  result = commerceutil.isSoldOut(item);
  expect(result).toEqual(true);

  item = product.variants(123).node();
  result = commerceutil.isSoldOut(item);
  expect(result).toEqual(true);

  [ProductType.DIGITAL, ProductType.GIFT_CARD].forEach((type) => {
    item = PRODUCT.type(type).node();
    result = commerceutil.isSoldOut(item);
    expect(result).toEqual(false);
  });

  item = PRODUCT.type(ProductType.UNDEFINED).node();
  result = commerceutil.isSoldOut(item);
  expect(result).toEqual(true);
});

test('normal price', () => {
  const product = PRODUCT.type(ProductType.SERVICE);

  let item = product.variants([{ priceMoney: { value: '100.0' } }, { priceMoney: { value: '200.0' } }]).node();
  let price = commerceutil.getNormalPrice(item);
  expect(price).toEqual(new Node({ value: '200.0' }));

  item = product.variants([]).node();
  price = commerceutil.getNormalPrice(item);
  expect(price).toEqual(new Node({ value: '0', currency: 'USD' }));
});

test('product type', () => {
  const item = new Node({ structuredContent: { productType: 3 } });
  expect(commerceutil.getProductType(item)).toBe(ProductType.SERVICE);
});

test('sale price', () => {
  const product = PRODUCT.type(ProductType.SERVICE);

  let item = product.variants([{ priceMoney: { value: '100.0' } }, { priceMoney: { value: '200.0' } }]).node();
  let price = commerceutil.getSalePrice(item);
  expect(price).toEqual(new Node({ value: '0', currency: 'USD' }));

  item = product.variants([{ priceMoney: { value: '100.0' } }, { onSale: true, salePriceMoney: { value: '75.0' } }]).node();
  price = commerceutil.getSalePrice(item);
  expect(price).toEqual(new Node({ value: '75.0' }));

  item = product.variants([]).node();
  price = commerceutil.getSalePrice(item);
  expect(price).toEqual(new Node({ value: '0', currency: 'USD' }));
});

test('total stock remaining', () => {
  const product = PRODUCT.type(ProductType.PHYSICAL);

  let item = product
    .variants([
      { price: 100.0, qtyInStock: 10 },
      { price: 200.0, qtyInStock: 15 },
    ])
    .node();

  let total = commerceutil.getTotalStockRemaining(item);
  expect(total).toEqual(25);

  item = product
    .variants([
      { unlimited: true, price: 10.0 },
      { price: 15.0, qtyInStock: 7 },
    ])
    .node();

  total = commerceutil.getTotalStockRemaining(item);
  expect(total).toEqual(Number.MAX_SAFE_INTEGER);

  item = product.type(ProductType.DIGITAL).node();
  total = commerceutil.getTotalStockRemaining(item);
  expect(total).toEqual(Number.MAX_SAFE_INTEGER);
});

const MULTIPLE_QUANTITY_ALLOWED_SPEC = jsonLoader.load('is-multi-quantity-allowed-for-services.json');

predicateTests('multiple quantity allowed for services', MULTIPLE_QUANTITY_ALLOWED_SPEC).forEach((t) => {
  test(t.name, () => {
    const actual = commerceutil.isMultipleQuantityAllowedForServices(new Node(t.input));
    expect(actual).toEqual(t.expected);
  });
});

const moneyNode = (value: string) => new Node({ value, currency: 'USD' });

const moneyString = (node: Node, compat?: CompatLevel) =>
  commerceutil.getMoneyString(node, [], new Context(node, { compat }));

const moneySpan = (amount: string) => `<span class="sqs-money-native">${amount}</span>`;

/**
 * Exact string helpers behind the fixed money path. The input rows mirror
 * Java's BigDecimal.movePointLeft(2) and DecimalFormat HALF_EVEN steps.
 */
test('legacy money exact helpers', () => {
  // Move the decimal point two places left on the exact cents digits.
  expect(commerceutil.moveDecimalLeft('123456789012345678')).toEqual('1234567890123456.78');
  expect(commerceutil.moveDecimalLeft('123456789012345678.90')).toEqual('1234567890123456.7890');
  expect(commerceutil.moveDecimalLeft('12.5')).toEqual('0.125');
  expect(commerceutil.moveDecimalLeft('1234.56')).toEqual('12.3456');
  expect(commerceutil.moveDecimalLeft('100')).toEqual('1.00');
  expect(commerceutil.moveDecimalLeft('0')).toEqual('0.00');
  expect(commerceutil.moveDecimalLeft('-12.5')).toEqual('-0.125');

  // Round to two fraction digits, half to even.
  expect(commerceutil.roundHalfEven('1234567890123456.7890')).toEqual('1234567890123456.79');
  expect(commerceutil.roundHalfEven('0.125')).toEqual('0.12');
  expect(commerceutil.roundHalfEven('0.135')).toEqual('0.14');
  expect(commerceutil.roundHalfEven('12.3456')).toEqual('12.35');
  expect(commerceutil.roundHalfEven('0.005')).toEqual('0.00');
  expect(commerceutil.roundHalfEven('0.015')).toEqual('0.02');
  expect(commerceutil.roundHalfEven('99.995')).toEqual('100.00');
  expect(commerceutil.roundHalfEven('-0.125')).toEqual('-0.12');
  expect(commerceutil.roundHalfEven('-0.135')).toEqual('-0.14');
  expect(commerceutil.roundHalfEven('1.00')).toEqual('1.00');
});

/**
 * Level 0 keeps the released double round-trip and its lost precision.
 */
test('money string legacy', () => {
  expect(moneyString(moneyNode('1234567890123456.78'))).toEqual(moneySpan('1,234,567,890,123,456.80'));
  expect(moneyString(moneyNode('0.125'))).toEqual(moneySpan('0.13'));
});

/**
 * The fixed level formats the exact cents digits and matches Java.
 */
test('money string fixed', () => {
  const fixed = CompatLevel.fixed();
  expect(moneyString(moneyNode('1234567890123456.78'), fixed)).toEqual(moneySpan('1,234,567,890,123,456.78'));
  expect(moneyString(moneyNode('1234567890123456.7890'), fixed)).toEqual(moneySpan('1,234,567,890,123,456.79'));
  expect(moneyString(moneyNode('0.125'), fixed)).toEqual(moneySpan('0.12'));
  expect(moneyString(moneyNode('0.135'), fixed)).toEqual(moneySpan('0.14'));
});

/**
 * Missing values and ordinary prices render the same at both levels.
 */
test('money string missing and small values', () => {
  const fixed = CompatLevel.fixed();
  const missing = new Node({ currency: 'USD' });
  expect(moneyString(missing)).toEqual(moneySpan('0.00'));
  expect(moneyString(missing, fixed)).toEqual(moneySpan('0.00'));
  expect(moneyString(moneyNode('12.3456'))).toEqual(moneySpan('12.35'));
  expect(moneyString(moneyNode('12.3456'), fixed)).toEqual(moneySpan('12.35'));
  expect(moneyString(moneyNode('1.00'))).toEqual(moneySpan('1.00'));
  expect(moneyString(moneyNode('1.00'), fixed)).toEqual(moneySpan('1.00'));
});
