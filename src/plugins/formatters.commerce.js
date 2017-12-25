import { Formatter } from '../plugin';
import Node, { MISSING_NODE } from '../node';
import { executeTemplate, isTruthy } from '../util';
import * as commerceutil from './util.commerce';
import types from '../types';

// Template imports
import addToCartBtnTemplate from './templates/add-to-cart-btn.json';
import productCheckoutTemplate from './templates/product-checkout.json';
import variantsSelectTemplate from './templates/variants-select.json';
import summaryFormFieldAddressTemplate from './templates/summary-form-field-address.json';
import summaryFormFieldCheckboxTemplate from './templates/summary-form-field-checkbox.json';
import summaryFormFieldDateTemplate from './templates/summary-form-field-date.json';
import summaryFormFieldLikertTemplate from './templates/summary-form-field-likert.json';
import summaryFormFieldNameTemplate from './templates/summary-form-field-name.json';
import summaryFormFieldPhoneTemplate from './templates/summary-form-field-phone.json';
import summaryFormFieldTimeTemplate from './templates/summary-form-field-time.json';


class AddToCartButtonFormatter extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const text = executeTemplate(ctx, addToCartBtnTemplate, first.node, false);
    first.set(text);
  }
}

// TODO: bookkeeper-money-format

class CartQuantityFormatter extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    let count = 0;
    const entries = first.node.get('entries');
    if (entries.type === types.ARRAY) {
      for (let i = 0; i < entries.value.length; i++) {
        count += entries.get(i).get('quantity').asNumber();
      }
    }
    const text = `<span class="sqs-cart-quantity">${count}</span>`;
    first.set(text);
  }
}

class CartSubtotalFormatter extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const cents = first.node.get('subtotalCents').asNumber();
    // const text = `<span class="sqs-cart-subtotal">`;
    // TODO: writeMoneyString

  }
}

class CartUrlFormatter extends Formatter {
  apply(args, vars, ctx) {
    vars[0].set('/cart');
  }
}

class FromPriceFormatter extends Formatter {
  apply(args, vars, ctx) {
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

class NormalPriceFormatter extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const price = commerceutil.getNormalPrice(first.node);
    first.set(price);
  }
}

class ProductCheckoutFormatter extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const text = executeTemplate(ctx, productCheckoutTemplate, first.node, false);
    first.set(text);
  }
}

// TODO: product-price
// TODO: product-quick-view
// TODO: product-status
// TODO: quantity-input

class SalePriceFormatter extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const price = commerceutil.getSalePrice(first.node);
    first.set(price);
  }
}

class VariantDescriptorFormatter extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const text = commerceutil.getVariantFormat(first.node);
    first.set(text);
  }
}

class VariantsSelectFormatter extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];

    const options = commerceutil.getItemVariantOptions(first.node);
    if (options.length === 0) {
      first.set(MISSING_NODE);
      return;
    }

    const node = new Node({
      item: first.node.value,
      options,
    });

    const text = executeTemplate(ctx, variantsSelectTemplate, node, false);
    first.set(text);
  }
}

const KEY_PREFIX = 'productAnswerMap';
const KEY_STRONGLY_DISAGREE = KEY_PREFIX + 'StronglyDisagree';
const KEY_DISAGREE = KEY_PREFIX + 'Disagree';
const KEY_NEUTRAL = KEY_PREFIX +  'Neutral';
const KEY_AGREE = KEY_PREFIX + 'Agree';
const KEY_STRONGLY_AGREE = KEY_PREFIX + 'StronglyAgree';


const localizeOrDefault = (strings, key, defaultValue) => {
  const node = strings.get(key);
  return node.type === types.STRING ? node.value : defaultValue;
};

const buildAnswerMap = (strings) => {
  return {
    '-2': localizeOrDefault(strings, KEY_STRONGLY_DISAGREE, 'Strongly Disagree'),
    '-1': localizeOrDefault(strings, KEY_DISAGREE, 'Disagree'),
    '0': localizeOrDefault(strings, KEY_NEUTRAL, 'Neutral'),
    '1': localizeOrDefault(strings, KEY_AGREE, 'Agree'),
    '2': localizeOrDefault(strings, KEY_STRONGLY_AGREE, 'Strongly Agree'),
  };
};

const convertLikert = (values, answerMap) => {
  const result = [];
  const keys = Object.keys(values);
  const defaultValue = answerMap['0'];
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const answerKey = values[key];
    const value = answerMap[answerKey];
    result.push({ question: key, answer: value || defaultValue });
  }
  return new Node(result);
};

const SUMMARY_FORM_FIELD_TEMPLATE_MAP = {
  address: summaryFormFieldAddressTemplate,
  checkbox: summaryFormFieldCheckboxTemplate,
  date: summaryFormFieldDateTemplate,
  likert: summaryFormFieldLikertTemplate,
  name: summaryFormFieldNameTemplate,
  phone: summaryFormFieldPhoneTemplate,
  time: summaryFormFieldTimeTemplate,
};

class SummaryFormFieldFormatter extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const field = first.node;

    const localizedStrings = ctx.resolve(['localizedStrings']);
    const type = field.get('type').asString();
    const code = SUMMARY_FORM_FIELD_TEMPLATE_MAP[type];

    let value = null;
    if (code === undefined) {
      value = field.get('value').asString();
    } else {
      let node = field;
      if (type === 'likert') {
        const answerMap = buildAnswerMap(localizedStrings);
        node = convertLikert(field.get('values').value, answerMap);
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

const TABLE = {
  'add-to-cart-btn': new AddToCartButtonFormatter(),
  'cart-quantity': new CartQuantityFormatter(),
  'cart-subtotal': new CartSubtotalFormatter(),
  'cart-url': new CartUrlFormatter(),
  'from-price': new FromPriceFormatter(),
  'normal-price': new NormalPriceFormatter(),
  'product-checkout': new ProductCheckoutFormatter(),
  'sale-price': new SalePriceFormatter(),
  'summary-form-field': new SummaryFormFieldFormatter(),
  'variant-descriptor': new VariantDescriptorFormatter(),
  'variants-select': new VariantsSelectFormatter(),
};

export default TABLE;
