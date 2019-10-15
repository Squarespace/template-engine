import { deepCopy, deepMerge } from '../src/util';
import { Node } from '../src/node';
import { nameOfType, of, Type } from '../src/types';

/**
 * Helper to simplify manipulating deep structures during testing.
 */
export abstract class Struct<T> {
  constructor(private obj: any) {
  }

  /**
   * Override to build instances of subclasses.
   */
  abstract build(obj: any): T;

  //  {
  //   return new Struct(obj);
  // }

  /**
   * Return the real object.
   */
  get(): any {
    return this.obj;
  }

  /**
   * Return the real object wrapped in a Node.
   */
  node(): Node {
    return new Node(this.obj);
  }

  /**
   * Merge the given objects together and return a copy.
   */
  merge(...src: any): T {
    const obj = deepMerge(deepCopy(this.obj), ...src);
    return this.build(obj);
  }

  /**
   * Set a value by resolving the nested path.
   */
  set(value: any, ...path: string[]): T {
    const obj = deepCopy(this.obj);
    const last = path.length - 1;
    let tmp = obj;
    for (let i = 0; i < path.length; i++) {
      const key = path[i];
      const type = of(obj);
      if (type !== Type.OBJECT && type !== Type.ARRAY) {
        throw new Error(`Attempt to set property ${key} on object of type ${nameOfType(type)}`);
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
export class Product extends Struct<Product> {
  constructor(obj: any = blankProduct) {
    super(obj);
  }

  build(obj: any): Product {
    return new Product(obj);
  }

  type(type: any): Product {
    return this.set(type.code, 'structuredContent', 'productType');
  }

  variants(variants: any): Product {
    return this.set(variants, 'structuredContent', 'variants');
  }
}

const blankImage: any = {
  originalSize: '',
  assetUrl: '',
  title: '',
  mediaFocalPoint: {}
};

export class Image extends Struct<Image> {
  constructor(obj: any = blankImage) {
    super(obj);
  }

  build(obj: any): Image {
    return new Image(obj);
  }

  focalPoint(x: number, y: number): Image {
    return this.set({ x, y }, 'mediaFocalPoint');
  }

  originalSize(size: string): Image {
    return this.set(size, 'originalSize');
  }

  assetUrl(url: string): Image {
    return this.set(url, 'assetUrl');
  }

  title(text: string): Image {
    return this.set(text, 'title');
  }
}

/**
 * Generate a sequence of numbered paths.
 */
export const pathseq = (pattern: string, end: number) => {
  const res = [];
  for (let i = 1; i <= end; i++) {
    const path = pattern.replace('%N', String(i));
    res.push(path);
  }
  return res;
};

interface TestCase {
  name: string;
  input: any;
  expected: any;
}

/**
 * Helper to build JSON test cases that compare K to K-expected.
 */
export const expectedTests = (name: string, spec: any) => {
  const cases: TestCase[] = [];
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
export const predicateTests = (name: string, spec: any) => {
  const cases: TestCase[] = [];
  Object.keys(spec).forEach(k => {
    const input = spec[k];
    const expected = k.endsWith('-true');
    cases.push({ name: `${name} - ${k}`, input, expected });
  });
  return cases;
};
