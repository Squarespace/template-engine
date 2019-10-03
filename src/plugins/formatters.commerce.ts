import { Context } from '../context';
import { Node } from '../node';
import { Variable } from '../variable';
import { RootCode } from '../instructions';
import { Formatter, FormatterTable } from '../plugin';
import { isTruthy, MISSING_NODE } from '../node';
import { executeTemplate } from '../exec';
import * as commerceutil from './util.commerce';
import * as stringutil from './util.string';
import { Type } from '../types';

// Template imports
import addToCartBtnTemplate from './templates/add-to-cart-btn.json';
import productCheckoutTemplate from './templates/product-checkout.json';
import productScarcityTemplate from './templates/product-scarcity.json';
import quantityInputTemplate from './templates/quantity-input.json';
import summaryFormFieldAddressTemplate from './templates/summary-form-field-address.json';
import summaryFormFieldCheckboxTemplate from './templates/summary-form-field-checkbox.json';
import summaryFormFieldDateTemplate from './templates/summary-form-field-date.json';
import summaryFormFieldLikertTemplate from './templates/summary-form-field-likert.json';
import summaryFormFieldNameTemplate from './templates/summary-form-field-name.json';
import summaryFormFieldPhoneTemplate from './templates/summary-form-field-phone.json';
import summaryFormFieldTimeTemplate from './templates/summary-form-field-time.json';
import variantsSelectTemplate from './templates/variants-select.json';
import { ProductType } from './enums';

export class AddToCartButtonFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const text = executeTemplate(ctx, addToCartBtnTemplate as unknown as RootCode, first.node, false);
    first.set(text);
  }
}

// TODO: bookkeeper-money-format
export class BookkeeperMoneyFormat extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    // TBD
  }
}

export class CartQuantityFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    let count = 0;
    const entries = first.node.get('entries');
    if (entries.type === Type.ARRAY) {
      for (let i = 0; i < entries.value.length; i++) {
        count += entries.get(i).get('quantity').asNumber();
      }
    }
    const text = `<span class="sqs-cart-quantity">${count}</span>`;
    first.set(text);
  }
}

export class CartSubtotalFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const cents = first.node.get('subtotalCents').asNumber();
    // const text = `<span class="sqs-cart-subtotal">`;
    // TODO: writeMoneyString

  }
}

export class CartUrlFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    vars[0].set('/cart');
  }
}

export class FromPriceFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const price = commerceutil.getFromPrice(first.node);
    first.set(price);
  }
}

// TODO: MoneyBaseFormatter base class
// TODO: moneyFormat
// TODO: money-format
// TODO: money-string
// TODO: percentage-format

export class NormalPriceFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const price = commerceutil.getNormalPrice(first.node);
    first.set(price);
  }
}

export class ProductCheckoutFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const text = executeTemplate(ctx, productCheckoutTemplate as unknown as RootCode, first.node, false);
    first.set(text);
  }
}

// TODO: product-price

export class ProductQuickViewFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const node = first.node;
    const id = node.get('id').asString();
    let group = args[0] || '';
    let groupNode = node.get(group);
    if (!groupNode.isMissing()) {
      group = groupNode.asString();
    } else {
      groupNode = ctx.resolve([group]);
      if (!groupNode.isMissing()) {
        group = groupNode.asString();
      }
    }

    let buf = '';
    buf += `<span class="sqs-product-quick-view-button" data-id="${id}"`;
    buf += ` data-group="${group}">`;

    const text = ctx.resolve(['localizedStrings', 'productQuickViewText']);
    buf += text.isMissing() ? 'Quick View' : text.asString();
    buf += '</span>';
    first.set(buf);
  }

}

