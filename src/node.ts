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

  equals(other: any) {
    const value = other instanceof Node ? other.value : other;
    return deepEquals(this.value, value);
  }

  compare(other: any) {
    const node = other instanceof Node ? other : new Node(other);
    switch (this.type) {
    case Type.NUMBER:
    {
      const n = node.asNumber();
      return this.value < n ? -1 : ((this.value === n) ? 0 : 1);
    }

    case Type.STRING:
      return stringCompare(this.value, node.asString());

    case Type.BOOLEAN:
    {
      const n = node.asBoolean();
      return this.value === n ? 0 : (this.value ? 1 : -1);
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
    case Type.NUMBER:
    {
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
      return JSON.stringify(this.value);
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
  replace(mapping: any) {
    return replaceMappedChars(this.asString(), mapping);
  }

  // newNode(value: any, type: Type): Node {
  //   return new Node(value, type);
  // }

  path(path: (string | number)[]) {
    let value = this.value;
    let type = this.type;
    for (let i = 0, len = path.length; i < len; i++) {
      const name = path[i];

      // Short circuit lookups on objects that don't support them.
      if (type !== Type.OBJECT && type !== Type.ARRAY) {
        return MISSING_NODE;
      }

      value = value[name];
      type = of(value);
    }
    if (type === Type.MISSING) {
      return MISSING_NODE;
    }
    return new Node(value, type);
  }

  get(key: string | number) {
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

// Singleton, used any time we need to return a missing node
MISSING_NODE = new Node(null, Type.MISSING);

export {
  Node,
  MISSING_NODE,
};
