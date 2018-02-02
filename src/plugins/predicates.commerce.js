import { Predicate } from '../plugin';
import * as commerceutil from './util.commerce';


export class HasVariants extends Predicate {
  apply(args, ctx) {
    return commerceutil.hasVariants(ctx.node());
  }
}

export class OnSale extends Predicate {
  apply(args, ctx) {
    return commerceutil.isOnSale(ctx.node());
  }
}

export class SoldOut extends Predicate {
  apply(args, ctx) {
    return commerceutil.isSoldOut(ctx.node());
  }
}

export class VariedPrices extends Predicate {
  apply(args, ctx) {
    return commerceutil.hasVariedPrices(ctx.node());
  }
}

export const TABLE = {
  'has-variants?': new HasVariants(),
  'on-sale?': new OnSale(),
  'sold-out?': new SoldOut(),
  'varied-prices?': new VariedPrices(),
};
