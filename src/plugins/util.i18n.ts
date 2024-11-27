import { Decimal } from '@phensley/cldr-core';
import { Context } from '../context';
import { isTruthy } from '../node';

export const parseDecimal = (s: string | number): Decimal | undefined => {
  try {
    return new Decimal(s);
  } catch (e) {
    return undefined;
  }
};

export const useCLDRMode = (ctx: Context) => isTruthy(ctx.resolve(['featureFlags', 'useCLDRMoneyFormat']));