export class ProductScarcityFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const merchCtx = ctx.resolve(['productMerchandisingContext']);
    if (merchCtx.isMissing()) {
      return;
    }

    const first = vars[0];
    const product = first.node;
    const id = product.get('id').asString();
    const productCtx = merchCtx.get(id);

    if (!productCtx.isMissing() && productCtx.get('scarcityEnabled').asBoolean()) {
      const obj: any = {
        scarcityTemplateViews: productCtx.get('scarcityTemplateViews'),
        scarcityText: productCtx.get('scarcityText'),
        scarcityShownByDefault: productCtx.get('scarcityShownByDefault')
      };
      const res = executeTemplate(ctx, productScarcityTemplate as unknown as RootCode, new Node(obj), false);
      first.set(res);
    }
  }
}

export class ProductStatusFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const node = first.node;
    if (commerceutil.isSoldOut(node)) {
      const key = ['localizedStrings', 'productSoldOutText'];
      const text = ctx.resolve(key).asString();
      let buf = `<div class="product-mark sold-out">`;
      buf += text || 'sold out';
      buf += '</div>';
      first.set(buf);

    } else if (commerceutil.isOnSale(node)) {
      const key = ['localizedStrings', 'productSaleText'];
      const text = ctx.resolve(key).asString();
      let buf = `<div class="product-mark sale">`;
      buf += text || 'sale';
      buf += '</div>';
      first.set(buf);

    } else {
      first.set(MISSING_NODE);
    }
  }
}

export class QuantityInputFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const node = first.node;
    const type = commerceutil.getProductType(node);
    const settings = ctx.resolve(['websiteSettings']);
    const multipleQuantityAllowed =
      (type === ProductType.PHYSICAL ||
        (type === ProductType.SERVICE && commerceutil.isMultipleQuantityAllowedForServices(settings)))
      && !commerceutil.isSubscribable(node);
    const hide = !multipleQuantityAllowed || commerceutil.getTotalStockRemaining(node) <= 1;
    if (hide) {
      first.set(MISSING_NODE);
      return;
    }
    const res = executeTemplate(ctx, quantityInputTemplate as unknown as RootCode, node, false);
    first.set(res);
  }
}

export class SalePriceFormatter extends Formatter {
  apply(args: string[], vars: Variable[], _ctx: Context): void {
    const first = vars[0];
    const price = commerceutil.getSalePrice(first.node);
    first.set(price);
  }
}

export class VariantDescriptorFormatter extends Formatter {
  apply(args: string[], vars: Variable[], _ctx: Context): void {
    const first = vars[0];
    const text = commerceutil.getVariantFormat(first.node);
    first.set(text);
  }
}

export class VariantsSelectFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];

    const options = commerceutil.getItemVariantOptions(first.node);
    if (options.length === 0) {
      first.set(MISSING_NODE);
      return;
    }

    const selectText = this.getSelectText(ctx, first.node);
    const node = ctx.newNode({
      item: first.node.value,
      options,
      selectText
    });

    const text = executeTemplate(ctx, variantsSelectTemplate as unknown as RootCode, node, false);
    first.set(text);
  }

  private getSelectText(ctx: Context, node: Node): string {
    const productType = commerceutil.getProductType(node);
    // Gift Cards have variants forcibly named "Value" by default (as opposed to a merchant-defined variant name) and
    // thus must be translated differently than other products. See COM-4912 for more details
    let text = '';

    // TODO: still need to implement message formatting in typescript compiler
    const fallback = 'Select Value';
    if (productType === ProductType.GIFT_CARD) {
      text = ctx.resolve(['localizedStrings', 'giftCardVariantSelectText']).asString();
      // fallback = 'Select Value';
    } else {
      text = ctx.resolve(['localizedStrings', 'productVariantSelectText']).asString();
      // fallback = 'Select {variantName}';
    }
    return stringutil.defaultIfEmpty(text, fallback);
  }
}

