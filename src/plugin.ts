import { Context } from './context';
import { CompatLevel } from './compat/compat-level';
import { Variable } from './variable';

export abstract class Formatter {
  /**
   * Whether a call with no arguments is a parse error. Mirrors the second
   * boolean of each Java BaseFormatter constructor.
   */
  readonly requiresArgs: boolean;

  constructor(requiresArgs: boolean = false) {
    this.requiresArgs = requiresArgs;
  }

  /**
   * Validate the call's arguments during parsing. An invalid set is
   * signaled by throwing an Error whose message is the invalid-args error
   * text. The default accepts anything, mirroring the Java Plugin NOOP.
   * The runtime keeps re-deriving values from the raw arguments, so this
   * only produces the parse-time error set.
   */
  validateArgs(args: string[]): void {
    // NOOP
  }

  abstract apply(args: string[], vars: Variable[], ctx: Context): void;
}

export type FormatterTable = {
  [x: string]: Formatter;
};

export abstract class PredicatePlugin {
  /**
   * Whether a call with no arguments is a parse error. Mirrors the second
   * boolean of each Java BasePredicate / JsonPredicate constructor.
   */
  readonly requiresArgs: boolean;

  constructor(requiresArgs: boolean = false) {
    this.requiresArgs = requiresArgs;
  }

  /**
   * Validate the call's arguments during parsing, at the released compat
   * behavior. An invalid set throws an Error whose message is the
   * invalid-args error text. The default accepts anything.
   */
  validateArgs(args: string[]): void {
    // NOOP
  }

  /**
   * Compatibility-aware validation. The default runs the released
   * validation; a gated fix overrides this and switches on the level,
   * mirroring the Java Predicate.validateArgs(Arguments, CompatLevel)
   * default method.
   */
  validateArgsCompat(args: string[], compat: CompatLevel): void {
    this.validateArgs(args);
  }

  abstract apply(args: String[], ctx: Context): boolean;
}

export type PredicateTable = {
  [x: string]: PredicatePlugin;
};

export type FormatterMap = { [name: string]: Formatter };
export type PredicateMap = { [name: string]: PredicatePlugin };
