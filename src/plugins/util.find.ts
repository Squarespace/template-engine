import { Context } from "../context";
import { MISSING_NODE, Node, isTruthy, toNode } from "../node";
import { splitVariable } from "../util";

export const getLookupAndPath = (ctx: Context, args: string[]) => {
  const argsCount = args.length;
  const hasLookup = argsCount === 2;
  const hasPath = argsCount >= 1;
  const lookup = hasLookup ? ctx.resolve(splitVariable(args[0])) : null;
  const path = hasPath ? splitVariable(args[hasLookup ? 1 : 0]) : null;
  return { lookup, path };
};

export const findNthValidEntry = (
  items: any[],
  path: (string | number)[] | null,
  lookup: Record<string, any> | null,
  n: number,
): Node => {
  if (!Array.isArray(items) || items.length === 0) {
    return MISSING_NODE;
  }
  let validEntries = [];
  const hasPath = path !== null;
  if (hasPath) {
    for (const element of items) {
      const node = toNode(element);
      const lookupNode = lookup ? toNode(lookup).get(node.asString()) : node;
      const candidate = lookupNode.path(path);
      if (isTruthy(candidate)) {
        validEntries.push(element);
      }
    }
  } else {
    validEntries = items;
  }
  const size = validEntries.length;
  if (size == 0) {
    return MISSING_NODE;
  }
  const index = n < 0 ? size + n : n;
  if (index < 0 || index >= size) {
    return MISSING_NODE;
  }
  return toNode(validEntries[index]);
};
