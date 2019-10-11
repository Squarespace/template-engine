import { Context } from '../context';
import { Predicate, PredicateTable } from '../plugin';
import { SliceType } from './enums';

// TODO: current-type?  should be generalized.

export class CurrentTypePredicate extends Predicate {

  apply(args: string[], ctx: Context): boolean {
    const expected = ctx.node().get('currentType').asNumber() | 0;
    const type = SliceType.fromName(args[0]);
    return (type && type.code === expected) || false;
  }
}

export const SLIDE_PREDICATES: PredicateTable = {
  'current-type?': new CurrentTypePredicate()
};
