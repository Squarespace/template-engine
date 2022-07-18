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

  constructor(value: any, type?: Type) {
    this.value = value;
    this.type = type !== undefined ? type : of(value);
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

  compare(other: any): number {
    const node = other instanceof Node ? other : new Node(other);
    switch (this.type) {
      case Type.NUMBER: {
        const n = node.asNumber();
        return this.value < n ? -1 : this.value === n ? 0 : 1;
      }

      case Type.STRING:
        return stringCompare(this.value, node.asString());

      case Type.BOOLEAN: {
        const n = node.asBoolean();
        return this.value === n ? 0 : this.value ? 1 : -1;
      }

      default:
        return deepEquals(this.value, node.value) ? 0 : -1;
    }
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
      if (
        (type === Type.OBJECT && value.hasOwnProperty(name)) ||
        (type === Type.ARRAY && typeof name === 'number')
      ) {
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
