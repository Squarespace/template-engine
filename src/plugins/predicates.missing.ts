import { PredicatePlugin, PredicateTable } from '../plugin';
import { Context } from '../context';
import { TemplateError } from '../errors';

const missing = (name: string): TemplateError => ({ type: 'engine', message: `"${name}" formatter is not yet implemented` });

export class MissingPredicate extends PredicatePlugin {
  private error: TemplateError;
  constructor(name: string) {
    super();
    this.error = missing(name);
  }

  apply(args: string[], ctx: Context): boolean {
    ctx.error(this.error);
    return false;
  }
}

const NAMES = ['units-metric?'];

export const MISSING_PREDICATES: PredicateTable = NAMES.reduce((table, name) => {
  table[name] = new MissingPredicate(name);
  return table;
}, {} as PredicateTable);
