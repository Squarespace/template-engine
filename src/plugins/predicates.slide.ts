import { Context } from '../context';
import { PredicatePlugin, PredicateTable } from '../plugin';
import { Patch } from '../compat/patch';
import { SliceType } from './enums';

// TODO: current-type?  should be generalized.

export class CurrentTypePredicate extends PredicatePlugin {
  apply(args: string[], ctx: Context): boolean {
    // Legacy, no arguments falls through to args[0] and throws at render
    // time. Fixed, it evaluates false, so the .or branch renders.
    if (args.length === 0 && ctx.compatEnabled(Patch.CURRENT_TYPE_ARITY)) {
      throw Object.assign(new Error('Index: 0, Size: 0'), {
        name: 'IndexOutOfBoundsException',
      });
    }
    const expected = ctx.node().get('currentType').asNumber() | 0;
    const type = SliceType.fromName(args[0]);
    return (type && type.code === expected) || false;
  }
}

export const SLIDE_PREDICATES: PredicateTable = {
  'current-type?': new CurrentTypePredicate(),
};
