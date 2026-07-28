import { Context } from '../context';

/**
 * The website's timeZone from the context. A missing zone, or a null one
 * at the fixed level, resolves to the default NY zone. Legacy, a null zone
 * reads as an empty string; Java reads the text "null" there. Neither is a
 * valid zone id, so both fail the zone lookup and fall back to UTC. The
 * two engines render the same output.
 *
 * @param legacyNull  when true (the default), a null zone passes through
 *   as an empty string, the released read. Pass the patch state to switch
 *   on the fixed read, where null behaves like missing.
 */
export const getTimeZone = (ctx: Context, legacyNull: boolean = true): string => {
  const node = ctx.resolve(['website', 'timeZone']);
  if (node.isMissing() || (!legacyNull && node.isNull())) {
    return 'America/New_York';
  }
  return node.asString();
};
