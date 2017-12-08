import { getType } from './instructions';
import { nameOf } from './opcodes';

// TODO: add instruction parse position and type to error messages.

const info = (inst) => {
  const type = getType(inst);
  return nameOf(type);
}

export const deadCode = (inst) => {
  return `This ${info(inst)} block will never execute.`;
};

export const eofInBlock = (inst) => {
  return `Reached EOF in the middle of ${info(inst)}`;
};

export const nonBlockState = (inst) => {
  return `machine fail: attempt to find state for non-block instruction ${nameOf(inst)}`;
};

export const notAllowedInBlock = (inst, parent) => {
  return `${info(inst)} instruction is not allowed inside ${info(parent)} block.`;
};

export const notAllowedAtRoot = (inst) => {
  return `Instruction ${info(inst)} not allowed at root`;
};

export const stateEOFNotReached = () => {
  return `Machine never processed EOF, indicating (a) it was never fed an EOF
    (bad test?) or (b) the state machine has a bug.`;
};

export const transitionFromEOF = (inst) => {
  return `${info(inst)} Attempt to transition from the EOF state.
    This is either a bug in the state machine or instructions were fed to the state machine
    after EOF.`;
};

export const unclosed = (inst) => {
  return `Unclosed ${info(inst)}: perhaps an EOF was not fed to the machine?
    If not, this represents a bug in the state machine.`;
}

export const rootPop = () => {
  return `Popped the ROOT instruction off the stack, which should never happen!
    Possible bug in state machine.`;
};
