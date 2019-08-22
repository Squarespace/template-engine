import { Context } from '../context';
import { Predicate, PredicateTable } from '../plugin';
import { hasVariants, hasVariedPrices, isOnSale, isSoldOut } from './util.commerce';

export class HasVariants extends Predicate {
  apply(args: string[], ctx: Context): boolean {
    return hasVariants(ctx.node());
  }
}

export class OnSale extends Predicate {
  apply(args: string[], ctx: Context): boolean {
    return isOnSale(ctx.node());
  }
}

export class SoldOut extends Predicate {
  apply(args: string[], ctx: Context): boolean {
    return isSoldOut(ctx.node());
  }
}

export class VariedPrices extends Predicate {
  apply(args: string[], ctx: Context): boolean {
    return hasVariedPrices(ctx.node());
  }
}

export const TABLE: PredicateTable = {
  'has-variants?': new HasVariants(),
  'on-sale?': new OnSale(),
  'sold-out?': new SoldOut(),
  'varied-prices?': new VariedPrices(),
};
