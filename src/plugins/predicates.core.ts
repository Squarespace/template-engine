import { Context } from '../context';
import { isTruthy, Node } from '../node';
import { PredicatePlugin, PredicateTable } from '../plugin';
import { atMost, between } from './args';
import { variableReference } from '../patterns';
import { isJsonStart, splitVariable } from '../util';
import { Type } from '../types';
import { Patch } from '../compat/patch';

// Anchored copy of the variable-reference pattern, mirroring the Java
// Patterns.VARIABLE_REF_DOTTED recognizer: segments of digits, an optional
// @ or $ prefix plus a word, or a bare @, separated by dots.
const VARIABLE_REF = new RegExp(`^(?:${variableReference})$`);

/**
 * Examines each argument to determine if it is a valid, bare JSON value
 * or a variable reference. It attempts to parse the JSON values, and falls
 * through to resolving the variable references.
 */
const resolve = (args: string[], ctx: Context): Node[] => {
  return args.map((arg) => {
    if (isJsonStart(arg)) {
      try {
        const value = JSON.parse(arg);
        return ctx.newNode(value);
      } catch (e) {
        // Fall through..
      }
    }
    const names = splitVariable(arg);
    return ctx.resolve(names);
  });
};

/**
 * Resolves the arguments and then computes the predicate function.
 */
const compute = (args: string[], ctx: Context, f: (a: Node, b: Node, ctx: Context) => boolean) => {
  const len = args.length;
  if (len === 0) {
    return false;
  }
  const nodes = resolve(args, ctx);
  return len === 1 ? f(ctx.node(), nodes[0], ctx) : f(nodes[0], nodes[1], ctx);
};

/**
 * Base class for predicates whose arguments are bare JSON values or
 * variable references, mirroring the Java JsonPredicate. The arity rule
 * and the per-argument JSON-or-reference check both run at parse time; the
 * runtime still re-derives each value from the raw argument, so validation
 * only produces the error set.
 */
abstract class JsonPredicate extends PredicatePlugin {
  constructor(requiresArgs = true) {
    super(requiresArgs);
  }

  /**
   * Enforce the argument count. Mirrors Java JsonPredicate.limitArgs.
   */
  abstract limitArgs(count: number): void;

  validateArgs(args: string[]): void {
    this.limitArgs(args.length);
    for (const arg of args) {
      this.parseArg(arg);
    }
  }

  private parseArg(arg: string): void {
    if (isJsonStart(arg)) {
      try {
        JSON.parse(arg);
        return;
      } catch (e) {
        // Not JSON, fall through to the reference check.
      }
    }
    if (VARIABLE_REF.test(arg)) {
      return;
    }
    throw new Error(`Argument ${arg} must be a valid JSON value or variable reference.`);
  }
}

export class DebugPredicate extends PredicatePlugin {
  apply(args: string[], ctx: Context): boolean {
    const node = ctx.resolve(['debug']);
    return isTruthy(node);
  }
}

const equals = (a: Node, b: Node, ctx: Context) => a.equals(b);

export class EqualPredicate extends JsonPredicate {
  limitArgs(count: number): void {
    between(count, 1, 2);
  }
  apply(args: string[], ctx: Context): boolean {
    return compute(args, ctx, equals);
  }
}

export class EvenPredicate extends JsonPredicate {
  constructor() {
    super(false);
  }
  limitArgs(count: number): void {
    atMost(count, 1);
  }
  apply(args: string[], ctx: Context): boolean {
    let node = ctx.node();
    if (args.length >= 1) {
      const names = splitVariable(args[0]);
      node = ctx.resolve(names);
    }
    if (node.type === Type.NUMBER) {
      return Math.abs(node.value) % 2 === 0;
    }
    return false;
  }
}

const compare = (a: Node, b: Node, ctx: Context) => a.compare(b, ctx.compatEnabled(Patch.COMPARE_TOTAL_ORDER));

const greaterThan = (a: Node, b: Node, ctx: Context) => compare(a, b, ctx) > 0;

export class GreaterThanPredicate extends JsonPredicate {
  limitArgs(count: number): void {
    between(count, 1, 2);
  }
  apply(args: string[], ctx: Context): boolean {
    return compute(args, ctx, greaterThan);
  }
}

