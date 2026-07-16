import { CurrencyType, Decimal } from '@phensley/cldr-core';
import { isTruthy, Node } from '../node';
import { Patch } from '../compat/patch';
import { ProductType } from './enums';
import { Type } from '../types';
import { parseDecimal, useCLDRMode } from './util.i18n';
import { Context } from 'src/context';
import { currencyOptions } from './options';

const productTypePath = ['structuredContent', 'productType'];
const variantsPath = ['structuredContent', 'variants'];

const ZERO: Decimal = parseDecimal('0')!;

const DEFAULT_MONEY_NODE = new Node({
  value: '0',
  currency: 'USD',
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
  return !value ? ZERO : parseDecimal(value) || ZERO;
};

export const getCurrencyFromMoneyNode = (moneyNode: Node): CurrencyType => {
  const currencyNode = moneyNode.path(['currency']);
  const currency = !currencyNode.isMissing() ? currencyNode.asString().trim() : DEFAULT_MONEY_NODE.path(['currency']).asString();

  return currency as CurrencyType;
};

export const getLegacyPriceFromMoneyNode = (moneyNode: Node): Decimal => {
  const price = getAmountFromMoneyNode(moneyNode);
  return price ? price.movePoint(2) : ZERO;
};

// Format a cents value as dollars from its exact digits, never through a
// double. Mirrors Java's BigDecimal.movePointLeft(2) on the cents value,
// followed by DecimalFormat's default HALF_EVEN rounding and US thousands
// grouping.
const formatMoneyExact = (cents: string): string => {
  const rounded = roundHalfEven(moveDecimalLeft(cents));
  const dot = rounded.indexOf('.');
  return `${groupThousands(rounded.slice(0, dot))}.${rounded.slice(dot + 1)}`;
};

/**
 * Move the decimal point two places left on an exact digits string, padding
 * the fractional part to at least two digits, so "1234" becomes "12.34" and
 * "12.5" becomes "0.125". Mirrors BigDecimal.movePointLeft(2).
 */
export const moveDecimalLeft = (cents: string): string => {
  const negative = cents.startsWith('-');
  const digits = negative ? cents.slice(1) : cents;
  const dot = digits.indexOf('.');
  const integer = dot < 0 ? digits : digits.slice(0, dot);
  const fraction = dot < 0 ? '' : digits.slice(dot + 1);
  const tail = integer.length >= 2 ? integer.slice(-2) : ('00' + integer).slice(-2);
  const rest = integer.slice(0, -2) || '0';
  return `${negative ? '-' : ''}${rest}.${tail}${fraction}`;
};

/**
 * Round a decimal string to two fraction digits, half to even, the default
 * RoundingMode of Java's DecimalFormat. A dropped 5 rounds to the even
 * neighbor unless a non-zero digit follows it, in which case it rounds up.
 */
export const roundHalfEven = (value: string): string => {
  const dot = value.indexOf('.');
  if (dot < 0) {
    return `${value}.00`;
  }
  const integer = value.slice(0, dot);
  const fraction = value.slice(dot + 1);
  if (fraction.length <= 2) {
    return `${integer}.${(fraction + '00').slice(0, 2)}`;
  }
  let keep = fraction.slice(0, 2);
  const dropped = fraction.slice(2);
  const first = dropped.charCodeAt(0) - 48;
  const lastOdd = (keep.charCodeAt(1) - 48) % 2 === 1;
  let nonZeroAfter = false;
  for (let i = 1; i < dropped.length; i++) {
    if (dropped.charCodeAt(i) !== 48) {
      nonZeroAfter = true;
      break;
    }
  }
  if (first < 5 || (first === 5 && !nonZeroAfter && !lastOdd)) {
    return `${integer}.${keep}`;
  }
  // Increment the kept digits, carrying into the integer part on "99".
  let i = 1;
  while (i >= 0) {
    const digit = keep.charCodeAt(i) - 48 + 1;
    if (digit < 10) {
      keep = keep.slice(0, i) + String(digit) + keep.slice(i + 1);
      return `${integer}.${keep}`;
    }
    keep = keep.slice(0, i) + '0' + keep.slice(i + 1);
    i--;
  }
  return `${incrementInteger(integer)}.00`;
};

// Add one to an integer digits string, carrying into a new leading digit,
// so "999" becomes "1000".
const incrementInteger = (integer: string): string => {
  const negative = integer.startsWith('-');
  const digits = negative ? integer.slice(1) : integer;
  const out = digits.split('');
  let i = out.length - 1;
  while (i >= 0) {
    const digit = out[i].charCodeAt(0) - 48 + 1;
    if (digit < 10) {
      out[i] = String(digit);
      break;
    }
    out[i] = '0';
    i--;
  }
  const value = i < 0 ? `1${'0'.repeat(digits.length)}` : out.join('');
  return `${negative ? '-' : ''}${value}`;
};

// Comma-group an integer digit string with US thousands separators, so
// "1234567" becomes "1,234,567".
const groupThousands = (integer: string): string => {
  const negative = integer.startsWith('-');
  const digits = negative ? integer.slice(1) : integer;
  const groups: string[] = [];
  for (let i = digits.length; i > 0; i -= 3) {
    groups.unshift(digits.slice(Math.max(0, i - 3), i));
  }
  return (negative ? '-' : '') + groups.join(',');
};

export const getMoneyString = (moneyNode: Node, args: string[], ctx: Context): string => {
  if (useCLDRMode(ctx)) {
    const amount = getAmountFromMoneyNode(moneyNode);
    const currencyCode = getCurrencyFromMoneyNode(moneyNode);

    return ctx.cldr?.Numbers.formatCurrency(amount, currencyCode, currencyOptions(args)) ?? '';
  } else {
    const legacyAmount = getLegacyPriceFromMoneyNode(moneyNode);
    // Residual: level 0 keeps the released TS code, which rounds through a
    // double with Intl's default half-up ties. A half-cent binary tie like
    // cents 12.5 renders 0.13 where Java's legacy half-even gives 0.12. The
    // empirical level 0 pin, cents 123456789012345678 -> ...456.80, replaces
    // the todo body's earlier ...660.00 estimate, which did not reproduce.
    // The fixed path above matches Java exactly.
    if (ctx.compatEnabled(Patch.MONEY_DOUBLE_ROUNDING)) {
      // Legacy, the exact code the release shipped.
      const numberFormatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const formattedAmount = numberFormatter.format(parseFloat(legacyAmount.toString()) / 100);

      return `<span class="sqs-money-native">${formattedAmount}</span>`;
    }
    // Fixed, it converts cents to dollars exactly.
    return `<span class="sqs-money-native">${formatMoneyExact(legacyAmount.toString())}</span>`;
  }
};

export const getSubscriptionMoneyFromFirstPricingOptions = (pricingOptions: Node): Node => {
  if (pricingOptions == null || pricingOptions.size() == 0) {
    return DEFAULT_MONEY_NODE;
  }

  const node = pricingOptions.get(0);

  return isTruthy(node.path(['onSale'])) ? node.path(['salePriceMoney']) : node.path(['priceMoney']);
};

export const getPricingOptionsAmongLowestVariant = (item: Node): Node | null => {
  const productType = getProductType(item);
  const structuredContent = item.path(['structuredContent']);

  switch (productType) {
    case ProductType.PHYSICAL:
    case ProductType.SERVICE:
      const variants = structuredContent.path(['variants']);
      if (variants.type !== Type.ARRAY || variants.size() === 0) {
        return null;
      }

      const first = variants.get(0);
      const moneyNode = isTruthy(first.path(['onSale'])) ? first.path(['salePriceMoney']) : first.path(['priceMoney']);

      let pricingOptions = first.path(['pricingOptions']);
      let price = getAmountFromMoneyNode(moneyNode);

      for (let i = 1; i < variants.size(); i++) {
        const variant = variants.get(i);
        const variantMoneyNode = isTruthy(variant.path(['onSale']))
          ? variant.path(['salePriceMoney'])
          : variant.path(['priceMoney']);
        const variantPrice = getAmountFromMoneyNode(variantMoneyNode);

        if (variantPrice.compare(price) < 0) {
          pricingOptions = variant.path(['pricingOptions']);
          price = variantPrice;
        }
      }

      return pricingOptions;
    default:
      return null;
  }
};

// NOTE: This is a port of getLowestPriceAmongVariants from template-compiler
export const getFromPrice = (item: Node): Node => {
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
      let moneyNode = isTruthy(first.path(['onSale'])) ? first.path(['salePriceMoney']) : first.path(['priceMoney']);
      let price = getAmountFromMoneyNode(moneyNode);

      for (let i = 1; i < variants.size(); i++) {
        const v = variants.get(i);
        const currentNode = isTruthy(v.path(['onSale'])) ? v.path(['salePriceMoney']) : v.path(['priceMoney']);
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

// NOTE: This is a port of getHighestPriceAmongVariants from template-compiler
export const getNormalPrice = (item: Node): Node => {
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
      let moneyNode = variants.get(0).path(['priceMoney']);
      let price = getAmountFromMoneyNode(moneyNode);

      for (let i = 1; i < variants.size(); i++) {
        const currentNode = variants.get(i).path(['priceMoney']);
        const curr = getAmountFromMoneyNode(currentNode)!;
        if (curr.compare(price) > 0) {
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

// NOTE: This is a port of getSalePriceMoneyNode from template-compiler
export const getSalePrice = (item: Node): Node => {
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
      return saleNode ?? DEFAULT_MONEY_NODE;
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

export const isSubscribable = (item: Node): boolean => item.path(['structuredContent', 'isSubscribable']).asBoolean();

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
