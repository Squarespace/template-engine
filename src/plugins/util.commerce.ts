import { isTruthy, Node } from '../node';
import { ProductType } from './enums';
import { Type } from '../types';

const productTypePath = ['structuredContent', 'productType'];
const variantsPath = ['structuredContent', 'variants'];

export const getProductType = (item: Node) => {
  const type = item.path(productTypePath);
  return ProductType.fromCode(type.asNumber());
};

const getPrice = (v: Node) => isTruthy(v.get('onSale')) ? v.get('salePrice') : v.get('price');

export const getVariants = (item: Node) => {
  return item.path(variantsPath);
};

export const hasVariants = (item: Node) => {
  const type = getProductType(item);
  const variants = getVariants(item);
  const populated = variants.type === Type.ARRAY && variants.value.length > 1;
  return type === ProductType.DIGITAL ? false : populated;
};

export const getFromPrice = (item: Node) => {
  const type = getProductType(item);
  const content = item.get('structuredContent');

  switch (type) {
  case ProductType.GIFT_CARD:
  case ProductType.PHYSICAL:
  case ProductType.SERVICE: {
    const variants = content.get('variants');
    const size = variants.size();
    if (variants.type !== Type.ARRAY || size === 0) {
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

  case ProductType.DIGITAL: {
    const cents = content.get('priceCents');
    return cents.isMissing() ? 0 : cents.asNumber();
  }

  default:
    return 0;
  }
};

export const getNormalPrice = (item: Node) => {
  const type = getProductType(item);
  const content = item.get('structuredContent');

  switch (type) {
  case ProductType.PHYSICAL:
  case ProductType.SERVICE: {
    const variants = content.get('variants');
    const size = variants.size();
    if (variants.type !== Type.ARRAY || size === 0) {
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

  case ProductType.DIGITAL: {
    const cents = content.get('priceCents');
    return cents.isMissing() ? 0 : cents.asNumber();
  }

  case ProductType.GIFT_CARD:
  default:
    return 0;
  }
};

export const getSalePrice = (item: Node) => {
  const type = getProductType(item);
  const content = item.get('structuredContent');

  switch (type) {
  case ProductType.PHYSICAL:
  case ProductType.SERVICE: {
    const variants = content.get('variants');
    const size = variants.size();
    if (variants.type !== Type.ARRAY || size === 0) {
      return 0;
    }
    let salePrice: number | null = null;
    for (let i = 0; i < size; i++) {
      const variant = variants.get(i);
      const price = variant.get('salePrice').asNumber();
      if (isTruthy(variant.get('onSale')) && (salePrice === null || price < salePrice)) {
        salePrice = price;
      }
    }
    return salePrice === null ? 0 : salePrice;
  }

  case ProductType.DIGITAL: {
    const cents = content.get('salePriceCents');
    return cents.isMissing() ? 0 : cents.asNumber();
  }

  case ProductType.GIFT_CARD:
  default:
    return 0;
  }
};

export const getTotalStockRemaining = (item: Node) => {
  const type = getProductType(item);
  if (type === ProductType.DIGITAL || type === ProductType.GIFT_CARD) {
    return Number.MAX_SAFE_INTEGER;
  }

  let total = 0;
  const variants = getVariants(item);
  const size = variants.size();
  if (variants.type === Type.ARRAY && size > 0) {
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

export const hasVariedPrices = (item: Node) => {
  const type = getProductType(item);

  switch (type) {
  case ProductType.GIFT_CARD:
  case ProductType.PHYSICAL:
  case ProductType.SERVICE: {
    const variants = getVariants(item);
    const size = variants.size();
    if (variants.type === Type.ARRAY && size > 0) {
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

export const isOnSale = (item: Node) => {
  const type = getProductType(item);
  const content = item.get('structuredContent');

  switch (type) {
  case ProductType.PHYSICAL:
  case ProductType.SERVICE: {
    const variants = content.get('variants');
    const size = variants.size();
    if (variants.type === Type.ARRAY && size > 0) {
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

export const isSoldOut = (item: Node) => {
  const type = getProductType(item);
  switch (type) {
  case ProductType.PHYSICAL:
  case ProductType.SERVICE: {
    const variants = getVariants(item);
    if (variants.type === Type.ARRAY) {
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
    return false;

  default:
    return true;
  }
};

export const isSubscribable = (item: Node): boolean =>
  item.path(['structuredContent', 'isSubscribable']).asBoolean();

const getUserDefinedOptions = (content: Node) => {
  const ordering = content.get('variantOptionOrdering');
  const options = [];
  const size = ordering.size();
  for (let i = 0; i < size; i++) {
    const name = ordering.get(i).asString();
    options.push({ name, values: [] });
  }
  return options;
};

export const getItemVariantOptions = (item: Node) => {
  const content = item.get('structuredContent');
  const variants = content.get('variants');
  const variantsSize = variants.size();
  if (variantsSize <= 1) {
    return [];
  }

  const userDefinedOptions = getUserDefinedOptions(content);

  for (let i = 0; i < variantsSize; i++) {
    const variant = variants.get(i);
    const attrs: Node = variant.get('attributes');
    if (attrs.type !== Type.OBJECT) {
      continue;
    }

    const fields = Object.keys(attrs.value);
    for (let j = 0; j < fields.length; j++) {
      const field = fields[j];
      const variantOptionValue: string = attrs.get(field).asString();

      let option = null;
      for (let k = 0; k < userDefinedOptions.length; k++) {
        const current = userDefinedOptions[k];
        if (current.name === field) {
          option = current;
          break;
        }
      }

      if (option === null) {
        continue;
      }

      let hasValue = false;
      const optionValues: string[] = option.values;
      for (let k = 0; k < optionValues.length; k++) {
        const value = optionValues[k];
        if (value === variantOptionValue) {
          hasValue = true;
          break;
        }
      }

      if (!hasValue) {
        optionValues.push(variantOptionValue);
      }
    }
  }
  return userDefinedOptions;
};

const MULTIPLE_QTY_ALLOWED_FIELD = 'multipleQuantityAllowedForServices';

export const isMultipleQuantityAllowedForServices = (websiteSettings: Node) => {
  const storeSettings = websiteSettings.get('storeSettings');
  if (storeSettings.type === Type.OBJECT) {
    const value = storeSettings.get(MULTIPLE_QTY_ALLOWED_FIELD);
    if (value.type !== Type.NULL && value.type !== Type.MISSING) {
      return value.asBoolean();
    }
  }
  return true;
};

export const getVariantFormat = (variant: Node) => {
  const options = variant.get('optionValues');
  const size = options.size();
  let res = '';
  for (let i = 0; i < size; i++) {
    if (i > 0) {
      res += ' / ';
    }
    const value = options.get(i).get('value').asString();
    res += value;
  }
  return res;
};