const greaterThanOrEqual = (a: Node, b: Node, ctx: Context) => compare(a, b, ctx) >= 0;

export class GreaterThanOrEqualPredicate extends JsonPredicate {
  limitArgs(count: number): void {
    between(count, 1, 2);
  }
  apply(args: string[], ctx: Context): boolean {
    return compute(args, ctx, greaterThanOrEqual);
  }
}

const lessThan = (a: Node, b: Node, ctx: Context) => compare(a, b, ctx) < 0;

export class LessThanPredicate extends JsonPredicate {
  limitArgs(count: number): void {
    between(count, 1, 2);
  }
  apply(args: string[], ctx: Context): boolean {
    return compute(args, ctx, lessThan);
  }
}

const lessThanOrEqual = (a: Node, b: Node, ctx: Context) => compare(a, b, ctx) <= 0;

export class LessThanOrEqualPredicate extends JsonPredicate {
  limitArgs(count: number): void {
    between(count, 1, 2);
  }
  apply(args: string[], ctx: Context): boolean {
    return compute(args, ctx, lessThanOrEqual);
  }
}

const notEqual = (a: Node, b: Node, ctx: Context) => !a.equals(b);

export class NotEqualPredicate extends JsonPredicate {
  limitArgs(count: number): void {
    between(count, 1, 2);
  }
  apply(args: string[], ctx: Context): boolean {
    return compute(args, ctx, notEqual);
  }
}

const isInteger = (n: number) => typeof n === 'number' && Math.floor(n) === n;

export class NthPredicate extends JsonPredicate {
  constructor() {
    super(false);
  }
  limitArgs(count: number): void {
    between(count, 1, 2);
  }
  apply(args: string[], ctx: Context): boolean {
    const len = args.length;
    if (len === 0) {
      return false;
    }

    const nodes = resolve(args, ctx);
    let node = ctx.node();
    let modulus = nodes[0];
    if (len === 2) {
      node = modulus;
      modulus = nodes[1];
    }

    // Only integers..
    const n = node.value;
    const m = modulus.value;
    if (!isInteger(n) || !isInteger(m)) {
      return false;
    }
    if (m === 0) {
      // Legacy, a zero modulus reaches the division and throws by zero.
      if (ctx.compatEnabled(Patch.NTH_MODULO_ZERO)) {
        throw Object.assign(new Error('/ by zero'), { name: 'ArithmeticException' });
      }
      // Fixed, a zero modulus is not a match.
      return false;
    }

    return Math.abs(n) % Math.abs(m) === 0;
  }
}

export class OddPredicate extends JsonPredicate {
  constructor() {
    super(false);
  }
  limitArgs(count: number): void {
    atMost(count, 1);
  }
  apply(args: string[], ctx: Context): boolean {
    let node = ctx.node();
    if (args.length >= 1) {
      const names = splitVariable(args[0]);
      node = ctx.resolve(names);
    }
    if (node.type === Type.NUMBER) {
      return Math.abs(node.value) % 2 === 1;
    }
    return false;
  }
}

export class PluralPredicate extends PredicatePlugin {
  apply(args: string[], ctx: Context): boolean {
    return ctx.node().asNumber() > 1;
  }
}

export class SingularPredicate extends PredicatePlugin {
  apply(args: string[], ctx: Context): boolean {
    return ctx.node().asNumber() === 1;
  }
}

export const CORE_PREDICATES: PredicateTable = {
  'debug?': new DebugPredicate(),
  'equal?': new EqualPredicate(),
  'even?': new EvenPredicate(),
  'greaterThan?': new GreaterThanPredicate(),
  'greaterThanOrEqual?': new GreaterThanOrEqualPredicate(),
  'lessThan?': new LessThanPredicate(),
  'lessThanOrEqual?': new LessThanOrEqualPredicate(),
  'notEqual?': new NotEqualPredicate(),
  'nth?': new NthPredicate(),
  'odd?': new OddPredicate(),
  'plural?': new PluralPredicate(),
  'singular?': new SingularPredicate(),
};
