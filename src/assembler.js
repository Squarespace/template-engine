import * as errors from './errors';
import Sink from './sink';
import { getType, Root } from './instructions';

import {
  ALTERNATES_WITH,
  END,
  EOF,
  IF,
  MACRO,
  OR_PREDICATE,
  PREDICATE,
  SECTION,
  REPEATED,
  ROOT,
} from './opcodes';

/**
 * Assembles a stream of instructions into a valid tree that can be executed.
 * As individual instructions are parsed they are fed to this state machine.
 */
class Assembler extends Sink {

  constructor() {
    super();
    this.stack = [];
    this.errors = [];
    this.state = this.stateRoot;
    this.root = new Root();
    this.current = this.root;
  }

  /**
   * Accept an instruction and weave it into the instruction tree.
   */
  accept(inst) {
    const type = getType(inst);
    switch (type) {
    case IF:
    case MACRO:
    case PREDICATE:
    case REPEATED:
    case SECTION:
      this.state = this.state.call(this, type, inst, true);
      break;

    default:
      this.state = this.state.call(this, type, inst, false);
      break;
    }
  }

  /**
   * Indicates that the last instruction has been fed to the assembler.
   * Performs a check and returns a flag indicating success.
   */
  complete() {
    const type = getType(this.current);
    if (type !== ROOT) {
      this.fail(errors.unclosed(this.current));
    }
    if (this.state !== this.stateEOF) {
      this.fail(errors.stateEOFNotReached());
    }
    return this.errors.length === 0;
  }

  /**
   * Append a message to the errors list.
   */
  fail(msg) {
    this.errors.push(msg);
  }

  /**
   * Append the next instruction to the current instruction's consequent block,
   * then push the next instruction onto the stack.
   */
  pushConsequent(type, inst) {
    this.addConsequent(inst);
    return this.push(type, inst);
  }

  /**
   * Push a block instruction onto the stack.
   */
  push(type, inst) {
    this.stack.push(this.current);
    this.current = inst;
    return this.stateFor(type);
  }

  /**
   * Pop a block instruction off the stack.
   */
  pop() {
    const elem = this.stack.pop();
    this.current = elem;
    if (typeof elem === 'undefined') {
      throw new Error(errors.rootPop());
    }
    const type = getType(elem);
    return this.stateFor(type);
  }

  /**
   * Return the handler state for a given instruction type.
   */
  stateFor(type) {
    switch (type) {
    case IF:
      return this.stateIf;
    case MACRO:
      return this.stateMacro;
    case OR_PREDICATE:
      return this.stateOrPredicate;
    case PREDICATE:
      return this.statePredicate;
    case REPEATED:
      return this.stateRepeated;
    case ROOT:
      return this.stateRoot;
    case SECTION:
      return this.stateSection;
    default:
      throw new Error(errors.nonBlockState(type));
    }
  }

  /**
   * Append to the current instruction's consequent block.
   */
  addConsequent(inst) {
    this.current.addConsequent(inst);
  }

  /**
   * Set the alternate branch instruction.
   */
  setAlternate(inst) {
    this.current.setAlternate(inst);
  }

  /**
   * ALTERNATES_WITH state.
   */
  stateAlternatesWith(type, inst, push) {
    if (push) {
      return this.pushConsequent(type, inst);
    }
    switch (type) {
    case EOF:
      this.fail(errors.eofInBlock(this.current));
      break;

    case ALTERNATES_WITH:
      this.fail(errors.notAllowedInBlock(inst, this.current));
      break;

    case OR_PREDICATE:
      this.setAlternate(inst);
      this.current = inst;
      return this.stateOrPredicate;

    case END:
      this.setAlternate(inst);
      return this.pop();

    default:
      this.current.setAlternatesWith(inst);
      break;
    }
    return this.stateAlternatesWith;
  }

  /**
   * Dead state.
   */
  stateDead(type, inst, push) {
    return this.stateDead;
  }

  /**
   * EOF state.
   */
  stateEOF(type, inst, push) {
    // Attempting to transition from this state is an error.
    this.fail(errors.transitionFromEOF(inst));
    return this.stateDead;
  }

