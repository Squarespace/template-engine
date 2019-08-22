import { Opcode } from './opcodes';

// Wrappers to simplify wiring up a valid instruction tree.
// Only composite instructions need these wrappers as atomic
// instructions are represented by a single integer.

// Version of this instruction tree.
const VERSION = 1;

// Compact marker for null block.
export type FAST_NULL = 0;
export const FAST_NULL: FAST_NULL = 0;

export const enum Operator {
  OR = 0,
  AND = 1,
}

export type Reference = (string | number)[];

export type FormatterCall = [string] | [string, string[]];

export type Binding = [string, Reference];

export interface AtomCode {
  [0]: Opcode.ATOM;
  [1]: any;
}

export interface BindvarCode {
  [0]: Opcode.BINDVAR;
  [1]: string;
  [2]: any[]; // TODO:
  [3]: FAST_NULL | FormatterCall[];
}

export interface CommentCode {
  [0]: Opcode.COMMENT;
  [1]: string;
  [2]: number;
}

export interface CtxvarCode {
  [0]: Opcode.CTXVAR;
  [1]: string;
  [2]: Binding[];
}

export interface IfCode {
  [0]: Opcode.IF;
  [1]: Operator[];
  [2]: Reference[];
  [3]: Code[];
  [4]: Code | undefined;
}

export interface InjectCode {
  [0]: Opcode.INJECT;
  [1]: string;
  [2]: string;
}

export interface MacroCode {
  [0]: Opcode.MACRO;
  [1]: string;
  [2]: Code[];
}

export interface OrPredicateCode {
  [0]: Opcode.OR_PREDICATE;
  [1]: string | number;
  [2]: string[] | number;
  [3]: Code[];
  [4]: Code | undefined;
}

export interface PredicateCode {
  [0]: Opcode.PREDICATE;
  [1]: string | number;
  [2]: string[] | 0;
  [3]: Code[];
  [4]: Code | undefined;
}

export interface RepeatedCode {
  [0]: Opcode.REPEATED;
  [1]: Reference;
  [2]: Code[]; // consequent block
  [3]: Code; // alternate instruction
  [4]: Code[]; // alternates-with block
}

export interface RootCode {
  [0]: Opcode.ROOT;
  [1]: number; // code version
  [2]: Code[]; // consequent block
  [3]: Code; // alternate instruction
}

export interface SectionCode {
  [0]: Opcode.SECTION;
  [1]: Reference;
  [2]: Code[]; // consequent block
  [3]: Code; // alternate instruction
}

export interface StructCode {
  [0]: Opcode.STRUCT;
  [1]: any; // opaque value
  [2]: Code[]; // children
}

export interface TextCode {
  [0]: Opcode.TEXT;
  [1]: string;
}

export interface VariableCode {
  [0]: Opcode.VARIABLE;
  [1]: Reference[];
  [2]: FAST_NULL | FormatterCall[];
}

export type Code =
  | AtomCode
  | BindvarCode
  | CommentCode
  | CtxvarCode
  | IfCode
  | InjectCode
  | MacroCode
  | OrPredicateCode
  | PredicateCode
  | RepeatedCode
  | RootCode
  | SectionCode
  | StructCode
  | TextCode
  | VariableCode

  // single-byte opcodes
  | Opcode.ALTERNATES_WITH
  | Opcode.END
  | Opcode.EOF
  | Opcode.META_LEFT
  | Opcode.META_RIGHT
  | Opcode.NEWLINE
  | Opcode.SPACE
  | Opcode.TAB

  // placeholder for null blocks
  | FAST_NULL
  ;

const empty = (): Code[] => [];

export class BaseInstruction {
  constructor(readonly type: Opcode, readonly code: Code) { }
}

export type Instruction =
  | Opcode.ALTERNATES_WITH
  | Opcode.END
  | Opcode.EOF
  | Opcode.META_LEFT
  | Opcode.META_RIGHT
  | Opcode.NEWLINE
  | Opcode.SPACE
  | Opcode.TAB
  | BaseInstruction
  ;

export interface CompositeInstruction {
  addConsequent(inst: Instruction): void;
}

export interface BlockInstruction extends CompositeInstruction {
  setAlternate(inst: Instruction): void;
}

export const getType = (inst: Instruction | Opcode) => {
  return inst instanceof BaseInstruction ? inst.type : inst;
};

export const getCode = (inst: Instruction) =>
  inst instanceof BaseInstruction ? inst.code : inst;

export const orNull = (v?: any[]) => v === undefined ? FAST_NULL : v;

/**
 * Holds a JSON-encodable, opaque value.
 */
export class Atom extends BaseInstruction {
  constructor(opaque: any) {
    super(Opcode.ATOM, [Opcode.ATOM, opaque]);
  }
}

