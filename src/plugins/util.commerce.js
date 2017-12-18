import { ProductType } from './enums';
import types from '../../src/types';
import { isTruthy } from '../util';


const productTypePath = ['structuredContent', 'productType'];
const variantsPath = ['structuredContent', 'variants'];

export const getProductType = item => {
  const type = item.path(productTypePath);
  return ProductType.fromCode(type.asNumber());
};


const getPrice = v => {
  return isTruthy(v.get('onSale')) ? v.get('salePrice') : v.get('price');
};


export const getVariants = item => {
  return item.path(variantsPath);
};


export const hasVariants = item => {
  const type = getProductType(item);
  const variants = getVariants(item);
  const populated = variants.type === types.ARRAY && variants.value.length > 1;
  return type === ProductType.DIGITAL ? false : populated;
};


export const getFromPrice = item => {
  const type = getProductType(item);
  const content = item.get('structuredContent');

  switch (type) {
  case ProductType.GIFT_CARD:
  case ProductType.PHYSICAL:
  case ProductType.SERVICE:
  {
    const variants = content.get('variants');
    const size = variants.size();
    if (variants.type !== types.ARRAY || size === 0) {
      return 0;
    }
    const first = variants.get(0);
    let price = getPrice(first).asNumber();
    for (let i = 1; i < size; i++) {
      const current = getPrice(variants.get(i)).asNumber();
      if (current < price) {
        price = current;
      }
    }
    return price;
  }

  case ProductType.DIGITAL:
  {
    const cents = content.get('priceCents');
    return cents.isMissing() ? 0 : cents.asNumber();
  }

  default:
    return 0;
  }
};

export const getNormalPrice = item => {
  const type = getProductType(item);
  const content = item.get('structuredContent');

  switch (type) {
  case ProductType.PHYSICAL:
  case ProductType.SERVICE:
  {
    const variants = content.get('variants');
    const size = variants.size();
    if (variants.type !== types.ARRAY || size === 0) {
      return 0;
    }
    let price = variants.get(0).get('price').asNumber();
    for (let i = 1; i < size; i++) {
      const current = variants.get(i).get('price').asNumber();
      if (current > price) {
        price = current;
      }
    }
    return price;
  }

  case ProductType.DIGITAL:
  {
    const cents = content.get('priceCents');
    return cents.isMissing() ? 0 : cents.asNumber();
  }

  case ProductType.GIFT_CARD:
  default:
    return 0;
  }
};


export const getSalePrice = item => {
  const type = getProductType(item);
  const content = item.get('structuredContent');

  switch (type) {
  case ProductType.PHYSICAL:
  case ProductType.SERVICE:
  {
    const variants = content.get('variants');
    const size = variants.size();
    if (variants.type !== types.ARRAY || size === 0) {
      return 0;
    }
    let salePrice = null;
    for (let i = 0; i < size; i++) {
      const variant = variants.get(i);
      const price = variant.get('salePrice').asNumber();
      if (isTruthy(variant.get('onSale')) && (salePrice === null || price < salePrice)) {
        salePrice = price;
      }
    }
    return salePrice === null ? 0 : salePrice;
  }

  case ProductType.DIGITAL:
  {
    const cents = content.get('priceCents');
    return cents.isMissing() ? 0 : cents.asNumber();
  }

  case ProductType.GIFT_CARD:
  default:
    return 0;
  }
};


export const getTotalStockRemaining = item => {
  const type = getProductType(item);
  if (type === ProductType.DIGITAL || type === ProductType.GIFT_CARD) {
    return Number.MAX_SAFE_INTEGER;
  }

  let total = 0;
  const variants = getVariants(item);
  const size = variants.size();
  if (variants.type === types.ARRAY && size > 0) {
    for (let i = 0; i < size; i++) {
      const variant = variants.get(i);
      if (isTruthy(variant.get('unlimited'))) {
        return Number.MAX_SAFE_INTEGER;
      }
      total += variant.get('qtyInStock').asNumber();
    }
  }
  return total;
};



export const hasVariedPrices = item => {
  const type = getProductType(item);

  switch (type) {
  case ProductType.GIFT_CARD:
  case ProductType.PHYSICAL:
  case ProductType.SERVICE:
  {
    const variants = getVariants(item);
    const size = variants.size();
    if (variants.type === types.ARRAY && size > 0) {
      const first = variants.get(0);
      const onSale = first.get('onSale');
      const salePrice = first.get('salePrice');
      const price = first.get('price');

      for (let i = 1; i < size; i++) {
        const v = variants.get(i);
        const flag1 = !v.get('onSale').equals(onSale);
        const flag2 = isTruthy(onSale) && !v.get('salePrice').equals(salePrice);
        const flag3 = !v.get('price').equals(price);
        if (flag1 || flag2 || flag3) {
          return true;
        }
      }
    }
    return false;
  }

  case ProductType.DIGITAL:
  default:
    return false;
  }
};


export const isOnSale = item => {
  const type = getProductType(item);
  const content = item.get('structuredContent');

  switch (type) {
  case ProductType.PHYSICAL:
  case ProductType.SERVICE:
  {
    const variants = content.get('variants');
    const size = variants.size();
    if (variants.type === types.ARRAY && size > 0) {
      for (let i = 0; i < size; i++) {
        const variant = variants.get(i);
        if (isTruthy(variant.get('onSale'))) {
          return true;
        }
      }
    }
    break;
  }

  case ProductType.DIGITAL:
    return isTruthy(content.get('onSale'));

  case ProductType.GIFT_CARD:
  default:
    break;
  }
  return false;
};


export const isSoldOut = item => {
  const type = getProductType(item);
  switch (type) {
  case ProductType.PHYSICAL:
  case ProductType.SERVICE:
  {
    const variants = getVariants(item);
    if (variants.type === types.ARRAY) {
      for (let i = 0; i < variants.size(); i++) {
        const variant = variants.get(i);
        if (isTruthy(variant.get('unlimited')) || variant.get('qtyInStock').asNumber() > 0) {
          return false;
        }
      }
    }
    return true;
  }

  case ProductType.DIGITAL:
  case ProductType.GIFT_CARD:
  default:
    return false;
  }
};


// TODO: writeMoneyString

// TODO: writePriceString

// TODO: writeVariantFormat

// TODO: getItemVariantOptions

// TODO: isMultipleQuantityAllowedForServices

