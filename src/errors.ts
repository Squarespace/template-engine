import { Instruction, getType } from './instructions';
import { Opcode, nameOf } from './opcodes';

// TODO: add instruction parse position and type to error messages.

const info = (inst: Instruction | Opcode) => {
  const op = getType(inst);
  return nameOf(op);
};

export type ErrorType = 'parser' | 'assembler' | 'engine';

export interface TemplateError {
  type: ErrorType;
  message: string;
}

const parser = (m: string): TemplateError =>
  ({ type: 'parser', message: `SyntaxError: ${m}` });

const assembler = (m: string): TemplateError =>
  ({ type: 'assembler', message: `SyntaxError: ${m}` });

const engine = (m: string): TemplateError =>
  ({ type: 'engine', message: `RuntimeError: ${m}` });

// PARSER

export const formatterUnknown = (name: string) =>
    parser(`Formatter '${name}' is unknown`);

export const predicateUnknown = (name: string) =>
    parser(`Predicate '${name}' is unknown`);

// ASSEMBLER

export const deadCode = (inst: Instruction) =>
    assembler(`This ${info(inst)} block will never execute.`);

export const eofInBlock = (inst: Instruction) =>
    assembler(`Reached EOF in the middle of ${info(inst)}`);

export const nonBlockState = (type: Opcode) =>
    assembler(`machine fail: attempt to find state for non-block instruction ${nameOf(type)}`);

export const notAllowedInBlock = (inst: Instruction, parent: Instruction) =>
    assembler(`${info(inst)} instruction is not allowed inside ${info(parent)} block.`);

export const notAllowedAtRoot = (inst: Instruction | Opcode) =>
    assembler(`Instruction ${info(inst)} not allowed at root`);

export const stateEOFNotReached = () =>
    assembler('Machine never processed EOF, indicating (a) it was never fed an EOF ' +
      '(bad test?) or (b) the state machine has a bug.');

export const transitionFromEOF = (inst: Instruction | Opcode) =>
    assembler(`${info(inst)} Attempt to transition from the EOF state. ` +
      'This is either a bug in the state machine or instructions were fed to the state ' +
      'machine after EOF.');

export const unclosed = (inst: Instruction) =>
    assembler(`Unclosed ${info(inst)}: perhaps an EOF was not fed to the machine? ` +
      'If not, this represents a bug in the state machine.');

export const rootPop = () =>
    assembler('Popped the ROOT instruction off the stack, which should never happen! ' +
      'Possible bug in state machine.');

// ENGINE

export const partialMissing = (name: string) =>
    engine(`Attempt to apply partial '${name}' which could not be found.`);

export const partialParseFail = (name: string, msg: string) =>
    engine(`Parse of partial "${name}" failed: ${msg}`);

export const partialRecursion = (name: string, limit: number) =>
    engine(`Attempt to apply partial '${name}' exceeded maximum recursion depth of ${limit}`);

export const partialSelfRecursion = (name: string) =>
    engine(`Recursion into self while evaluating partial '${name}`);

export const generalError = (name: string, msg: string) =>
    engine(`Default error ${name}: ${msg}`);

export const unexpectedError = (type: string, opcode: string, message: string) =>
    engine(`Unexpected ${type} error when executing ${opcode}: ${message}`);
