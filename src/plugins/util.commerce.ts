import { Decimal } from '@phensley/cldr-core';
import { isTruthy, Node } from '../node';
import { ProductType } from './enums';
import { Type } from '../types';
import { parseDecimal } from './util.i18n';

const productTypePath = ['structuredContent', 'productType'];
const variantsPath = ['structuredContent', 'variants'];

const ZERO: Decimal = parseDecimal('0')!;

const DEFAULT_MONEY_NODE = new Node({
  'value': '0',
  'currency': 'USD'
});

export const getProductType = (item: Node) => {
  const type = item.path(productTypePath);
  return ProductType.fromCode(type.asNumber());
};

// const getPrice = (v: Node) => isTruthy(v.get('onSale')) ? v.get('salePrice') : v.get('price');

export const getVariants = (item: Node) => {
  return item.path(variantsPath);
};

export const hasVariants = (item: Node) => {
  const type = getProductType(item);
  const variants = getVariants(item);
  const populated = variants.type === Type.ARRAY && variants.value.length > 1;
  return type === ProductType.DIGITAL ? false : populated;
};

export const getAmountFromMoneyNode = (moneyNode?: Node) => {
  if (!moneyNode) {
    return ZERO;
  }
  const value = moneyNode.path(['value']).asString();
  return !value ? ZERO : (parseDecimal(value) || ZERO);
};

export const getLegacyPriceFromMoneyNode = (moneyNode: Node): Decimal => {
  const price = getAmountFromMoneyNode(moneyNode);
  return price ? price.movePoint(2) : ZERO;
};

export const getFromPrice = (item: Node): Node | undefined => {
  const type = getProductType(item);
  const content = item.get('structuredContent');

  switch (type) {
    case ProductType.GIFT_CARD:
    case ProductType.PHYSICAL:
    case ProductType.SERVICE: {
      const variants = content.get('variants');
      const size = variants.size();
      if (variants.type !== Type.ARRAY || size === 0) {
        return DEFAULT_MONEY_NODE;
      }
      const first = variants.get(0);
      let moneyNode = isTruthy(first.path(['onSale']))
        ? first.path(['salePriceMoney'])
        : first.path(['priceMoney']);
      let price = getAmountFromMoneyNode(moneyNode);
      if (price === undefined) {
        return undefined;
      }

      for (let i = 1; i < variants.size(); i++) {
        const v = variants.get(i);
        const currentNode = isTruthy(v.path(['onSale']))
          ? v.path(['salePriceMoney'])
          : v.path(['priceMoney']);
        const current = getAmountFromMoneyNode(currentNode)!;
        if (current && current.compare(price) < 0) {
          price = current;
          moneyNode = currentNode;
        }
      }
      return moneyNode;
    }

    case ProductType.DIGITAL: {
      const money = content.path(['priceMoney']);
      return money.isMissing() ? DEFAULT_MONEY_NODE : money;
    }

    default:
      return DEFAULT_MONEY_NODE;
  }
};

export const getNormalPrice = (item: Node): Node | undefined => {
  const type = getProductType(item);
  const content = item.get('structuredContent');

  switch (type) {
    case ProductType.PHYSICAL:
    case ProductType.SERVICE:
    case ProductType.GIFT_CARD: {
      const variants = content.get('variants');
      const size = variants.size();
      if (variants.type !== Type.ARRAY || size === 0) {
        return DEFAULT_MONEY_NODE;
      }
      let moneyNode = variants.get(0);
      let price = getAmountFromMoneyNode(moneyNode);
      if (price === undefined) {
        return undefined;
      }

      for (let i = 1; i < variants.size(); i++) {
        const currentNode = variants.get(i).path(['priceMoney']);
        const curr = getAmountFromMoneyNode(currentNode)!;
        if (curr && curr.compare(price) > 0) {
          price = curr;
          moneyNode = currentNode;
        }
      }
      return moneyNode;
    }

    case ProductType.DIGITAL: {
      const money = content.path(['priceMoney']);
      return money.isMissing() ? DEFAULT_MONEY_NODE : money;
    }

    default:
      return DEFAULT_MONEY_NODE;
  }
};

export const getSalePrice = (item: Node): Node | undefined => {
  const type = getProductType(item);
  const content = item.get('structuredContent');

  switch (type) {
    case ProductType.PHYSICAL:
    case ProductType.SERVICE: {
      const variants = content.get('variants');
      const size = variants.size();
      if (variants.type !== Type.ARRAY || size === 0) {
        return DEFAULT_MONEY_NODE;
      }
      let saleNode: Node | undefined;
      let salePrice: Decimal | undefined;
      for (let i = 0; i < size; i++) {
        const v = variants.get(i);
        const priceMoney = v.path(['salePriceMoney']);
        const price = getAmountFromMoneyNode(priceMoney);
        if (isTruthy(v.path(['onSale']))) {
          if (!saleNode) {
            saleNode = priceMoney;
            salePrice = price;
          } else if (price && salePrice && price.compare(salePrice) < 0) {
            saleNode = priceMoney;
            salePrice = price;
          }
        }
      }
      return salePrice ? saleNode : DEFAULT_MONEY_NODE;
    }

    case ProductType.DIGITAL: {
      const money = content.path(['salePriceMoney']);
      return money.isMissing() ? DEFAULT_MONEY_NODE : money;
    }

    case ProductType.GIFT_CARD:
    default:
      return DEFAULT_MONEY_NODE;
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

// TODO: writeMoneyString

// TODO: writePriceString

// TODO: writeVariantFormat

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
