import { Predicate } from '../plugin';
import Node from '../node';
import { isJsonStart, isTruthy, splitVariable } from '../util';
import types from '../types';

/**
 * Examines each argument to determine if it is a valid, bare JSON value
 * or a variable reference. It attempts to parse the JSON values, and falls
 * through to resolving the variable references.
 */
const resolve = (args, ctx) => {
  return args.map(arg => {
    if (typeof arg === 'string' && isJsonStart(arg)) {
      try {
        const value = JSON.parse(arg);
        return new Node(value);
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
const compute = (args, ctx, f) => {
  const len = args.length;
  if (len === 0) {
    return false;
  }
  const nodes = resolve(args, ctx);
  return len === 1 ? f(ctx.node(), nodes[0]) : f(nodes[0], nodes[1]);
};

class DebugPredicate extends Predicate {
  apply(args, ctx) {
    const node = ctx.resolve(['debug'], ctx);
    return isTruthy(node);
  }
}

const equals = (a, b) => a.equals(b);

class EqualPredicate extends Predicate {
  apply(args, ctx) {
    return compute(args, ctx, equals);
  }
}

class EvenPredicate extends Predicate {
  apply(args, ctx) {
    let node = ctx.node();
    if (args.length >= 1) {
      const names = splitVariable(args[0]);
      node = ctx.resolve(names);
    }
    if (node.type === types.NUMBER) {
      return node.value % 2 === 0;
    }
    return false;
  }
}

const greaterThan = (a, b) => a.compare(b) > 0;

class GreaterThanPredicate extends Predicate {
  apply(args, ctx) {
    return compute(args, ctx, greaterThan);
  }
}

const greaterThanOrEqual = (a, b) => a.compare(b) >= 0;

class GreaterThanOrEqualPredicate extends Predicate {
  apply(args, ctx) {
    return compute(args, ctx, greaterThanOrEqual);
  }
}

const lessThan = (a, b) => a.compare(b) < 0;

class LessThanPredicate extends Predicate {
  apply(args, ctx) {
    return compute(args, ctx, lessThan);
  }
}

const lessThanOrEqual = (a, b) => a.compare(b) <= 0;

class LessThanOrEqualPredicate extends Predicate {
  apply(args, ctx) {
    return compute(args, ctx, lessThanOrEqual);
  }
}

const notEqual = (a, b) => !a.equals(b);

class NotEqualPredicate extends Predicate {
  apply(args, ctx) {
    return compute(args, ctx, notEqual);
  }
}

const isInteger = (n) => {
  return typeof n === 'number' && parseInt(n) === n;
};

class NthPredicate extends Predicate {
  apply(args, ctx) {
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

    return n % m === 0;
  }
}

class OddPredicate extends Predicate {
  apply(args, ctx) {
    let node = ctx.node();
    if (args.length >= 1) {
      const names = splitVariable(args[0]);
      node = ctx.resolve(names);
    }
    if (node.type === types.NUMBER) {
      return node.value % 2 !== 1;
    }
    return false;
  }
}

class PluralPredicate extends Predicate {
  apply(args, ctx) {
    return ctx.node().asNumber() > 1;
  }
}

class SingularPredicate extends Predicate {
  apply(args, ctx) {
    return ctx.node().asNumber() === 1;
  }
}

export default {
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
