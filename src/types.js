// Constants for type checking values.
const MISSING = 0;
const OBJECT = 1;
const ARRAY = 2;
const NUMBER = 3;
const STRING = 4;
const BOOLEAN = 5;
const NULL = 6;

const NAMES = [
  'MISSING',
  'OBJECT',
  'ARRAY',
  'NUMBER',
  'STRING',
  'BOOLEAN',
  'NULL',
];

/**
 * Returns a constant indicating the type of the given value.
 */
function of(value) {
  switch (typeof value) {
  case 'object':
    if (value === null) {
      return NULL;
    } else if (Array.isArray(value)) {
      return ARRAY;
    }
    return OBJECT;
  case 'string':
    return STRING;
  case 'boolean':
    return BOOLEAN;
  case 'number':
    return isFinite(value) ? NUMBER : MISSING;
  }
  // Covers undefined, function, etc
  return MISSING;
}

const nameOf = t => NAMES[t];

export default {
  of,
  nameOf,
  MISSING,
  OBJECT,
  ARRAY,
  NUMBER,
  STRING,
  BOOLEAN,
  NULL
};
