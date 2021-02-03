// Opcode values for abstract syntax version 1
export enum Opcode {
  NOOP = -1,
  TEXT = 0,
  VARIABLE = 1,
  SECTION = 2,
  END = 3,
  REPEATED = 4,
  PREDICATE = 5,
  BINDVAR = 6,
  OR_PREDICATE = 7,
  IF = 8,
  INJECT = 9,
  MACRO = 10,
  COMMENT = 11,
  META_LEFT = 12,
  META_RIGHT = 13,
  NEWLINE = 14,
  SPACE = 15,
  TAB = 16,
  ROOT = 17,
  EOF = 18,

  // AlternatesWith never appears instruction trees, but its type
  // may be referenced in code.
  ALTERNATES_WITH = 19,

  // Proposed instructions to allow extension at runtime
  STRUCT = 20,
  ATOM = 21,

  // Composite context variable instruction
  CTXVAR = 22,

  // Evaluate expression
  EVAL = 23,

  // Include a macro / partial inline
  INCLUDE = 24,
}

const NAMES = {
  [Opcode.NOOP]: 'NOOP',
  [Opcode.TEXT]: 'TEXT',
  [Opcode.VARIABLE]: 'VARIABLE',
  [Opcode.SECTION]: 'SECTION',
  [Opcode.END]: 'END',
  [Opcode.REPEATED]: 'REPEATED',
  [Opcode.PREDICATE]: 'PREDICATE',
  [Opcode.BINDVAR]: 'BINDVAR',
  [Opcode.OR_PREDICATE]: 'OR_PREDICATE',
  [Opcode.IF]: 'IF',
  [Opcode.INJECT]: 'INJECT',
  [Opcode.MACRO]: 'MACRO',
  [Opcode.COMMENT]: 'COMMENT',
  [Opcode.META_LEFT]: 'META_LEFT',
  [Opcode.META_RIGHT]: 'META_RIGHT',
  [Opcode.NEWLINE]: 'NEWLINE',
  [Opcode.SPACE]: 'SPACE',
  [Opcode.TAB]: 'TAB',
  [Opcode.ROOT]: 'ROOT',
  [Opcode.EOF]: 'EOF',
  [Opcode.ALTERNATES_WITH]: 'ALTERNATES_WITH',
  [Opcode.STRUCT]: 'STRUCT',
  [Opcode.ATOM]: 'ATOM',
  [Opcode.CTXVAR]: 'CTXVAR',
  [Opcode.EVAL]: 'EVAL',
  [Opcode.INCLUDE]: 'INCLUDE',
};

export const nameOfOpcode = (opcode: Opcode) => {
  const name = NAMES[opcode];
  return typeof name === 'undefined' ? 'UNKNOWN' : name;
};
