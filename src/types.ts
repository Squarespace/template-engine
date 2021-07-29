export enum Type {
  MISSING = 0,
  OBJECT = 1,
  ARRAY = 2,
  NUMBER = 3,
  STRING = 4,
  BOOLEAN = 5,
  NULL = 6
}

const NAMES = {
  [Type.MISSING]: 'MISSING',
  [Type.OBJECT]: 'OBJECT',
  [Type.ARRAY]: 'ARRAY',
  [Type.NUMBER]: 'NUMBER',
  [Type.STRING]: 'STRING',
  [Type.BOOLEAN]: 'BOOLEAN',
  [Type.NULL]: 'NULL'
};

export const nameOfType = (type: Type) => NAMES[type];

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
