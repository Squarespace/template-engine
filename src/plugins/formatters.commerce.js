import { Formatter } from '../plugin';
import { executeTemplate } from '../util';
import * as commerceutil from './util.commerce';
import types from '../types';

// Template imports
import addToCartBtnTemplate from './templates/add-to-cart-btn.json';
import productCheckoutTemplate from './templates/product-checkout.json';
import variantsSelectTemplate from './templates/variants-select.json';


class AddToCartButtonFormatter extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const text = executeTemplate(ctx, addToCartBtnTemplate, first.node, false);
    first.set(text);
  }
}

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
// TODO: bookkeeper-money-format
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

// TODO: variant-descriptor

class VariantsSelectFormatter extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const node = first.node;
    // TODO: finish variants-select
  }
}

// TODO: SummaryFormField class


export default {
  'add-to-cart-btn': new AddToCartButtonFormatter(),
  'cart-quantity': new CartQuantityFormatter(),
  'cart-subtotal': new CartSubtotalFormatter(),
  'cart-url': new CartUrlFormatter(),
  'from-price': new FromPriceFormatter(),

  'normal-price': new NormalPriceFormatter(),
  'product-checkout': new ProductCheckoutFormatter(),

  'sale-price': new SalePriceFormatter(),

  'variants-select': new VariantsSelectFormatter(),
};
