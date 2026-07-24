import { Context } from '../context';
import { Patch } from '../compat/patch';
import { PredicatePlugin, PredicateTable } from '../plugin';
import { hasVariants, hasVariedPrices, isOnSale, isSoldOut } from './util.commerce';

export class HasVariants extends PredicatePlugin {
  apply(args: string[], ctx: Context): boolean {
    return hasVariants(ctx.node());
  }
}

export class OnSale extends PredicatePlugin {
  apply(args: string[], ctx: Context): boolean {
    return isOnSale(ctx.node());
  }
}

export class SoldOut extends PredicatePlugin {
  apply(args: string[], ctx: Context): boolean {
    return isSoldOut(ctx.node());
  }
}

export class VariedPrices extends PredicatePlugin {
  apply(args: string[], ctx: Context): boolean {
    return hasVariedPrices(ctx.node(), ctx.compatEnabled(Patch.VARIED_PRICES_NON_ARRAY));
  }
}

export const COMMERCE_PREDICATES: PredicateTable = {
  'has-variants?': new HasVariants(),
  'on-sale?': new OnSale(),
  'sold-out?': new SoldOut(),
  'varied-prices?': new VariedPrices(),
};