export class Bindvar extends BaseInstruction {
  constructor(name: string, variables: any[], formatters?: any[]) {
    super(Opcode.BINDVAR, [Opcode.BINDVAR, name, variables, orNull(formatters)]);
  }
}

export class Comment extends BaseInstruction {
  constructor(text: string, multiline: number | boolean) {
    super(Opcode.COMMENT, [Opcode.COMMENT, text, multiline ? 1 : 0]);
  }
}

export class Ctxvar extends BaseInstruction {
  constructor(name: string, bindings: Binding[]) {
    super(Opcode.CTXVAR, [Opcode.CTXVAR, name, bindings]);
  }
}

export class If extends BaseInstruction implements BlockInstruction {
  constructor(operators: Operator[], variables: Reference[]) {
    super(Opcode.IF, [Opcode.IF, operators, variables, [], undefined]);
  }

  addConsequent(inst: Instruction): void {
    (this.code as IfCode)[3].push(getCode(inst));
  }

  setAlternate(inst: Instruction): void {
    (this.code as IfCode)[4] = getCode(inst);
  }
}

export class Inject extends BaseInstruction {
  constructor(name: string, path: string) {
    super(Opcode.INJECT, [Opcode.INJECT, name, path, FAST_NULL]);
  }
}

export class Macro extends BaseInstruction implements CompositeInstruction {
  constructor(name: string) {
    super(Opcode.MACRO, [Opcode.MACRO, name, []]);
  }

  addConsequent(inst: Instruction): void {
    (this.code as MacroCode)[2].push(getCode(inst));
  }
}

export class OrPredicate extends BaseInstruction {
  constructor(name?: string | number, args?: string[] | FAST_NULL) {
    super(Opcode.OR_PREDICATE,
      [Opcode.OR_PREDICATE, name ? name : 0, args ? args : FAST_NULL, empty(), undefined]);
  }

  hasPredicate(): boolean {
    return (this.code as OrPredicateCode)[1] !== FAST_NULL;
  }

  addConsequent(inst: Instruction): void {
    (this.code as OrPredicateCode)[3].push(getCode(inst));
  }

  setAlternate(inst: Instruction): void {
    (this.code as OrPredicateCode)[4] = getCode(inst);
  }
}

export class Predicate extends BaseInstruction implements BlockInstruction {
  constructor(name: string, args: string[] | FAST_NULL) {
    super(Opcode.PREDICATE,
      [Opcode.PREDICATE, name, args, [], undefined]);
  }

  addConsequent(inst: Instruction): void {
    (this.code as PredicateCode)[3].push(getCode(inst));
  }

  setAlternate(inst: Instruction): void {
    (this.code as PredicateCode)[4] = getCode(inst);
  }
}

export class Repeated extends BaseInstruction implements BlockInstruction {
  constructor(name: Reference) {
    super(Opcode.REPEATED, [Opcode.REPEATED, name, [], Opcode.END, []]);
  }

  addConsequent(inst: Instruction): void {
    (this.code as RepeatedCode)[2].push(getCode(inst));
  }

  setAlternate(inst: Instruction): void {
    (this.code as RepeatedCode)[3] = getCode(inst);
  }

  setAlternatesWith(inst: Instruction): void {
    (this.code as RepeatedCode)[4].push(getCode(inst));
  }
}

export class Root extends BaseInstruction implements BlockInstruction {
  constructor() {
    super(Opcode.ROOT, [Opcode.ROOT, VERSION, [], Opcode.END]);
  }

  addConsequent(inst: Instruction): void {
    (this.code as RootCode)[2].push(getCode(inst));
  }

  setAlternate(inst: Instruction): void {
    (this.code as RootCode)[3] = getCode(inst);
  }
}

export class Section extends BaseInstruction implements BlockInstruction {
  constructor(name: Reference) {
    super(Opcode.SECTION, [Opcode.SECTION, name, [], Opcode.END]);
  }

  addConsequent(inst: Instruction): void {
    (this.code as SectionCode)[2].push(getCode(inst));
  }

  setAlternate(inst: Instruction): void {
    (this.code as SectionCode)[3] = getCode(inst);
  }
}

/**
 * Generic block that does nothing but hold a JSON-encodable, opaque value and an
 * array of child nodes.
 */
export class Struct extends BaseInstruction implements CompositeInstruction {

  constructor(opaque: any) {
    super(Opcode.STRUCT, [Opcode.STRUCT, opaque, []]);
  }

  addConsequent(inst: Instruction): void {
    (this.code as StructCode)[2].push(getCode(inst));
  }
}

export class Text extends BaseInstruction {
  constructor(text: string) {
    super(Opcode.TEXT, [Opcode.TEXT, text]);
  }
}

export class Variable extends BaseInstruction {
  constructor(variables: Reference[], formatters: FormatterCall[]) {
    super(Opcode.VARIABLE, [Opcode.VARIABLE, variables, formatters]);
  }
}
