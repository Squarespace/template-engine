import { of, Type } from './types';
import { deepEquals, replaceMappedChars, stringCompare } from './util';

// Forward declaration
let MISSING_NODE: Node;

/**
 * Wrapper for a typed value with some utility methods.
 */
class Node {
  readonly type: Type;
  readonly value: any;

  /**
   * The exact decimal digits of an integral number, set by the eval render
   * path at the fixed level. The value stays a double so comparisons and
   * arithmetic treat the node normally; only the rendered text changes.
   */
  readonly exactDigits?: string;

  constructor(value: any, type?: Type, exactDigits?: string) {
    this.value = value;
    this.type = type !== undefined ? type : of(value);
    this.exactDigits = exactDigits;
  }

  isNull(): boolean {
    return this.type === Type.NULL;
  }

  isMissing(): boolean {
    return this.type === Type.MISSING;
  }

  equals(other: any): boolean {
    const value = other instanceof Node ? other.value : other;
    return deepEquals(this.value, value);
  }

  compare(other: any, legacyOrder: boolean = true): number {
    const node = other instanceof Node ? other : new Node(other);
    return legacyOrder ? legacyCompare(this, node) : fixedCompare(this, node);
  }

  /**
   * Returns the number of properties in an object, or number of elements in
   * an array. All other types return 0.
   */
  size(): number {
    switch (this.type) {
      case Type.OBJECT:
        return Object.keys(this.value).length;
      case Type.ARRAY:
        return this.value.length;
      default:
        return 0;
    }
  }

  /**
   * This converts a value to a boolean using the Jackson JSON rules.
   * For example, string "true" is true, all other string values are false.
   */
  asBoolean(): boolean {
    switch (this.type) {
      case Type.BOOLEAN:
        return this.value;
      case Type.STRING:
        return this.value === 'true' ? true : false;
      case Type.NUMBER: {
        // Only non-zero integers are true, floats are false.
        const value = this.value;
        return parseInt(value, 10) === value ? value !== 0 : false;
      }
      default:
        return false;
    }
  }

  /**
   * Return the node's value as a string.
   */
  asString(): string {
    if (this.exactDigits !== undefined) {
      return this.exactDigits;
    }
    switch (this.type) {
      case Type.STRING:
        return this.value;

      case Type.NULL:
      case Type.MISSING:
        return '';

      case Type.NUMBER:
      case Type.BOOLEAN:
        return String(this.value);

      default:
        return '';
    }
  }

  /**
   * Return the node's value as a number, converting where needed.
   */
  asNumber(): number {
    switch (this.type) {
      case Type.NUMBER:
        return this.value;
      case Type.STRING:
        if (this.value.indexOf('.') !== -1) {
          return parseFloat(this.value);
        }
        return parseInt(this.value, 10);
      case Type.BOOLEAN:
        return this.value ? 1 : 0;
      default:
        return 0;
    }
  }

  /**
   * Replace characters in the string with those in the mapping.
   */
  replace(mapping: any): string {
    return replaceMappedChars(this.asString(), mapping);
  }

  // newNode(value: any, type: Type): Node {
  //   return new Node(value, type);
  // }

  path(path: (string | number)[]): Node {
    if (path.length === 0) {
      return this;
    }
    let value = this.value;
    let type = this.type;
    for (let i = 0, len = path.length; i < len; i++) {
      const name = path[i];

      // Ensure that when a JS object is dereferenced by the current name,
      // that all inherited properties / methods are hidden.
      if ((type === Type.OBJECT && value.hasOwnProperty(name)) || (type === Type.ARRAY && typeof name === 'number')) {
        value = value[name];
      } else {
        return MISSING_NODE;
      }

      type = of(value);
    }
    return type === Type.MISSING ? MISSING_NODE : new Node(value, type);
  }

  get(key: string | number): Node {
    if (this.type === Type.ARRAY || this.type === Type.OBJECT) {
      const value = this.value[key];
      const type = of(value);
      if (type !== Type.MISSING) {
        return new Node(value, type);
      }
    }
    return MISSING_NODE;
  }
}

/**
 * The released order, kept as the default for the two-arg compare. It keys
 * off the left operand's type and coerces the right operand to match, so a
 * mixed pair can disagree with its own reversal and the result is not a
 * total order. This is the level 0 surface in Java, gated on the
 * COMPARE_TOTAL_ORDER patch.
 */
const legacyCompare = (left: Node, right: Node): number => {
  switch (left.type) {
    case Type.NUMBER:
      return Number.isInteger(left.value)
        ? longCompare(left.value, asLong(right))
        : doubleCompare(left.value, asDouble(right));

    case Type.STRING:
      return stringCompare(left.value, asText(right));

    case Type.BOOLEAN:
      return booleanCompare(left.value, asBoolean(right));

    default:
      return deepEquals(left.value, right.value) ? 0 : -1;
  }
};

/**
 * The total order behind COMPARE_TOTAL_ORDER. Numbers compare by value,
 * text and booleans inside their own type, and mixed types by a fixed rank
 * where missing and null are the smallest and composites the largest. NaN
 * sorts before every finite number and equals NaN.
 */
const fixedCompare = (left: Node, right: Node): number => {
  if (left.type === Type.NUMBER && right.type === Type.NUMBER) {
    return fixedNumberCompare(left.value, right.value);
  }
  if (left.type === Type.STRING && right.type === Type.STRING) {
    return stringCompare(left.value, right.value);
  }
  if (left.type === Type.BOOLEAN && right.type === Type.BOOLEAN) {
    return booleanCompare(left.value, right.value);
  }
  const leftRank = typeRank(left.type);
  const rightRank = typeRank(right.type);
  if (leftRank !== rightRank) {
    return leftRank < rightRank ? -1 : 1;
  }
  if (leftRank === 0) {
    // Missing and null both mean "nothing" and compare equal.
    return 0;
  }
  // Same rank otherwise: composites have no natural order, so equality is
  // all that is left. Scalar pairs never reach here.
  return deepEquals(left.value, right.value) ? 0 : -1;
};

