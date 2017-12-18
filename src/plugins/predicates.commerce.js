import { Predicate } from '../plugin';
import * as commerceutil from './util.commerce';


class HasVariants extends Predicate {
  apply(args, ctx) {
    return commerceutil.hasVariants(ctx.node());
  }
}

class OnSale extends Predicate {
  apply(args, ctx) {
    return commerceutil.isOnSale(ctx.node());
  }
}

class SoldOut extends Predicate {
  apply(args, ctx) {
    return commerceutil.isSoldOut(ctx.node());
  }
}

class VariedPrices extends Predicate {
  apply(args, ctx) {
    return commerceutil.hasVariedPrices(ctx.node());
  }
}

export default {
  'has-variants?': new HasVariants(),
  'on-sale?': new OnSale(),
  'sold-out?': new SoldOut(),
  'varied-prices?': new VariedPrices(),
};
