
import Assembler from './assembler';
import Context from './context';
import Engine from './engine';
import { EOF, ROOT } from './opcodes';
import Parser from './parser';
import { Formatters, Predicates } from './plugins';


const EMPTY_CODE = [ROOT, 1, [], EOF];

/**
 * High level interface for parsing and executing templates.
 */
class Compiler {

  constructor({ formatters = Formatters, predicates = Predicates } = {}) {
    this.engine = new Engine({ formatters, predicates });
  }

  /**
   * Parse the template and return the instruction tree.
   */
  parse(source) {
    const assembler = new Assembler();
    const parser = new Parser(source, assembler);
    parser.parse();
    return {
      code: assembler.code(),
      errors: assembler.errors
    };
  }

  /**
   * Execute a template against the given node.
   */
  execute({ code = EMPTY_CODE, json = {}, partials = {}, injects = {}, cldr = undefined } = {}) {
    let errors = [];

    if (typeof code === 'string') {
      ({ code, errors } = this.parse(code));
    }

    const ctx = new Context(json, { cldr, partials, injects });
    ctx.parsefunc = (raw) => this.parse(raw);
    this.engine.execute(code, ctx);

    errors.splice(errors.length, 0, ...ctx.errors);

    return { ctx, errors };
  }

}

export default Compiler;
