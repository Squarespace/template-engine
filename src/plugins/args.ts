/**
 * Ports of the Java Arguments.java assertions and the integer parsing the
 * plugins do in their validateArgs methods. Each throws a plain Error
 * whose message is the exact Java ArgumentsException / NumberFormatException
 * text, which the parser records as the plugin's invalid-args error.
 */

/**
 * Asserts the count is between min and max, inclusive. Mirrors
 * Arguments.between.
 */
export const between = (count: number, min: number, max: number): void => {
  if (count < min) {
    throw new Error(`Not enough args. At least ${min} expected`);
  }
  if (count > max) {
    throw new Error(`Too many args. Takes between ${min} and ${max}`);
  }
};

/**
 * Asserts the count is exactly num. Mirrors Arguments.exactly.
 */
export const exactly = (count: number, num: number): void => {
  if (count !== num) {
    throw new Error(`Wrong number of args, exactly ${num} expected`);
  }
};

/**
 * Asserts the count is at most num. Mirrors Arguments.atMost.
 */
export const atMost = (count: number, num: number): void => between(count, 0, num);

/**
 * Asserts the count is at least num. Mirrors Arguments.atLeast.
 */
export const atLeast = (count: number, num: number): void => between(count, num, Number.MAX_SAFE_INTEGER);

const INT32 = /^[+-]?[0-9]+$/;

/**
 * Parses the whole string as a 32-bit signed integer, matching Java
 * Integer.parseInt: an optional sign, digits only, and the value must fall
 * in the int range. Returns null when Java would throw
 * NumberFormatException.
 */
export const parseInt32 = (s: string): number | null => {
  if (!INT32.test(s)) {
    return null;
  }
  const n = Number(s);
  return n >= -2147483648 && n <= 2147483647 ? n : null;
};
