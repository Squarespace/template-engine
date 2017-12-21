import { join } from 'path';
import * as commerceutil from '../../src/plugins/util.commerce';
import Node from '../../src/node';
import { ProductType } from '../../src/plugins/enums';
import { Product } from '../helpers';
import { TestLoader } from '../loader';


const PRODUCT = new Product();

const jsonLoader = new TestLoader(join(__dirname, 'resources'), { '*': JSON.parse });


/**
 * Helper to build JSON test cases that compare K to K-expected.
 */
const expectedTests = (name, path) => {
  const cases = [];
  const spec = jsonLoader.load(path);
  Object.keys(spec).filter(k => !k.endsWith('-expected')).forEach(k => {
    const input = spec[k];
    const expected = spec[k + '-expected'];
    cases.push({ name: `${name} - ${k}`, input, expected });
  });
  return cases;
};

/**
 * Helper to build true / false test cases.
 */
const predicateTests = (name, path) => {
  const cases = [];
  const spec = jsonLoader.load(path);
  Object.keys(spec).forEach(k => {
    const input = spec[k];
    const expected = k.endsWith('-true');
    cases.push({ name: `${name} - ${k}`, input, expected });
  });
  return cases;
};



test('from price', () => {
  const product = PRODUCT.type(ProductType.SERVICE);

  let item = product.variants([ { price: 100.0, }, { price: 200.0 } ]).node();
  let price = commerceutil.getFromPrice(item);
  expect(price).toEqual(100.0);

  item = product.variants([
    { price: 1000 },
    { price: 750 },
    { price: 1500 }
  ]).node();
  price = commerceutil.getFromPrice(item);
  expect(price).toEqual(750);

  item = product.variants([]).node();
  price = commerceutil.getFromPrice(item);
  expect(price).toEqual(0);

  item = product.type(ProductType.UNDEFINED).node();
  price = commerceutil.getFromPrice(item);
  expect(price).toEqual(0.0);

  item = product.type(ProductType.DIGITAL).set(203, 'structuredContent', 'priceCents').node();
  price = commerceutil.getFromPrice(item);
  expect(price).toEqual(203);
});



expectedTests('get item variant options', 'get-item-variant-options.json').forEach(t => {
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


predicateTests('has variants external', 'has-variants.json').forEach(t => {
  test(t.name, () => {
    const actual = commerceutil.hasVariants(new Node(t.input));
    expect(actual).toEqual(t.expected);
  });
});


test('has varied prices', () => {
  const product = PRODUCT.type(ProductType.PHYSICAL);

  [ProductType.PHYSICAL, ProductType.GIFT_CARD, ProductType.SERVICE].forEach(type => {
    let item = product.type(type).variants([
      { price: 100.0, qtyInStock: 10 },
      { price: 200.0, qtyInStock: 15 }
    ]).node();

    let result = commerceutil.hasVariedPrices(item);
    expect(result).toEqual(true);

    item = product.type(type).variants([
      { price: 100.0 },
      { price: 100.0 }
    ]).node();

    result = commerceutil.hasVariedPrices(item);
    expect(result).toEqual(false);
  });

  const item = product.type(ProductType.DIGITAL).node();
  const result = commerceutil.hasVariedPrices(item);
  expect(result).toEqual(false);
});


predicateTests('has varied prices external', 'has-varied-prices.json').forEach(t => {
  test(t.name, () => {
    const actual = commerceutil.hasVariedPrices(new Node(t.input));
    expect(actual).toEqual(t.expected);
  });
});


test('is on sale', () => {
  const product = PRODUCT.type(ProductType.PHYSICAL);

  let item = product.variants([
    { price: 100.0 },
    { price: 200.0 },
    { onSale: true, price: 50.0 }
  ]).node();

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

  [ProductType.GIFT_CARD, ProductType.UNDEFINED].forEach(type => {
    item = PRODUCT.type(type).node();
    result = commerceutil.isOnSale(item);
    expect(result).toEqual(false);
  });
});


test('is sold out', () => {
  const product = PRODUCT.type(ProductType.PHYSICAL);

  let item = product.variants([
    { qtyInStock: 0 },
    { qtyInStock: 1 },
  ]).node();

  let result = commerceutil.isSoldOut(item);
  expect(result).toEqual(false);

  item = product.variants([
    { qtyInStock: 0 },
    { qtyInStock: 0 }
  ]).node();

  result = commerceutil.isSoldOut(item);
  expect(result).toEqual(true);

  item = product.variants(123).node();
  result = commerceutil.isSoldOut(item);
  expect(result).toEqual(true);

  [ProductType.DIGITAL, ProductType.GIFT_CARD, ProductType.UNDEFINED].forEach(type => {
    item = PRODUCT.type(type).node();
    result = commerceutil.isSoldOut(item);
    expect(result).toEqual(false);
  });

});


test('normal price', () => {
  const product = PRODUCT.type(ProductType.SERVICE);

  let item = product.variants([{ price: 100.0 }, { price: 200.0 }]).node();
  let price = commerceutil.getNormalPrice(item);
  expect(price).toEqual(200.0);

  item = product.variants([]).node();
  price = commerceutil.getNormalPrice(item);
  expect(price).toEqual(0);

  item = product.type(ProductType.DIGITAL).set(175, 'structuredContent', 'priceCents').node();
  price = commerceutil.getNormalPrice(item);
  expect(price).toEqual(175.0);

  item = product.type(ProductType.GIFT_CARD).node();
  price = commerceutil.getNormalPrice(item);
  expect(price).toEqual(0);
});


test('product type', () => {
  const item = new Node({ structuredContent: { productType: 3 } });
  expect(commerceutil.getProductType(item)).toBe(ProductType.SERVICE);
});


test('sale price', () => {
  const product = PRODUCT.type(ProductType.SERVICE);

  let item = product.variants([{ price: 100.0 }, { price: 200.0 }]).node();
  let price = commerceutil.getSalePrice(item);
  expect(price).toEqual(0);

  item = product.variants([{ price: 100.0 }, { onSale: true, salePrice: 75.0 }]).node();
  price = commerceutil.getSalePrice(item);
  expect(price).toEqual(75.0);

  item = product.variants([]).node();
  price = commerceutil.getSalePrice(item);
  expect(price).toEqual(0);

  item = product.type(ProductType.DIGITAL).set(150, 'structuredContent', 'salePriceCents').node();
  price = commerceutil.getSalePrice(item);
  expect(price).toEqual(150);

  item = product.type(ProductType.GIFT_CARD).node();
  price = commerceutil.getSalePrice(item);
  expect(price).toEqual(0);
});


test('total stock remaining', () => {
  const product = PRODUCT.type(ProductType.PHYSICAL);

  let item = product.variants([
    { price: 100.0, qtyInStock: 10 },
    { price: 200.0, qtyInStock: 15 }
  ]).node();

  let total = commerceutil.getTotalStockRemaining(item);
  expect(total).toEqual(25);

  item = product.variants([
    { unlimited: true, price: 10.0 },
    { price: 15.0, qtyInStock: 7 }
  ]).node();

  total = commerceutil.getTotalStockRemaining(item);
  expect(total).toEqual(Number.MAX_SAFE_INTEGER);

  item = product.type(ProductType.DIGITAL).node();
  total = commerceutil.getTotalStockRemaining(item);
  expect(total).toEqual(Number.MAX_SAFE_INTEGER);
});