const KEY_PREFIX = 'productAnswerMap';
const KEY_STRONGLY_DISAGREE = KEY_PREFIX + 'StronglyDisagree';
const KEY_DISAGREE = KEY_PREFIX + 'Disagree';
const KEY_NEUTRAL = KEY_PREFIX + 'Neutral';
const KEY_AGREE = KEY_PREFIX + 'Agree';
const KEY_STRONGLY_AGREE = KEY_PREFIX + 'StronglyAgree';

const localizeOrDefault = (strings: Node, key: string, defaultValue: string) => {
  const node = strings.get(key);
  return node.type === Type.STRING ? node.value : defaultValue;
};

const buildAnswerMap = (strings: Node) => {
  return {
    '-2': localizeOrDefault(strings, KEY_STRONGLY_DISAGREE, 'Strongly Disagree'),
    '-1': localizeOrDefault(strings, KEY_DISAGREE, 'Disagree'),
    '0': localizeOrDefault(strings, KEY_NEUTRAL, 'Neutral'),
    '1': localizeOrDefault(strings, KEY_AGREE, 'Agree'),
    '2': localizeOrDefault(strings, KEY_STRONGLY_AGREE, 'Strongly Agree'),
  };
};

const convertLikert = (values: any, answerMap: any) => {
  const result = [];
  const keys = Object.keys(values);
  const defaultValue = answerMap['0'];
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const answerKey = values[key];
    const value = answerMap[answerKey];
    result.push({ question: key, answer: value || defaultValue });
  }
  return result;
};

const SUMMARY_FORM_FIELD_TEMPLATE_MAP: { [x: string]: RootCode } = {
  address: summaryFormFieldAddressTemplate as unknown as RootCode,
  checkbox: summaryFormFieldCheckboxTemplate as unknown as RootCode,
  date: summaryFormFieldDateTemplate as unknown as RootCode,
  likert: summaryFormFieldLikertTemplate as unknown as RootCode,
  name: summaryFormFieldNameTemplate as unknown as RootCode,
  phone: summaryFormFieldPhoneTemplate as unknown as RootCode,
  time: summaryFormFieldTimeTemplate as unknown as RootCode,
};

export class SummaryFormFieldFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const field = first.node;

    const localizedStrings = ctx.resolve(['localizedStrings']);
    const type = field.get('type').asString();
    const code = SUMMARY_FORM_FIELD_TEMPLATE_MAP[type];

    let value: string | null = null;
    if (code === undefined) {
      value = field.get('value').asString();
    } else {
      let node = field;
      if (type === 'likert') {
        const answerMap = buildAnswerMap(localizedStrings);
        const likert = convertLikert(field.get('values').value, answerMap);
        node = ctx.newNode(likert);
      }
      value = executeTemplate(ctx, code, node, true);
    }

    let buf = '<div style="font-size:11px; margin-top:3px">\n';

    buf += '  <span style="font-weight:bold;">';
    buf += field.get('rawTitle').asString();
    buf += ':</span> ';
    if (isTruthy(value)) {
      buf += value;
    } else {
      const text = localizedStrings.get('productSummaryFormNoAnswerText').asString().trim();
      buf += text === '' ? 'N/A' : text;
    }
    buf += '\n</div>';
    first.set(buf);
  }
}

export const TABLE: FormatterTable = {
  'add-to-cart-btn': new AddToCartButtonFormatter(),
  'cart-quantity': new CartQuantityFormatter(),
  'cart-subtotal': new CartSubtotalFormatter(),
  'cart-url': new CartUrlFormatter(),
  'from-price': new FromPriceFormatter(),
  'normal-price': new NormalPriceFormatter(),
  'product-checkout': new ProductCheckoutFormatter(),
  'product-quick-view': new ProductQuickViewFormatter(),
  'product-status': new ProductStatusFormatter(),
  'quantity-input': new QuantityInputFormatter(),
  'sale-price': new SalePriceFormatter(),
  'summary-form-field': new SummaryFormFieldFormatter(),
  'variant-descriptor': new VariantDescriptorFormatter(),
  'variants-select': new VariantsSelectFormatter(),
};
