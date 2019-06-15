import { Assembler } from './assembler';
import { Opcode as O } from './opcodes';

import {
  Atom,
  Bindvar,
  Comment,
  FAST_NULL,
  FormatterCall,
  If,
  Inject,
  Macro,
  Operator,
  OrPredicate,
  Predicate,
  Reference,
  Repeated,
  Section,
  Struct,
  Text,
  Variable,
} from './instructions';


export class CodeBuilder {
  private assembler: Assembler;

  constructor() {
    this.assembler = new Assembler();
  }

  /**
   * Finish building and return the assembler.
   */
  get() {
    return {
      assembler: this.assembler,
      root: this.assembler.root,
      errors: this.assembler.errors
    };
  }

  alternatesWith() {
    this.assembler.accept(O.ALTERNATES_WITH);
    return this;
  }

  atom(opaque: any) {
    this.assembler.accept(new Atom(opaque));
    return this;
  }

  bindvar(name: string, variables: any[], formatters?: any[]) {
    this.assembler.accept(new Bindvar(name, variables, formatters));
    return this;
  }

  comment(text: string, multiline: number | boolean = 0) {
    this.assembler.accept(new Comment(text, multiline));
    return this;
  }

  end() {
    this.assembler.accept(O.END);
    return this;
  }

  eof() {
    this.assembler.accept(O.EOF);
    return this;
  }

  ifinst(operators: Operator[], variables: Reference[]) {
    this.assembler.accept(new If(operators, variables));
    return this;
  }

  inject(name: string, path: string) {
    this.assembler.accept(new Inject(name, path));
    return this;
  }

  macro(name: string) {
    this.assembler.accept(new Macro(name));
    return this;
  }

  metaLeft() {
    this.assembler.accept(O.META_LEFT);
    return this;
  }

  metaRight() {
    this.assembler.accept(O.META_RIGHT);
    return this;
  }

  newline() {
    this.assembler.accept(O.NEWLINE);
    return this;
  }

  or(name?: string, args?: string[] | FAST_NULL) {
    this.assembler.accept(new OrPredicate(name, args));
    return this;
  }

  predicate(name: string, args: string[] | FAST_NULL = FAST_NULL) {
    this.assembler.accept(new Predicate(name, args));
    return this;
  }

  repeated(name: Reference) {
    this.assembler.accept(new Repeated(name));
    return this;
  }

  section(name: Reference) {
    this.assembler.accept(new Section(name));
    return this;
  }

  space() {
    this.assembler.accept(O.SPACE);
    return this;
  }

  struct(opaque: any) {
    this.assembler.accept(new Struct(opaque));
    return this;
  }

  tab() {
    this.assembler.accept(O.TAB);
    return this;
  }

  text(text: string) {
    this.assembler.accept(new Text(text));
    return this;
  }

  variable(variables: Reference[], formatters: FormatterCall[]) {
    this.assembler.accept(new Variable(variables, formatters));
    return this;
  }

}
