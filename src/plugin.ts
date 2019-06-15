import { Context } from './context';
import { Variable } from './variable';

export class Formatter {

  // TODO: add validateArgs() when parser is implemented

  apply(args: string[], vars: Variable[], ctx: Context) {
  }
}

export type FormatterTable = {
  [x: string]: Formatter;
}

export class Predicate {

  // TODO: add validateArgs() when parser is implemented

  apply(args: String[], ctx: Context): boolean {
    return false;
  }

}

export type PredicateTable = {
  [x: string]: Predicate;
}
