import { Context } from '../context';
/**
 * Retrieves the Website's timeZone from the context, falling
 * back to the default NY.
 */
export const getTimeZone = (ctx: Context) => {
  const node = ctx.resolve(['website', 'timeZone']);
  return node.isMissing() ? 'America/New_York' : node.asString();
};
