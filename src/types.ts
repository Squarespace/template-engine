export enum Type {
  MISSING = 0,
  OBJECT = 1,
  ARRAY = 2,
  NUMBER = 3,
  STRING = 4,
  BOOLEAN = 5,
  NULL = 6,
}

const NAMES = {
  [Type.MISSING]: 'MISSING',
  [Type.OBJECT]: 'OBJECT',
  [Type.ARRAY]: 'ARRAY',
  [Type.NUMBER]: 'NUMBER',
  [Type.STRING]: 'STRING',
  [Type.BOOLEAN]: 'BOOLEAN',
  [Type.NULL]: 'NULL',
};

export const nameOfType = (type: Type) => NAMES[type];

/**
 * Options to configure the expression engine.
 */
export interface ExprOptions {
  /**
   * Maximum number of tokens an expression can contain. If an expression exceeds
   * this limit it raises an error.
   */
  maxTokens?: number;

  /**
   * Maximum length of a string that can be constructed through concatenation.
   * If string result of A + B exceeds the length it raises an error.
   */
  maxStringLen?: number;
}

export const of = (value: any) => {
  switch (typeof value) {
    case 'object':
      return value === null ? Type.NULL : Array.isArray(value) ? Type.ARRAY : Type.OBJECT;
    case 'string':
      return Type.STRING;
    case 'boolean':
      return Type.BOOLEAN;
    case 'number':
      return Type.NUMBER;
    default:
      return Type.MISSING;
  }
};
