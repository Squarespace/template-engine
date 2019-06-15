import { Context } from '../context';
import { Predicate, PredicateTable } from '../plugin';
import { hasVariants, isOnSale, isSoldOut, hasVariedPrices } from './util.commerce';


export class HasVariants extends Predicate {
  apply(args: string[], ctx: Context) {
    return hasVariants(ctx.node());
  }
}

export class OnSale extends Predicate {
  apply(args: string[], ctx: Context) {
    return isOnSale(ctx.node());
  }
}

export class SoldOut extends Predicate {
  apply(args: string[], ctx: Context) {
    return isSoldOut(ctx.node());
  }
}

export class VariedPrices extends Predicate {
  apply(args: string[], ctx: Context) {
    return hasVariedPrices(ctx.node());
  }
}

export const TABLE: PredicateTable = {
  'has-variants?': new HasVariants(),
  'on-sale?': new OnSale(),
  'sold-out?': new SoldOut(),
  'varied-prices?': new VariedPrices(),
};
