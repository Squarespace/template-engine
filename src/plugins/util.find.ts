import { Context } from '../context';
import { MISSING_NODE, Node, isTruthy, toNode } from '../node';
import { splitVariable } from '../util';

export const getLookupAndPath = (ctx: Context, args: string[]) => {
  const argsCount = args.length;
  const hasLookup = argsCount === 2;
  const hasPath = argsCount >= 1;
  const lookup = hasLookup ? ctx.resolve(splitVariable(args[0])) : null;
  const path = hasPath ? splitVariable(args[hasLookup ? 1 : 0]) : null;
  return { lookup, path };
};

export const findNthValidEntry = (items: Node, path: (string | number)[] | null, lookup: Node | null, nth: number): Node => {
  if (!Array.isArray(items) || items.length === 0) {
    return MISSING_NODE;
  }
  const forward = nth > 0;
  const start = forward ? 0 : items.length - 1;
  const end = forward ? items.length : -1;
  const step = forward ? 1 : -1;

  let count = 0;
  const hasLookup = lookup != null;
  const hasPath = path != null;

  for (let i = start; forward ? i < end : i > end; i += step) {
    const node = toNode(items[i]);
    if (!hasPath) {
      count += step;
      if (count == nth) {
        return node;
      }
    } else {
      const candidate = hasLookup ? lookup.path([node.asString()]) : node;
      if (isTruthy(candidate.path(path))) {
        count += step;
        if (count == nth) {
          return node;
        }
      }
    }
  }
  return MISSING_NODE;
};
