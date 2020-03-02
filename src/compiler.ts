import { CLDR } from '@phensley/cldr-core';

import { Assembler } from './assembler';
import { Context, Partials } from './context';
import { Engine, EngineProps } from './engine';
import { TemplateError } from './errors';
import { Opcode } from './opcodes';
import { matcherImpl, Parser } from './parser';
import { Code } from './instructions';
import { Formatters, Predicates } from './plugins';
import { Matcher } from './matcher';

const EMPTY_CODE: Code = [Opcode.ROOT, 1, [], Opcode.EOF];

export interface CompilerProps extends EngineProps { }

export type InjectsMap = { [path: string]: any };

export interface ExecuteProps {
  code: string | Code;
  json?: any;
  partials?: Partials;
  injects?: InjectsMap;
  cldr?: CLDR;
  now?: number;
}

export interface ParseResult {
  code: Code;
  errors: TemplateError[];
}

export interface ExecuteResult {
  ctx: Context;
  errors: TemplateError[];
}

const DefaultExecuteProps = {
  code: EMPTY_CODE,
  json: {},
  partials: {},
  injects: {}
};

export interface ParseResult {
  code: Code;
  errors: TemplateError[];
}

export interface ExecuteResult {
  ctx: Context;
  errors: TemplateError[];
}

/**
 * High level interface for parsing and executing templates.
 */
export class Compiler {

  private engine: Engine;

  // Reuse single instance of Matcher across multiple parses, avoids
  // having to construct regexps on each parse.
  private matcher: Matcher;

  constructor(private props: CompilerProps = { formatters: Formatters, predicates: Predicates }) {
    this.engine = new Engine(props);
    this.matcher = new matcherImpl('');
  }

  /**
   * Parse the template and return the instruction tree.
   */
  parse(source: string): ParseResult {
    const { formatters, predicates } = this.props;
    const assembler = new Assembler();
    const parser = new Parser(source, assembler, this.matcher, formatters, predicates);
    parser.parse();
    return {
      code: assembler.code(),
      errors: assembler.errors
    };
  }

  /**
   * Execute a template against the given node.
   */
  execute(props: ExecuteProps = DefaultExecuteProps): ExecuteResult {
    let code: string | Code = props.code;
    const { cldr, now, json, partials, injects } = props;
    let errors: TemplateError[] = [];

    if (typeof code === 'string') {
      ({ code, errors } = this.parse(code));
    }

    const ctx = new Context(json, { cldr, now, partials, injects });
    ctx.parsefunc = (raw: string) => this.parse(raw);
    this.engine.execute(code, ctx);

    errors.splice(errors.length, 0, ...ctx.errors);

    return { ctx, errors };
  }

}
