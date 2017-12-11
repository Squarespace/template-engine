
import {
  BINDVAR,
  COMMENT,
  END,
  IF,
  INJECT,
  MACRO,
  OR_PREDICATE,
  PREDICATE,
  REPEATED,
  SECTION,
  TEXT,
  ROOT,
  VARIABLE,
} from './opcodes';

// Wrappers to simplify wiring up a valid instruction tree.
// Only composite instructions need these wrappers as atomic
// instructions are represented by a single integer.

// Version of this instruction tree.
const VERSION = 1;

// Compact marker for null block.
const FAST_NULL = 0;

class Instruction {
  constructor(type) {
    this.type = type;
  }
}

const getType = (inst) => {
  return inst instanceof Instruction ? inst.type : inst;
};

const getCode = (inst) => {
  return inst instanceof Instruction ? inst.code : inst;
};

const orNull = (v) => {
  return typeof v === 'undefined' ? FAST_NULL : v;
};

class Bindvar extends Instruction {
  constructor(name, variables, formatters) {
    super(BINDVAR);
    this.code = [this.type, name, variables, orNull(formatters)];
  }
}

class Comment extends Instruction {
  constructor(text, multiline) {
    super(COMMENT);
    this.code = [this.type, text, multiline ? 1 : 0];
  }
}

class If extends Instruction {
  constructor(operators, variables) {
    super(IF);
    this.code = [this.type, operators, variables, [], END];
  }

  addConsequent(inst) {
    this.code[3].push(getCode(inst));
  }

  setAlternate(inst) {
    this.code[4] = getCode(inst);
  }
}

class Inject extends Instruction {
  constructor(name, path) {
    super(INJECT);
    this.code = [this.type, name, path, FAST_NULL];
  }
}

class Macro extends Instruction {
  constructor(name) {
    super(MACRO);
    this.code = [this.type, []];
  }

  addConsequent(inst) {
    this.code[1].push(getCode(inst));
  }
}

class OrPredicate extends Instruction {
  constructor(name, args) {
    super(OR_PREDICATE);
    this.code = [this.type, orNull(name), orNull(args), [], END];
  }

  hasPredicate() {
    return this.code[1] !== FAST_NULL;
  }

  addConsequent(inst) {
    this.code[3].push(getCode(inst));
  }

  setAlternate(inst) {
    this.code[4] = getCode(inst);
  }
}

class Predicate extends Instruction {
  constructor(name, args) {
    super(PREDICATE);
    this.code = [this.type, name, args, [], END];
  }

  addConsequent(inst) {
    this.code[3].push(getCode(inst));
  }

  setAlternate(inst) {
    this.code[4] = getCode(inst);
  }
}

class Repeated extends Instruction {
  constructor(name) {
    super(REPEATED);
    this.code = [this.type, name, [], END, []];
  }

  addConsequent(inst) {
    this.code[2].push(getCode(inst));
  }

  setAlternate(inst) {
    this.code[3] = getCode(inst);
  }

  setAlternatesWith(inst) {
    this.code[4].push(getCode(inst));
  }
}

class Root extends Instruction {
  constructor() {
    super(ROOT);
    this.code = [this.type, VERSION, [], END];
  }

  addConsequent(inst) {
    this.code[2].push(getCode(inst));
  }

  setAlternate(inst) {
    this.code[3] = getCode(inst);
  }
}

class Section extends Instruction {
  constructor(name) {
    super(SECTION);
    this.code = [this.type, name, [], END];
  }

  addConsequent(inst) {
    this.code[2].push(getCode(inst));
  }

  setAlternate(inst) {
    this.code[3] = getCode(inst);
  }
}

class Text extends Instruction {
  constructor(text) {
    super(TEXT);
    this.code = [this.type, text];
  }
}

class Variable extends Instruction {
  constructor(variables, formatters) {
    super(VARIABLE);
    this.code = [this.type, variables, formatters];
  }
}

export {
  getCode,
  getType,
  Bindvar,
  Comment,
  If,
  Inject,
  Instruction,
  Macro,
  OrPredicate,
  Predicate,
  Repeated,
  Root,
  Section,
  Text,
  Variable,
};