  /**
   * IF state.
   */
  stateIf(type, inst, push) {
    if (push) {
      return this.pushConsequent(type, inst);
    }
    switch (type) {
    case EOF:
      this.fail(errors.eofInBlock(this.current));
      break;

    case ALTERNATES_WITH:
      this.fail(errors.notAllowedInBlock(inst, this.current));
      break;

    case END:
      this.setAlternate(inst);
      return this.pop();

    case OR_PREDICATE:
      this.setAlternate(inst);
      this.current = inst;
      return this.stateOrPredicate;

    default:
      this.addConsequent(inst);
      break;
    }
    return this.stateIf;
  }

  /**
   * MACRO state.
   */
  stateMacro(type, inst, push) {
    if (push) {
      return this.pushConsequent(type, inst);
    }
    switch (type) {
    case EOF:
      this.fail(errors.eofInBlock(this.current));
      break;

    case ALTERNATES_WITH:
    case OR_PREDICATE:
      this.fail(errors.notAllowedInBlock(inst, this.current));
      break;

    case END:
      // Note: macros only have a consequent block, no alternate.
      return this.pop();

    default:
      this.addConsequent(inst);
      break;
    }
    return this.stateMacro;
  }

  /**
   * OR_PREDICATE state.
   */
  stateOrPredicate(type, inst, push) {
    if (push) {
      return this.pushConsequent(type, inst);
    }
    switch (type) {
    case EOF:
      this.fail(errors.eofInBlock(this.current));
      break;

    case ALTERNATES_WITH:
      this.fail(errors.notAllowedInBlock(inst, this.current));
      break;

    case END:
      this.setAlternate(inst);
      return this.pop();

    case OR_PREDICATE:
    {
      // Any OR following another OR that has no predicate is dead code.
      const parentType = getType(this.current);
      if (parentType === OR_PREDICATE && !this.current.hasPredicate()) {
        this.fail(errors.deadCode(inst));
        break;
      }
      this.setAlternate(inst);
      this.current = inst;
      break;
    }

    default:
      this.addConsequent(inst);
      break;
    }
    return this.stateOrPredicate;
  }

  /**
   * PREDICATE state.
   */
  statePredicate(type, inst, push) {
    if (push) {
      return this.pushConsequent(type, inst);
    }
    switch (type) {
    case EOF:
      this.fail(errors.eofInBlock(this.current));
      break;

    case ALTERNATES_WITH:
      this.fail(errors.notAllowedInBlock(inst, this.current));
      break;

    case END:
      this.setAlternate(inst);
      return this.pop();

    case OR_PREDICATE:
      this.setAlternate(inst);
      this.current = inst;
      return this.stateOrPredicate;

    default:
      this.addConsequent(inst);
      break;
    }
    return this.statePredicate;
  }

  /**
   * REPEATED state.
   */
  stateRepeated(type, inst, push) {
    if (push) {
      return this.pushConsequent(type, inst);
    }
    switch (type) {
    case EOF:
      this.fail(errors.eofInBlock(this.current));
      break;

    case END:
      this.setAlternate(inst);
      return this.pop();

    case OR_PREDICATE:
      this.setAlternate(inst);
      this.current = inst;
      return this.stateOrPredicate;

    case ALTERNATES_WITH:
      return this.stateAlternatesWith;

    default:
      this.addConsequent(inst);
      break;
    }
    return this.stateRepeated;
  }

  /**
   * ROOT state.
   */
  stateRoot(type, inst, push) {
    if (push) {
      return this.pushConsequent(type, inst);
    }
    switch (type) {
    case EOF:
      this.setAlternate(inst);
      return this.stateEOF;

    case END:
    case ALTERNATES_WITH:
    case OR_PREDICATE:
      this.fail(errors.notAllowedAtRoot(inst));
      break;

    default:
      this.addConsequent(inst);
    }
    return this.stateRoot;
  }

  /**
   * SECTION state.
   */
  stateSection(type, inst, push) {
    if (push) {
      return this.pushConsequent(type, inst);
    }
    switch (type) {
    case EOF:
      this.fail(errors.eofInBlock(this.current));
      break;

    case ALTERNATES_WITH:
      this.fail(errors.notAllowedInBlock(inst, this.current));
      break;

    case END:
      this.setAlternate(inst);
      return this.pop();

    case OR_PREDICATE:
      this.setAlternate(inst);
      this.current = inst;
      return this.stateOrPredicate;

    default:
      this.addConsequent(inst);
      break;
    }
    return this.stateSection;
  }

}

export default Assembler;
