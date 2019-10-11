import {
  deadCode,
  eofInBlock,
  nonBlockState,
  notAllowedAtRoot,
  notAllowedInBlock,
  rootPop,
  stateEOFNotReached,
  transitionFromEOF,
  unclosed,
  TemplateError
} from './errors';
import { Opcode } from './opcodes';
import { Sink } from './sink';
import {
  getType,
  BlockInstruction,
  Code,
  CompositeInstruction,
  Instruction,
  OrPredicate,
  Repeated,
  Root
} from './instructions';

type AssemblerState = (type: Opcode, inst: Instruction, push: boolean) => AssemblerState;

/**
 * Assembles a stream of instructions into a valid tree that can be executed.
 * As individual instructions are parsed they are fed to this state machine.
 */
export class Assembler extends Sink {

  public errors: TemplateError[] = [];
  public root: Root = new Root();

  private stack: Instruction[] = [];
  private state: AssemblerState;
  private current?: Instruction;

  constructor() {
    super();
    this.state = this.stateRoot;
    this.current = this.root;
  }

  /**
   * Accept an instruction and weave it into the instruction tree.
   */
  accept(inst: Instruction): void {
    const type = getType(inst);
    switch (type) {
    case Opcode.IF:
    case Opcode.MACRO:
    case Opcode.PREDICATE:
    case Opcode.REPEATED:
    case Opcode.SECTION:
    case Opcode.STRUCT:
      this.state = this.state.call(this, type, inst, true);
      break;

    default:
      this.state = this.state.call(this, type, inst, false);
      break;
    }
  }

  /**
   * Accept an error and append to the errors array.
   */
  error(err: TemplateError): void {
    this.errors.push(err);
  }

  /**
   * Indicates that the last instruction has been fed to the assembler.
   * Performs a check and returns a flag indicating success.
   */
  complete(): boolean {
    const type = getType(this.current!);
    if (type !== Opcode.ROOT) {
      this.error(unclosed(this.current!));
    }
    if (this.state !== this.stateEOF) {
      this.error(stateEOFNotReached());
    }
    return this.errors.length === 0;
  }

  /**
   * Return the raw code assembled.
   */
  code(): Code {
    return this.root.code;
  }

  /**
   * Append the next instruction to the current instruction's consequent block,
   * then push the next instruction onto the stack.
   */
  pushConsequent(type: Opcode, inst: Instruction): AssemblerState {
    this.addConsequent(inst);
    return this.push(type, inst);
  }

  /**
   * Push a block instruction onto the stack.
   */
  push(type: Opcode, inst: Instruction): AssemblerState {
    this.stack.push(this.current!);
    this.current = inst;
    return this.stateFor(type);
  }

  /**
   * Pop a block instruction off the stack.
   */
  pop(): AssemblerState {
    const elem = this.stack.pop();
    this.current = elem;
    if (elem === undefined) {
      throw new Error(JSON.stringify(rootPop()));
    }
    const type = getType(elem);
    return this.stateFor(type);
  }

  /**
   * Return the handler state for a given instruction type.
   */
  stateFor(type: Opcode): AssemblerState {
    switch (type) {
    case Opcode.IF:
      return this.stateIf;
    case Opcode.MACRO:
    case Opcode.STRUCT:
      return this.stateBlock;
    case Opcode.OR_PREDICATE:
      return this.stateOrPredicate;
    case Opcode.PREDICATE:
      return this.statePredicate;
    case Opcode.REPEATED:
      return this.stateRepeated;
    case Opcode.ROOT:
      return this.stateRoot;
    case Opcode.SECTION:
      return this.stateSection;
    default:
      throw new Error(JSON.stringify(nonBlockState(type)));
    }
  }

  /**
   * Append to the current instruction's consequent block.
   */
  addConsequent(inst: Instruction): void {
    (this.current as unknown as CompositeInstruction).addConsequent(inst);
  }

  /**
   * Set the alternate branch instruction.
   */
  setAlternate(inst: Instruction): void {
    (this.current as unknown as BlockInstruction).setAlternate(inst);
  }

  /**
   * ALTERNATES_WITH state.
   */
  stateAlternatesWith(type: Opcode, inst: Instruction, push: boolean): AssemblerState {
    if (push) {
      return this.pushConsequent(type, inst);
    }
    switch (type) {
    case Opcode.EOF:
      this.error(eofInBlock(this.current!));
      break;

    case Opcode.ALTERNATES_WITH:
      this.error(notAllowedInBlock(inst, this.current!));
      break;

    case Opcode.OR_PREDICATE:
      this.setAlternate(inst);
      this.current = inst;
      return this.stateOrPredicate;

    case Opcode.END:
      this.setAlternate(inst);
      return this.pop();

    default:
      (this.current as Repeated).setAlternatesWith(inst);
      break;
    }
    return this.stateAlternatesWith;
  }

