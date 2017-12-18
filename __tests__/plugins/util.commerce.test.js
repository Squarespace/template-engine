import * as commerceutil from '../../src/plugins/util.commerce';
import Node from '../../src/node';
import { ProductType } from '../../src/plugins/enums';
import { Product } from '../helpers';

const PRODUCT = new Product();


test('product type', () => {
  const item = new Node({ structuredContent: { productType: 3 } });
  expect(commerceutil.getProductType(item)).toBe(ProductType.SERVICE);
});


test('has variants', () => {
  const product = PRODUCT.variants([]);

  let item = product.get();
  let result = commerceutil.hasVariants(item);
  expect(result).toEqual(false);

  item = PRODUCT.variants([{ price: 123 }]).get();
  result = commerceutil.hasVariants(item);
  expect(result).toEqual(false);

  item = PRODUCT.variants([{ price: 123 }, { price: 456 }]).get();
  result = commerceutil.hasVariants(item);
  expect(result).toEqual(true);
});


test('from price', () => {
  const product = PRODUCT.type(ProductType.SERVICE);

  let item = product.variants([ { price: 100.0, }, { price: 200.0 } ]).get();
  let price = commerceutil.getFromPrice(item);
  expect(price).toEqual(100.0);

  item = product.variants([
    { price: 1000 },
    { price: 750 },
    { price: 1500 }
  ]).get();
  price = commerceutil.getFromPrice(item);
  expect(price).toEqual(750);

  item = product.variants([]).get();
  price = commerceutil.getFromPrice(item);
  expect(price).toEqual(0);

  item = product.type(ProductType.UNDEFINED).get();
  price = commerceutil.getFromPrice(item);
  expect(price).toEqual(0.0);

  item = product.type(ProductType.DIGITAL).set(203, 'structuredContent', 'priceCents').get();
  price = commerceutil.getFromPrice(item);
  expect(price).toEqual(203);
});


test('normal price', () => {
  const product = PRODUCT.type(ProductType.SERVICE);

  let item = product.variants([{ price: 100.0 }, { price: 200.0 }]).get();
  let price = commerceutil.getNormalPrice(item);
  expect(price).toEqual(200.0);

  item = product.variants([]).get();
  price = commerceutil.getNormalPrice(item);
  expect(price).toEqual(0);

  item = product.type(ProductType.DIGITAL).set(175, 'structuredContent', 'priceCents').get();
  price = commerceutil.getNormalPrice(item);
  expect(price).toEqual(175.0);

  item = product.type(ProductType.GIFT_CARD).get();
  price = commerceutil.getNormalPrice(item);
  expect(price).toEqual(0);
});


test('sale price', () => {
  const product = PRODUCT.type(ProductType.SERVICE);

  let item = product.variants([{ price: 100.0 }, { price: 200.0 }]).get();
  let price = commerceutil.getSalePrice(item);
  expect(price).toEqual(0);

  item = product.variants([{ price: 100.0 }, { onSale: true, salePrice: 75.0 }]).get();
  price = commerceutil.getSalePrice(item);
  expect(price).toEqual(75.0);

  item = product.variants([]).get();
  price = commerceutil.getSalePrice(item);
  expect(price).toEqual(0);

  item = product.type(ProductType.DIGITAL).set(150, 'structuredContent', 'priceCents').get();
  price = commerceutil.getSalePrice(item);
  expect(price).toEqual(150);

  item = product.type(ProductType.GIFT_CARD).get();
  price = commerceutil.getSalePrice(item);
  expect(price).toEqual(0);
});


test('total stock remaining', () => {
  const product = PRODUCT.type(ProductType.PHYSICAL);

  let item = product.variants([
    { price: 100.0, qtyInStock: 10 },
    { price: 200.0, qtyInStock: 15 }
  ]).get();

  let total = commerceutil.getTotalStockRemaining(item);
  expect(total).toEqual(25);

  item = product.variants([
    { unlimited: true, price: 10.0 },
    { price: 15.0, qtyInStock: 7 }
  ]).get();
  total = commerceutil.getTotalStockRemaining(item);
  expect(total).toEqual(Number.MAX_SAFE_INTEGER);

  item = product.type(ProductType.DIGITAL).get();
  total = commerceutil.getTotalStockRemaining(item);
  expect(total).toEqual(Number.MAX_SAFE_INTEGER);
});


test('has varied prices', () => {
  const product = PRODUCT.type(ProductType.PHYSICAL);

  [ProductType.PHYSICAL, ProductType.GIFT_CARD, ProductType.SERVICE].forEach(type => {
    let item = product.type(type).variants([
      { price: 100.0, qtyInStock: 10 },
      { price: 200.0, qtyInStock: 15 }
    ]).get();

    let result = commerceutil.hasVariedPrices(item);
    expect(result).toEqual(true);

    item = product.type(type).variants([
      { price: 100.0 },
      { price: 100.0 }
    ]).get();
    result = commerceutil.hasVariedPrices(item);
    expect(result).toEqual(false);
  });

  const item = product.type(ProductType.DIGITAL).get();
  const result = commerceutil.hasVariedPrices(item);
  expect(result).toEqual(false);
});


test('is on sale', () => {
  const product = PRODUCT.type(ProductType.PHYSICAL);

  let item = product.variants([
    { price: 100.0 },
    { price: 200.0 },
    { onSale: true, price: 50.0 }
  ]).get();

  let result = commerceutil.isOnSale(item);
  expect(result).toEqual(true);

  item = product.variants([]).get();
  result = commerceutil.isOnSale(item);
  expect(result).toEqual(false);

  item = product.variants({}).get();
  result = commerceutil.isOnSale(item);
  expect(result).toEqual(false);

  item = product.type(ProductType.DIGITAL).set(true, 'structuredContent', 'onSale').get();
  result = commerceutil.isOnSale(item);
  expect(result).toEqual(true);

  [ProductType.GIFT_CARD, ProductType.UNDEFINED].forEach(type => {
    item = PRODUCT.type(type).get();
    result = commerceutil.isOnSale(item);
    expect(result).toEqual(false);
  });
});


test('is sold out', () => {
  const product = PRODUCT.type(ProductType.PHYSICAL);

  let item = product.variants([
    { qtyInStock: 0 },
    { qtyInStock: 1 },
  ]).get();

  let result = commerceutil.isSoldOut(item);
  expect(result).toEqual(false);

  item = product.variants([
    { qtyInStock: 0 },
    { qtyInStock: 0 }
  ]).get();
  result = commerceutil.isSoldOut(item);
  expect(result).toEqual(true);

  item = product.variants(123).get();
  result = commerceutil.isSoldOut(item);
  expect(result).toEqual(true);

  [ProductType.DIGITAL, ProductType.GIFT_CARD, ProductType.UNDEFINED].forEach(type => {
    item = PRODUCT.type(type).get();
    result = commerceutil.isSoldOut(item);
    expect(result).toEqual(false);
  });

});
