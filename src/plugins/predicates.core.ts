import { Context } from '../context';
import { isTruthy, Node } from '../node';
import { PredicatePlugin, PredicateTable } from '../plugin';
import { isJsonStart, splitVariable } from '../util';
import { Type } from '../types';

/**
 * Examines each argument to determine if it is a valid, bare JSON value
 * or a variable reference. It attempts to parse the JSON values, and falls
 * through to resolving the variable references.
 */
const resolve = (args: string[], ctx: Context): Node[] => {
  return args.map(arg => {
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
const compute = (args: string[], ctx: Context, f: (a: Node, b: Node) => boolean) => {
  const len = args.length;
  if (len === 0) {
    return false;
  }
  const nodes = resolve(args, ctx);
  return len === 1 ? f(ctx.node(), nodes[0]) : f(nodes[0], nodes[1]);
};

export class DebugPredicate extends PredicatePlugin {
  apply(args: string[], ctx: Context): boolean {
    const node = ctx.resolve(['debug']);
    return isTruthy(node);
  }
}

const equals = (a: Node, b: Node) => a.equals(b);

export class EqualPredicate extends PredicatePlugin {
  apply(args: string[], ctx: Context): boolean {
    return compute(args, ctx, equals);
  }
}

export class EvenPredicate extends PredicatePlugin {
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

const greaterThan = (a: Node, b: Node) => a.compare(b) > 0;

export class GreaterThanPredicate extends PredicatePlugin {
  apply(args: string[], ctx: Context): boolean {
    return compute(args, ctx, greaterThan);
  }
}

const greaterThanOrEqual = (a: Node, b: Node) => a.compare(b) >= 0;

export class GreaterThanOrEqualPredicate extends PredicatePlugin {
  apply(args: string[], ctx: Context): boolean {
    return compute(args, ctx, greaterThanOrEqual);
  }
}

const lessThan = (a: Node, b: Node) => a.compare(b) < 0;

export class LessThanPredicate extends PredicatePlugin {
  apply(args: string[], ctx: Context): boolean {
    return compute(args, ctx, lessThan);
  }
}

const lessThanOrEqual = (a: Node, b: Node) => a.compare(b) <= 0;

export class LessThanOrEqualPredicate extends PredicatePlugin {
  apply(args: string[], ctx: Context): boolean {
    return compute(args, ctx, lessThanOrEqual);
  }
}

const notEqual = (a: Node, b: Node) => !a.equals(b);

export class NotEqualPredicate extends PredicatePlugin {
  apply(args: string[], ctx: Context): boolean {
    return compute(args, ctx, notEqual);
  }
}

const isInteger = (n: number) => typeof n === 'number' && Math.floor(n) === n;

export class NthPredicate extends PredicatePlugin {
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
    if (!isInteger(n) || !isInteger(m) || m === 0) {
      return false;
    }

    return Math.abs(n) % Math.abs(m) === 0;
  }
}

export class OddPredicate extends PredicatePlugin {
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
