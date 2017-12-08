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


class Debug extends Predicate {
  apply(args, ctx) {
    const node = ctx.resolve(['debug'], ctx);
    return isTruthy(node);
  }
}

const equals = (a, b) => a.equals(b);

class Equal extends Predicate {
  apply(args, ctx) {
    return compute(args, ctx, equals);
  }
}

class Even extends Predicate {
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

class GreaterThan extends Predicate {
  apply(args, ctx) {
    return compute(args, ctx, greaterThan);
  }
}

const greaterThanOrEqual = (a, b) => a.compare(b) >= 0;

class GreaterThanOrEqual extends Predicate {
  apply(args, ctx) {
    return compute(args, ctx, greaterThanOrEqual);
  }
}

const lessThan = (a, b) => a.compare(b) < 0;

class LessThan extends Predicate {
  apply(args, ctx) {
    return compute(args, ctx, lessThan);
  }
}

const lessThanOrEqual = (a, b) => a.compare(b) <= 0;

class LessThanOrEqual extends Predicate {
  apply(args, ctx) {
    return compute(args, ctx, lessThanOrEqual);
  }
}

const notEqual = (a, b) => !a.equals(b);

class NotEqual extends Predicate {
  apply(args, ctx) {
    return compute(args, ctx, notEqual);
  }
}


const isInteger = (n) => {
  return typeof n === 'number' && parseInt(n) === n;
};

class Nth extends Predicate {
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

export default {
  'debug?': new Debug(),
  'equal?': new Equal(),
  'even?': new Even(),
  'greaterThan?': new GreaterThan(),
  'greaterThanOrEqual?': new GreaterThanOrEqual(),
  'lessThan?': new LessThan(),
  'lessThanOrEqual?': new LessThanOrEqual(),
  'notEqual?': new NotEqual(),
  'nth?': new Nth(),
};
