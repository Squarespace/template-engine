import { repeat } from './util';


const BLOCK = 1;
const INST = 2;

// Markers indicating the internal structure of instructions.
const STRUCTURE = [
  null, // TEXT
  null, // VARIABLE
  [0, 0, BLOCK, INST], // SECTION
  null, // END
  [0, 0, BLOCK, INST, BLOCK], // REPEATED
  [0, 0, 0, BLOCK, INST], // PREDICATE
  null, // BINDVAR
  [0, 0, 0, BLOCK, INST], // OR_PREDICATE
  [0, 0, 0, BLOCK, INST], // IF
  null, // INJECT
  [0, 0, BLOCK], // MACRO
  null, // COMMENT
  null, // META_LEFT
  null, // META_RIGHT
  null, // NEWLINE
  null, // SPACE
  null, // TAB
  [0, 0, BLOCK, INST], // ROOT
  null, // EOF
];


/**
 * Produces a readable JSON representation of an instruction tree.
 */
class Pretty {

  constructor(indent) {
    this.indent = indent;
  }

  format(inst) {
    return this.formatInstruction(inst, 0);
  }

  /**
   * Formats an instruction according to its internal structure.
   */
  formatInstruction(inst, depth) {
    const opcode = typeof inst === 'number' ? inst : inst[0];
    const structure = STRUCTURE[opcode];

    // Atomic instructions are integers.
    if (structure === null) {
      return this.formatValue(inst, depth);
    }

    // Composite instructions are Arrays.
    let res = '[';
    for (let i = 0; i < inst.length; i++) {
      if (i > 0) {
        res += ', ';
      }
      if (structure[i] === BLOCK) {
        res += this.formatBlock(inst[i], depth + 1);
      } else if (structure[i] === INST) {
        res += this.formatInstruction(inst[i], depth);
      } else {
        res += this.formatValue(inst[i], depth);
      }
    }
    return res + ']';
  }

  /**
   * Formats a non-instruction literal.
   */
  formatValue(value, depth) {
    if (Array.isArray(value)) {
      return '[' + value.map(v => this.formatValue(v)).join(', ') + ']';
    }
    return JSON.stringify(value);
  }

  /**
   * Formats a block of instructions.
   */
  formatBlock(block, depth) {
    // Empty blocks are inlined.
    if (block.length === 0) {
      return '[]';
    }

    // Populated blocks are indented.
    const prefix = repeat(depth, this.indent);
    let res = '[\n';
    for (let i = 0; i < block.length; i++) {
      res += prefix + this.formatInstruction(block[i], depth + 1);
      if (i < block.length - 1) {
        res += ',\n';
      }
    }
    return res + '\n' + repeat(depth - 1, this.indent) + ']';
  }

}

const prettyJson = (inst, indent = '  ') => {
  const pretty = new Pretty(indent);
  return pretty.format(inst);
};

export default prettyJson;
