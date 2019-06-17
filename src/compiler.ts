import { CLDR } from '@phensley/cldr';

import { Assembler } from './assembler';
import { Context, Partials } from './context';
import { Engine, EngineProps } from './engine';
import { TemplateError } from './errors';
import { Opcode } from './opcodes';
import { Parser } from './parser';
import { Code } from './instructions';
import { Formatters, Predicates } from './plugins';

const EMPTY_CODE: Code = [Opcode.ROOT, 1, [], Opcode.EOF];

export interface CompilerProps extends EngineProps {}

export type InjectsMap = { [path: string]: any };

export interface ExecuteProps {
  code: string | Code;
  json?: any;
  partials?: Partials;
  injects?: InjectsMap;
  cldr?: CLDR;
}

const DefaultExecuteProps = {
  code: EMPTY_CODE,
  json: {},
  partials: {},
  injects: {}
};

/**
 * High level interface for parsing and executing templates.
 */
export class Compiler {

  private engine: Engine;

  constructor(private props: CompilerProps = { formatters: Formatters, predicates: Predicates }) {
    this.engine = new Engine(props);
  }

  /**
   * Parse the template and return the instruction tree.
   */
  parse(source: string) {
    const { formatters, predicates } = this.props;
    const assembler = new Assembler();
    const parser = new Parser(source, assembler, undefined, formatters, predicates);
    parser.parse();
    return {
      code: assembler.code(),
      errors: assembler.errors
    };
  }

  // { code = EMPTY_CODE, json = {}, partials = {}, injects = {} } = {}
  /**
   * Execute a template against the given node.
   */
  execute(props: ExecuteProps = DefaultExecuteProps) {
    let code: string | Code = props.code;
    const { cldr, json, partials, injects } = props;
    let errors: TemplateError[] = [];

    if (typeof code === 'string') {
      ({ code, errors } = this.parse(code));
    }

    const ctx = new Context(json, { cldr, partials, injects });
    ctx.parsefunc = (raw: string) => this.parse(raw);
    this.engine.execute(code, ctx);

    errors.splice(errors.length, 0, ...ctx.errors);

    return { ctx, errors };
  }

}
