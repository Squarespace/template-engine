import { Context } from '../context';
import { isTruthy } from '../node';

export const useCLDRMode = (ctx: Context) => isTruthy(ctx.resolve(['featureFlags', 'useCLDRMoneyFormat']));
