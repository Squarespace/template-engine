/**
 * Legacy, the wide match also takes 4 and 5 char hex, which decode to a
 * color and report a weight through the dark threshold.
 */
const VALID_COLOR_LEGACY = /^[abcdef0-9]{3,6}$/i;

/**
 * Fixed, only 3 and 6 char hex are exact colors. The anchors pin the whole
 * string, so any other length fails.
 */
const VALID_COLOR = /^([abcdef0-9]{3}|[abcdef0-9]{6})$/i;

/**
 * Decode a hex color to its int value, or -1 when it is not a color.
 *
 * The legacy flag has the same polarity as Context.compatEnabled: true uses
 * the released {3,6} match, false applies the COLOR_WEIGHT_LENGTH fix where
 * only 3 and 6 char hex parse.
 */
export const hexColorToInt = (hex: string, legacy = true): number => {
  if (hex[0] === '#') {
    hex = hex.slice(1);
  }
  const valid = legacy ? VALID_COLOR_LEGACY : VALID_COLOR;
  if (valid.test(hex)) {
    if (hex.length === 3) {
      return parseInt(hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2], 16);
    }
    return parseInt(hex, 16);
  }
  return -1;
};
