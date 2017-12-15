import { getType } from './instructions';
import { nameOf } from './opcodes';

// TODO: add instruction parse position and type to error messages.

const info = (inst) => {
  const type = getType(inst);
  return nameOf(type);
};


export const PARSER = 'parser';
export const ASSEMBLER = 'assembler';
export const ENGINE = 'engine';

const parser = m => ({ type: PARSER, message: m });
const assembler = m => ({ type: ASSEMBLER, message: m });
const engine = m => ({ type: ENGINE, message: m });

// PARSER



// ASSEMBLER

export const deadCode = (inst) => {
  return assembler(`This ${info(inst)} block will never execute.`);
};

export const eofInBlock = (inst) => {
  return assembler(`Reached EOF in the middle of ${info(inst)}`);
};

export const nonBlockState = (inst) => {
  return assembler(`machine fail: attempt to find state
    for non-block instruction ${nameOf(inst)}`);
};

export const notAllowedInBlock = (inst, parent) => {
  return assembler(`${info(inst)} instruction is not allowed inside ${info(parent)} block.`);
};

export const notAllowedAtRoot = (inst) => {
  return assembler(`Instruction ${info(inst)} not allowed at root`);
};

export const stateEOFNotReached = () => {
  return assembler('Machine never processed EOF, indicating (a) it was never fed an EOF ' +
    '(bad test?) or (b) the state machine has a bug.');
};

export const transitionFromEOF = (inst) => {
  return assembler(`${info(inst)} Attempt to transition from the EOF state. ` +
    'This is either a bug in the state machine or instructions were fed to the state ' +
    'machine after EOF.');
};

export const unclosed = (inst) => {
  return assembler(`Unclosed ${info(inst)}: perhaps an EOF was not fed to the machine? ` +
    'If not, this represents a bug in the state machine.');
}

export const rootPop = () => {
  return assembler('Popped the ROOT instruction off the stack, which should never happen! ' +
    'Possible bug in state machine.');
};


// ENGINE