const longCompare = (a: number, b: number): number => (a < b ? -1 : a === b ? 0 : 1);

/**
 * Compare two doubles with Double.compare semantics: NaN is greater than
 * every finite value and equal to NaN.
 */
const doubleCompare = (a: number, b: number): number => {
  const aNaN = Number.isNaN(a);
  const bNaN = Number.isNaN(b);
  if (aNaN || bNaN) {
    return aNaN === bNaN ? 0 : aNaN ? 1 : -1;
  }
  return a < b ? -1 : a === b ? 0 : 1;
};

const booleanCompare = (a: boolean, b: boolean): number => (a === b ? 0 : a ? 1 : -1);

/**
 * Compare two numbers in the fixed path. NaN is not a valid JSON value,
 * so it sorts before every finite number and equals NaN.
 */
const fixedNumberCompare = (a: number, b: number): number => {
  const aNaN = Number.isNaN(a);
  const bNaN = Number.isNaN(b);
  if (aNaN || bNaN) {
    return aNaN === bNaN ? 0 : aNaN ? -1 : 1;
  }
  return a < b ? -1 : a === b ? 0 : 1;
};

/**
 * The fixed rank for one type. Missing and null are both "nothing"; the
 * rest follow Java's order from smallest to largest.
 */
const typeRank = (type: Type): number => {
  switch (type) {
    case Type.NULL:
    case Type.MISSING:
      return 0;
    case Type.STRING:
      return 1;
    case Type.NUMBER:
      return 2;
    case Type.BOOLEAN:
      return 3;
    default:
      return 4;
  }
};

/**
 * Coerce the node to a 64-bit integer the way Jackson's asLong does. A
 * text right side must parse as an integer in full, "2.5" fails and gives
 * 0; NaN has no long form, so it gives 0. Values beyond 2^53 lose
 * exactness in a JS number, the EVAL_INTEGRAL_LONG residual.
 */
const asLong = (node: Node): number => {
  switch (node.type) {
    case Type.NUMBER:
      return Number.isNaN(node.value) ? 0 : Math.trunc(node.value);

    case Type.STRING:
      return parseInteger(node.value);

    case Type.BOOLEAN:
      return node.value ? 1 : 0;

    default:
      return 0;
  }
};

/**
 * Coerce the node to a double the way Jackson's asDouble does. A text
 * right side must parse as a finite number in full, "2x" fails and gives 0.
 */
const asDouble = (node: Node): number => {
  switch (node.type) {
    case Type.NUMBER:
      return node.value;

    case Type.STRING: {
      const value = Number(node.value.trim());
      return Number.isFinite(value) ? value : 0;
    }

    case Type.BOOLEAN:
      return node.value ? 1 : 0;

    default:
      return 0;
  }
};

/**
 * Coerce the node to text the way Jackson's asText does. A null node gives
 * the literal "null" (a raw string diff), a missing node gives the empty
 * string, and composites give the empty string.
 */
const asText = (node: Node): string => {
  switch (node.type) {
    case Type.STRING:
      return node.value;

    case Type.NUMBER:
      return String(node.value);

    case Type.BOOLEAN:
      return node.value ? 'true' : 'false';

    case Type.NULL:
      return 'null';

    default:
      return '';
  }
};

/**
 * Coerce the node to a boolean the way Jackson's asBoolean does: numbers
 * are true when non-zero, and text is true only for "true" in any case.
 */
const asBoolean = (node: Node): boolean => {
  switch (node.type) {
    case Type.BOOLEAN:
      return node.value;

    case Type.NUMBER:
      return node.value !== 0;

    case Type.STRING:
      return node.value.toLowerCase() === 'true';

    default:
      return false;
  }
};

/**
 * Parse a string as a signed integer in full, giving 0 on any failure. A
 * leading sign is allowed and whitespace is trimmed, the same shape
 * Jackson's numeric text parsing accepts.
 */
const parseInteger = (s: string): number => {
  const text = s.trim();
  const len = text.length;
  if (len === 0) {
    return 0;
  }
  let i = 0;
  let sign = 1;
  const first = text[0];
  if (first === '-') {
    sign = -1;
    i = 1;
  } else if (first === '+') {
    i = 1;
  }
  if (i >= len) {
    return 0;
  }
  let result = 0;
  for (; i < len; i++) {
    const code = text.charCodeAt(i);
    if (code < 48 || code > 57) {
      return 0;
    }
    result = result * 10 + (code - 48);
  }
  return sign * result;
};

/**
 * Wrap a value in a Node if not already.
 */
export const toNode = (value: any) => {
  return value instanceof Node ? value : new Node(value);
};

/**
 * Returns true or false indicating the value is "truthy" per the
 * template compiler's rules.
 */
export const isTruthy = (n: Node | any) => {
  const node = toNode(n);
  const value = node.value;
  switch (node.type) {
    case Type.STRING:
      return value !== '';
    case Type.NUMBER:
      return !isNaN(value) && value !== 0;
    case Type.BOOLEAN:
      return value;
    case Type.OBJECT:
      return Object.keys(value).length !== 0 || value.constructor !== Object;
    case Type.ARRAY:
      return value.length !== 0;
    case Type.MISSING:
    case Type.NULL:
    default:
      return false;
  }
};

// Singleton, used any time we need to return a missing node
MISSING_NODE = new Node(null, Type.MISSING);

export { Node, MISSING_NODE };
