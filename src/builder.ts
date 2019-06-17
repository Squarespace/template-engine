import { Assembler } from './assembler';
import { Opcode as O } from './opcodes';

import {
  Atom,
  Bindvar,
  Comment,
  FormatterCall,
  FAST_NULL,
  If,
  Inject,
  Macro,
  Operator,
  OrPredicate,
  Predicate,
  Reference,
  Repeated,
  Root,
  Section,
  Struct,
  Text,
  Variable,
} from './instructions';
import { TemplateError } from './errors';

export interface CodeBuilderResult {
  assembler: Assembler;
  root: Root;
  errors: TemplateError[];
}

export class CodeBuilder {
  private assembler: Assembler;

  constructor() {
    this.assembler = new Assembler();
  }

  /**
   * Finish building and return the assembler.
   */
  get(): CodeBuilderResult {
    return {
      assembler: this.assembler,
      root: this.assembler.root,
      errors: this.assembler.errors
    };
  }

  alternatesWith(): CodeBuilder {
    this.assembler.accept(O.ALTERNATES_WITH);
    return this;
  }

  atom(opaque: any): CodeBuilder {
    this.assembler.accept(new Atom(opaque));
    return this;
  }

  bindvar(name: string, variables: any[], formatters?: any[]): CodeBuilder {
    this.assembler.accept(new Bindvar(name, variables, formatters));
    return this;
  }

  comment(text: string, multiline: number | boolean = 0): CodeBuilder {
    this.assembler.accept(new Comment(text, multiline));
    return this;
  }

  end(): CodeBuilder {
    this.assembler.accept(O.END);
    return this;
  }

  eof(): CodeBuilder {
    this.assembler.accept(O.EOF);
    return this;
  }

  ifinst(operators: Operator[], variables: Reference[]): CodeBuilder {
    this.assembler.accept(new If(operators, variables));
    return this;
  }

  inject(name: string, path: string): CodeBuilder {
    this.assembler.accept(new Inject(name, path));
    return this;
  }

  macro(name: string): CodeBuilder {
    this.assembler.accept(new Macro(name));
    return this;
  }

  metaLeft(): CodeBuilder {
    this.assembler.accept(O.META_LEFT);
    return this;
  }

  metaRight(): CodeBuilder {
    this.assembler.accept(O.META_RIGHT);
    return this;
  }

  newline(): CodeBuilder {
    this.assembler.accept(O.NEWLINE);
    return this;
  }

  or(name?: string, args?: string[] | FAST_NULL): CodeBuilder {
    this.assembler.accept(new OrPredicate(name, args));
    return this;
  }

  predicate(name: string, args: string[] | FAST_NULL = FAST_NULL): CodeBuilder {
    this.assembler.accept(new Predicate(name, args));
    return this;
  }

  repeated(name: Reference): CodeBuilder {
    this.assembler.accept(new Repeated(name));
    return this;
  }

  section(name: Reference): CodeBuilder {
    this.assembler.accept(new Section(name));
    return this;
  }

  space(): CodeBuilder {
    this.assembler.accept(O.SPACE);
    return this;
  }

  struct(opaque: any): CodeBuilder {
    this.assembler.accept(new Struct(opaque));
    return this;
  }

  tab(): CodeBuilder {
    this.assembler.accept(O.TAB);
    return this;
  }

  text(text: string): CodeBuilder {
    this.assembler.accept(new Text(text));
    return this;
  }

  variable(variables: Reference[], formatters: FormatterCall[]): CodeBuilder {
    this.assembler.accept(new Variable(variables, formatters));
    return this;
  }

}