  /**
   * Block state handles MACRO and STRUCT.
   */
  stateBlock(type: Opcode, inst: Instruction, push: boolean): AssemblerState {
    if (push) {
      return this.pushConsequent(type, inst);
    }
    switch (type) {
    case Opcode.EOF:
      this.error(eofInBlock(this.current!));
      break;

    case Opcode.ALTERNATES_WITH:
    case Opcode.OR_PREDICATE:
      this.error(notAllowedInBlock(inst, this.current!));
      break;

    case Opcode.END:
      // Note: block instructions only have a consequent, no alternate.
      return this.pop();

    default:
      this.addConsequent(inst);
      break;
    }
    return this.stateBlock;
  }

  /**
   * Dead state.
   */
  stateDead(type: Opcode, inst: Instruction, push: boolean): AssemblerState {
    return this.stateDead;
  }

  /**
   * EOF state.
   */
  stateEOF(type: Opcode, inst: Instruction, push: boolean): AssemblerState {
    // Attempting to transition from this state is an error.
    this.error(transitionFromEOF(inst));
    return this.stateDead;
  }

  /**
   * IF state.
   */
  stateIf(type: Opcode, inst: Instruction, push: boolean): AssemblerState {
    if (push) {
      return this.pushConsequent(type, inst);
    }
    switch (type) {
    case Opcode.EOF:
      this.error(eofInBlock(this.current!));
      break;

    case Opcode.ALTERNATES_WITH:
      this.error(notAllowedInBlock(inst, this.current!));
      break;

    case Opcode.END:
      this.setAlternate(inst);
      return this.pop();

    case Opcode.OR_PREDICATE:
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
   * OR_PREDICATE state.
   */
  stateOrPredicate(type: Opcode, inst: Instruction, push: boolean): AssemblerState {
    if (push) {
      return this.pushConsequent(type, inst);
    }
    switch (type) {
    case Opcode.EOF:
      this.error(eofInBlock(this.current!));
      break;

    case Opcode.ALTERNATES_WITH:
      this.error(notAllowedInBlock(inst, this.current!));
      break;

    case Opcode.END:
      this.setAlternate(inst);
      return this.pop();

    case Opcode.OR_PREDICATE: {
      // Any OR following another OR that has no predicate is dead code.
      const parentType = getType(this.current!);
      if (parentType === Opcode.OR_PREDICATE && !(this.current as OrPredicate).hasPredicate()) {
        this.error(deadCode(inst));
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
  statePredicate(type: Opcode, inst: Instruction, push: boolean): AssemblerState {
    if (push) {
      return this.pushConsequent(type, inst);
    }
    switch (type) {
    case Opcode.EOF:
      this.error(eofInBlock(this.current!));
      break;

    case Opcode.ALTERNATES_WITH:
      this.error(notAllowedInBlock(inst, this.current!));
      break;

    case Opcode.END:
      this.setAlternate(inst);
      return this.pop();

    case Opcode.OR_PREDICATE:
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
  stateRepeated(type: Opcode, inst: Instruction, push: boolean): AssemblerState {
    if (push) {
      return this.pushConsequent(type, inst);
    }
    switch (type) {
    case Opcode.EOF:
      this.error(eofInBlock(this.current!));
      break;

    case Opcode.END:
      this.setAlternate(inst);
      return this.pop();

    case Opcode.OR_PREDICATE:
      this.setAlternate(inst);
      this.current = inst;
      return this.stateOrPredicate;

    case Opcode.ALTERNATES_WITH:
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
  stateRoot(type: Opcode, inst: Instruction, push: boolean): AssemblerState {
    if (push) {
      return this.pushConsequent(type, inst);
    }
    switch (type) {
    case Opcode.EOF:
      this.setAlternate(inst);
      return this.stateEOF;

    case Opcode.END:
    case Opcode.ALTERNATES_WITH:
    case Opcode.OR_PREDICATE:
      this.error(notAllowedAtRoot(inst));
      break;

    default:
      this.addConsequent(inst);
    }
    return this.stateRoot;
  }

  /**
   * SECTION state.
   */
  stateSection(type: Opcode, inst: Instruction, push: boolean): AssemblerState {
    if (push) {
      return this.pushConsequent(type, inst);
    }
    switch (type) {
    case Opcode.EOF:
      this.error(eofInBlock(this.current!));
      break;

    case Opcode.ALTERNATES_WITH:
      this.error(notAllowedInBlock(inst, this.current!));
      break;

    case Opcode.END:
      this.setAlternate(inst);
      return this.pop();

    case Opcode.OR_PREDICATE:
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
