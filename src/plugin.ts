import { Context } from './context';
import { Variable } from './variable';

export abstract class Formatter {
  // TODO: add validateArgs() when parser is implemented

  abstract apply(args: string[], vars: Variable[], ctx: Context): void;
}

export type FormatterTable = {
  [x: string]: Formatter;
};

export abstract class PredicatePlugin {
  // TODO: add validateArgs() when parser is implemented

  abstract apply(args: String[], ctx: Context): boolean;
}

export type PredicateTable = {
  [x: string]: PredicatePlugin;
};

export type FormatterMap = { [name: string]: Formatter };
export type PredicateMap = { [name: string]: PredicatePlugin };
