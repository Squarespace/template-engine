import Assembler from './assembler';

import {
  ALTERNATES_WITH,
  END,
  META_LEFT,
  META_RIGHT,
  NEWLINE,
  SPACE,
  TAB,
  EOF
} from './opcodes';

import {
  Atom,
  Bindvar,
  Comment,
  If,
  Inject,
  Macro,
  OrPredicate,
  Predicate,
  Repeated,
  Section,
  Struct,
  Text,
  Variable,
} from './instructions';


class CodeBuilder {
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
    this.assembler.accept(ALTERNATES_WITH);
    return this;
  }

  atom(opaque) {
    this.assembler.accept(new Atom(opaque));
    return this;
  }

  bindvar(name, variables, formatters) {
    this.assembler.accept(new Bindvar(name, variables, formatters));
    return this;
  }

  comment(text, multiline) {
    this.assembler.accept(new Comment(text, multiline));
    return this;
  }

  end() {
    this.assembler.accept(END);
    return this;
  }

  eof() {
    this.assembler.accept(EOF);
    return this;
  }

  ifinst(operators, variables) {
    this.assembler.accept(new If(operators, variables));
    return this;
  }

  inject(name, path) {
    this.assembler.accept(new Inject(name, path));
    return this;
  }

  macro(name) {
    this.assembler.accept(new Macro(name));
    return this;
  }

  metaLeft() {
    this.assembler.accept(META_LEFT);
    return this;
  }

  metaRight() {
    this.assembler.accept(META_RIGHT);
    return this;
  }

  newline() {
    this.assembler.accept(NEWLINE);
    return this;
  }

  or(name, args) {
    this.assembler.accept(new OrPredicate(name, args));
    return this;
  }

  predicate(name, args) {
    this.assembler.accept(new Predicate(name, args));
    return this;
  }

  repeated(name) {
    this.assembler.accept(new Repeated(name));
    return this;
  }

  section(name) {
    this.assembler.accept(new Section(name));
    return this;
  }

  space() {
    this.assembler.accept(SPACE);
    return this;
  }

  struct(opaque) {
    this.assembler.accept(new Struct(opaque));
    return this;
  }

  tab() {
    this.assembler.accept(TAB);
    return this;
  }

  text(name) {
    this.assembler.accept(new Text(name));
    return this;
  }

  variable(variables, formatters) {
    this.assembler.accept(new Variable(variables, formatters));
    return this;
  }

}

export default CodeBuilder;
