
import Assembler from './assembler';
import Context from './context';
import Engine from './engine';
import Parser from './parser';
import { EOF, ROOT } from './opcodes';
import Formatters from './formatters';
import Predicates from './predicates';


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
  execute({ code = EMPTY_CODE, json = {} } = {}) {
    let errors = [];

    // TODO: unify parse, assembly and execution error arrays

    if (typeof code === 'string') {
      ({ code, errors } = this.parse(code));
    }

    const ctx = new Context(json);
    this.engine.execute(code, ctx);

    // TODO: splice execution errors to the end of the errors array

    return { ctx, errors };
  }

}

export default Compiler;
