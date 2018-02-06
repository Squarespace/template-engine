import types from './types';
import { deepEquals, replaceMappedChars, stringCompare } from './util';

// Forward declaration
let MISSING_NODE = null;

/**
 * Wrapper for a typed value with some utility methods.
 */
class Node {

  constructor(value, type) {
    this.value = value;
    this.type = typeof type === 'undefined' ? types.of(value) : type;
  }

  isNull() {
    return this.type === types.NULL;
  }

  isMissing() {
    return this.type === types.MISSING;
  }

  equals(other) {
    const value = other instanceof Node ? other.value : other;
    return deepEquals(this.value, value);
  }

  compare(other) {
    const node = other instanceof Node ? other : this.newNode(other);
    switch (this.type) {
    case types.NUMBER:
    {
      const n = node.asNumber();
      return this.value < n ? -1 : ((this.value === n) ? 0 : 1);
    }

    case types.STRING:
      return stringCompare(this.value, node.asString());

    case types.BOOLEAN:
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
  size() {
    switch (this.type) {
    case types.OBJECT:
      return Object.keys(this.value).length;
    case types.ARRAY:
      return this.value.length;
    default:
      return 0;
    }
  }

  /**
   * This converts a value to a boolean using the Jackson JSON rules.
   * For example, string "true" is true, all other string values are false.
   */
  asBoolean() {
    switch (this.type) {
    case types.BOOLEAN:
      return this.value;
    case types.STRING:
      return this.value === 'true' ? true : false;
    case types.NUMBER:
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
  asString() {
    switch (this.type) {
    case types.STRING:
      return this.value;

    case types.NULL:
    case types.MISSING:
      return '';

    case types.NUMBER:
    case types.BOOLEAN:
      return String(this.value);

    default:
      return JSON.stringify(this.value);
    }
  }

  /**
   * Return the node's value as a number, converting where needed.
   */
  asNumber() {
    switch (this.type) {
    case types.NUMBER:
      return this.value;
    case types.STRING:
      if (this.value.indexOf('.') !== -1) {
        return parseFloat(this.value, 10);
      }
      return parseInt(this.value, 10);
    case types.BOOLEAN:
      return this.value ? 1 : 0;
    default:
      return 0;
    }
  }

  /**
   * Replace characters in the string with those in the mapping.
   */
  replace(mapping) {
    return replaceMappedChars(this.asString(), mapping);
  }

  newNode(value, type) {
    return new Node(value, type);
  }

  path(path) {
    let value = this.value;
    let type = this.type;
    for (let i = 0, len = path.length; i < len; i++) {
      const name = path[i];

      // Short circuit lookups on objects that don't support them.
      if (type !== types.OBJECT && type !== types.ARRAY) {
        return MISSING_NODE;
      }

      value = value[name];
      type = types.of(value);
    }
    if (type === types.MISSING) {
      return MISSING_NODE;
    }
    return this.newNode(value, type);
  }

  get(key) {
    if (this.type === types.ARRAY || this.type === types.OBJECT) {
      const value = this.value[key];
      const type = types.of(value);
      if (type !== types.MISSING) {
        return this.newNode(value, type);
      }
    }
    return MISSING_NODE;
  }
}

// Singleton, used any time we need to return a missing node
MISSING_NODE = new Node(null, types.MISSING);

export {
  Node,
  MISSING_NODE,
};
