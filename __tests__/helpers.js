import { deepCopy, deepMerge } from '../src/util';
import { Node } from '../src/node';
import types from '../src/types';

/**
 * Helper to simplify manipulating deep structures during testing.
 */
export class Struct {
  constructor(obj) {
    this.obj = obj;
  }

  /**
   * Override to build instances of subclasses.
   */
  build(obj) {
    return new Struct(obj);
  }

  /**
   * Return the real object.
   */
  get() {
    return this.obj;
  }

  /**
   * Return the real object wrapped in a Node.
   */
  node() {
    return new Node(this.obj);
  }

  /**
   * Merge the given objects together and return a copy.
   */
  merge(...src) {
    const obj = deepMerge(deepCopy(this.obj), ...src);
    return this.build(obj);
  }

  /**
   * Set a value by resolving the nested path.
   */
  set(value, ...path) {
    const obj = deepCopy(this.obj);
    const last = path.length - 1;
    let tmp = obj;
    for (let i = 0; i < path.length; i++) {
      const key = path[i];
      const type = types.of(obj);
      if (type !== types.OBJECT && type !== types.ARRAY) {
        throw new Error(`Attempt to set property ${key} on object of type ${types.nameOf(type)}`);
      }
      if (i === last) {
        tmp[key] = value;
      } else {
        tmp = tmp[key];
      }
    }
    return this.build(obj);
  }

}

const blankProduct = {
  structuredContent: {
    productType: -1,
    variants: []
  }
};

/**
 * Commerce product.
 */
export class Product extends Struct {
  constructor(obj = blankProduct) {
    super(obj);
  }

  build(obj) {
    return new Product(obj);
  }

  type(type) {
    return this.set(type.code, 'structuredContent', 'productType');
  }

  variants(variants) {
    return this.set(variants, 'structuredContent', 'variants');
  }
}

const blankImage = {
  originalSize: '',
  assetUrl: '',
  title: '',
  mediaFocalPoint: {}
};

export class Image extends Struct {
  constructor(obj = blankImage) {
    super(obj);
  }

  build(obj) {
    return new Image(obj);
  }

  focalPoint(x, y) {
    return this.set({ x, y }, 'mediaFocalPoint');
  }

  originalSize(size) {
    return this.set(size, 'originalSize');
  }

  assetUrl(url) {
    return this.set(url, 'assetUrl');
  }

  title(text) {
    return this.set(text, 'title');
  }
}


/**
 * Generate a sequence of numbered paths.
 */
export const pathseq = (pattern, end) => {
  const res = [];
  for (let i = 1; i <= end; i++) {
    const path = pattern.replace('%N', i);
    res.push(path);
  }
  return res;
};


/**
 * Helper to build JSON test cases that compare K to K-expected.
 */
export const expectedTests = (name, spec) => {
  const cases = [];
  Object.keys(spec).filter(k => !k.endsWith('-expected')).forEach(k => {
    const input = spec[k];
    const expected = spec[k + '-expected'];
    cases.push({ name: `${name} - ${k}`, input, expected });
  });
  return cases;
};

/**
 * Helper to build true / false test cases.
 */
export const predicateTests = (name, spec) => {
  const cases = [];
  Object.keys(spec).forEach(k => {
    const input = spec[k];
    const expected = k.endsWith('-true');
    cases.push({ name: `${name} - ${k}`, input, expected });
  });
  return cases;
};

