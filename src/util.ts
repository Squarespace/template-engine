import { of, Type } from './types';

const ALL_DIGITS = /^\d+$/;

/**
 * Split a variable reference into parts. This forms a path that
 * will be used to resolve against a context. Digit components of
 * the path are converted to numbers.
 */
export const splitVariable = (name: string) => {
  const parts: (string | number)[] = name.split('.');
  const len = parts.length;
  for (let i = 0; i < len; i++) {
    const part = parts[i] as string;
    if (ALL_DIGITS.test(part)) {
      let key = parseInt(part, 10);
      // Ensure number fits into 32-bit signed integer range, otherwise
      // treat as a string key
      if (isFinite(key) && key <= 0x7fffffff) {
        parts[i] = key;
      }
    }
  }
  return parts;
};

const RE_JSON_START = /^[\"\d\[\{]|^-\d|^(true|false|null)$/;

/**
 * Return true if the string starts with a value JSON character or value.
 */
export const isJsonStart = (s: string | number) => RE_JSON_START.test(s as string);

/**
 * Deep compare of two objects for equality.
 *
 * Note: this is not general-purpose. It is intended to deeply-compare
 * valid JSON types. For example it cannot determine equality of Date objects.
 */
/*eslint complexity: ["error", 30]*/
export const deepEquals = (o1: any, o2: any) => {
  const seen = new Map();
  const visit = (a: any, b: any) => {
    // Number, string, boolean, null, undefined can be compared using ===
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
      return a === b;
    }

    // Ensure objects are of same type.
    if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) {
      return false;
    }

    // Detect reference cycle.
    if (seen.has(a)) {
      return seen.get(a) === b;
    }

    // Mark these objects as seen.
    seen.set(a, b);
    seen.set(b, a);

    if (Array.isArray(a)) {
      // Array lengths must be equal.
      const len = a.length;
      if (len !== b.length) {
        return false;
      }

      // Compare elements of arrays.
      for (let i = 0; i < len; i++) {
        if (!visit(a[i], b[i])) {
          return false;
        }
      }

    } else {
      // Compare keys across both objects.
      for (const k in a) {
        if (!visit(a[k], b[k])) {
          return false;
        }
      }
      for (const k in b) {
        if (!visit(a[k], b[k])) {
          return false;
        }
      }
    }

    return true;
  };
  return visit(o1, o2);
};

/**
 * Returns an integer indicating:
 *
 *  -N   left < right
 *   0   left == right
 *  +N   left > right
 */
export const stringCompare = (s1: string, s2: string) => {
  const len1 = s1.length;
  const len2 = s2.length;
  const lim = Math.min(len1, len2);
  let k = 0;
  while (k < lim) {
    const c1 = s1.charCodeAt(k);
    const c2 = s2.charCodeAt(k);
    if (c1 !== c2) {
      return c1 - c2;
    }
    k++;
  }
  return len1 - len2;
};

/**
 * Repeat a string N times.
 */
export const repeat = (n: number, str: string) => {
  if (n === 1) {
    return str;
  }
  let res = '';
  for (let i = 0; i < n; i++) {
    res += str;
  }
  return res;
};

const isObject = (o: any) => of(o) === Type.OBJECT;

/**
 * Merge object deeply nested properties.
 */
export const deepMerge = (dst: any, ...sources: any[]): any => {
  if (!sources.length) {
    return dst;
  }

  const src = sources.shift();
  if (isObject(dst) && isObject(src)) {
    for (const key in src) {
      if (isObject(src[key])) {
        if (!dst[key]) {
          Object.assign(dst, { [key]: {} });
        }
        deepMerge(dst[key], src[key]);
      } else {
        Object.assign(dst, { [key]: src[key] });
      }
    }
  }

  return deepMerge(dst, ...sources);
};

/**
 * Create a deep copy of value, object or array.
 */
export const deepCopy = (obj: any): any => {
  const type = of(obj);
  switch (type) {
  case Type.ARRAY:
    return obj.map((e: any) => deepCopy(e));
  case Type.OBJECT:
    return Object.keys(obj).reduce((o: any, k: string): any => {
      o[k] = deepCopy(obj[k]);
      return o;
    }, {});
  default:
    return obj;
  }
};

/**
 * For each character in the mapping, replace it in the output.
 */
export const replaceMappedChars = (str: string, mapping: { [c: string]: string }) => {
  const len = str.length;
  let out = '';
  for (let i = 0; i < len; i++) {
    const ch = str[i];
    const repl = mapping[ch];
    out += repl ? repl : ch;
  }
  return out;
};
