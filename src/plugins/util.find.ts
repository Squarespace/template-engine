import { Context } from '../context';
import { isTruthy, MISSING_NODE, Node } from '../node';
import { splitVariable } from '../util';
import { Type } from '../types';

/**
 * What find-first and find-last work out from their arguments: the
 * optional lookup, and the optional path walked on each candidate. Mirrors
 * the Java FindUtils.LookupAndPath pair.
 */
export interface LookupAndPath {
  lookup: Node | null;
  path: (string | number)[] | null;
}

/**
 * Split the call's arguments into a lookup and a path. Two args mean the
 * lookup (resolved against the context) plus the path; one arg is the path
 * alone. The lookup is null unless two args are given, so the caller can
 * tell a keyed search from a plain one.
 */
export const getLookupAndPath = (ctx: Context, args: string[]): LookupAndPath => {
  const argsCount = args.length;
  const hasLookup = argsCount === 2;
  const hasPath = argsCount >= 1;
  const lookup = hasLookup ? ctx.resolve(splitVariable(args[0])) : null;
  const path = hasPath ? splitVariable(args[hasLookup ? 1 : 0]) : null;
  return { lookup, path };
};

/**
 * Walk the array and return the nth element that passes the predicates, or
 * a missing node when nothing does. A positive nth scans from the front, a
 * negative nth from the back. With no path every element passes; with a
 * lookup the array holds keys into that lookup, and the element itself
 * comes back.
 */
export const findNthValidEntry = (
  items: Node,
  path: (string | number)[] | null,
  lookup: Node | null,
  nth: number,
): Node => {
  if (items.type !== Type.ARRAY) {
    return MISSING_NODE;
  }

  const forward = nth > 0;
  const start = forward ? 0 : items.value.length - 1;
  const end = forward ? items.value.length : -1;
  const step = forward ? 1 : -1;

  let count = 0;

  for (let i = start; forward ? i < end : i > end; i += step) {
    const node = items.get(i);
    if (path === null) {
      count += step;
      if (count === nth) {
        return node;
      }
    } else {
      // With a lookup the element is a key into it and the candidate is
      // the looked-up value; otherwise the element is the candidate.
      const candidate = lookup !== null ? lookup.path([node.asString()]) : node;
      if (isTruthy(candidate.path(path))) {
        count += step;
        if (count === nth) {
          return node;
        }
      }
    }
  }
  return MISSING_NODE;
};
