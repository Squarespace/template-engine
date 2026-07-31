import { PredicatePlugin, PredicateTable } from '../plugin';
import { Context } from '../context';

/**
 * Deprecated stub kept only for backward compatibility. It returns true
 * for any input and locale. It must stay registered, because customer
 * templates may still call {"units-metric?"}, and removing it would
 * fail their compile.
 */
export class UnitsMetricPredicate extends PredicatePlugin {
  apply(args: string[], ctx: Context): boolean {
    return true;
  }
}

export const MISSING_PREDICATES: PredicateTable = {
  'units-metric?': new UnitsMetricPredicate(),
};
