// Opcode values for abstract syntax version 1
export const NOOP = -1;
export const TEXT = 0;
export const VARIABLE = 1;
export const SECTION = 2;
export const END = 3;
export const REPEATED = 4;
export const PREDICATE = 5;
export const BINDVAR = 6;
export const OR_PREDICATE = 7;
export const IF = 8;
export const INJECT = 9;
export const MACRO = 10;
export const COMMENT = 11;
export const META_LEFT = 12;
export const META_RIGHT = 13;
export const NEWLINE = 14;
export const SPACE = 15;
export const TAB = 16;
export const ROOT = 17;
export const EOF = 18;

// AlternatesWith never appears instruction trees, but its type
// may be referenced in code.
export const ALTERNATES_WITH = 19;

// Propsed instructions to allow extension of the runtime syntax
export const STRUCT = 20;
export const ATOM = 21;

const NAMES = {
  [NOOP]: 'NOOP',
  [TEXT]: 'TEXT',
  [VARIABLE]: 'VARIABLE',
  [SECTION]: 'SECTION',
  [END]: 'END',
  [REPEATED]: 'REPEATED',
  [PREDICATE]: 'PREDICATE',
  [BINDVAR]: 'BINDVAR',
  [OR_PREDICATE]: 'OR_PREDICATE',
  [IF]: 'IF',
  [INJECT]: 'INJECT',
  [MACRO]: 'MACRO',
  [COMMENT]: 'COMMENT',
  [META_LEFT]: 'META_LEFT',
  [META_RIGHT]: 'META_RIGHT',
  [NEWLINE]: 'NEWLINE',
  [SPACE]: 'SPACE',
  [TAB]: 'TAB',
  [ROOT]: 'ROOT',
  [EOF]: 'EOF',
  [ALTERNATES_WITH]: 'ALTERNATES_WITH',
  [STRUCT]: 'STRUCT',
  [ATOM]: 'ATOM',
};

export const nameOf = (opcode) => {
  const name = NAMES[opcode];
  return typeof name === 'undefined' ? 'UNKNOWN' : name;
};

export const NULL_TEMPLATE = [ROOT, 1, [], EOF];
