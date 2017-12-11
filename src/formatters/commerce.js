import { Formatter } from '../plugin';
import { executeTemplate } from '../util';

import addToCartBtn from './templates/add-to-cart-btn.json';

class AddToCartButton extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const text = executeTemplate(ctx, addToCartBtn, first.node, false);
    first.set(text);
  }
}

export default {
  'add-to-cart-btn': new AddToCartButton(),
};
