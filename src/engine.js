import Formatters from './formatters';
import { Formatter, Predicate } from './plugin';
import Predicates from './predicates';
import * as OP from './opcodes';
import types from './types';
import { splitVariable, isTruthy } from './util';
import Variable from './variable';

const defaultProps = {
  formatters: Formatters,
  predicates: Predicates,
};

/**
 * Engine that evaluates a tree of instructions and appends output to
 * the given context.
 */
class Engine {

  constructor({ formatters, predicates } = defaultProps) {
    this.formatters = formatters || {};
    this.predicates = predicates || {};
  }

  /*eslint complexity: ["error", 30]*/
  execute(inst, ctx) {
    const opcode = Array.isArray(inst) ? inst[0] : inst;
    switch (opcode) {

    // COMPOSITE INSTRUCTIONS

    case OP.ROOT:
      ctx.version = inst[1];
      ctx.engine = this;
      this.executeBlock(inst[2], ctx);
      break;

    case OP.TEXT:
      ctx.append(inst[1]);
      break;

    case OP.VARIABLE:
      this.executeVariable(inst, ctx);
      break;

    case OP.SECTION:
      this.executeSection(inst, ctx);
      break;

    case OP.REPEATED:
      this.executeRepeated(inst, ctx);
      break;

    case OP.PREDICATE:
    case OP.OR_PREDICATE:
      this.executePredicate(inst, ctx);
      break;

    case OP.BINDVAR:
      this.executeBindvar(inst, ctx);
      break;

    case OP.IF:
      this.executeIf(inst, ctx);
      break;

    case OP.INJECT:
      this.executeInject(inst, ctx);
      break;

    case OP.MACRO:
      this.executeMacro(inst, ctx);
      break;

    // ATOMIC INSTRUCTIONS

    case OP.META_LEFT:
      ctx.append('{');
      break;

    case OP.META_RIGHT:
      ctx.append('}');
      break;

    case OP.NEWLINE:
      ctx.append('\n');
      break;

    case OP.SPACE:
      ctx.append(' ');
      break;

    case OP.TAB:
      ctx.append('\t');
      break;

    // IGNORED INSTRUCTIONS

    case OP.COMMENT:
    case OP.EOF:
    case OP.END:
    case OP.NOOP:
    default:
      break;
    }
  }

  /**
   * Execute a block of instructions.
   */
  executeBlock(block, ctx) {
    // The value 0 is used as a fast null, to save space when defining empty blocks.
    if (block === 0 || !Array.isArray(block)) {
      return;
    }
    const size = block.length;
    for (let i = 0; i < size; i++) {
      this.execute(block[i], ctx);
    }
  }

  /**
   * Variable instruction.
   *
   * inst[1]  - list of variable names ['foo.bar', 'baz.quux']
   * inst[2]  - list of formatters with optional arguments [["html"], ["truncate", "10"]]
   */
  executeVariable(inst, ctx) {
    const vars = this.resolveVariables(inst[1], ctx);
    this.applyFormatters(inst[2], vars, ctx);
    if (ctx.visitor) {
      ctx.visitor.onVariable(vars[0], ctx);
    }
    this.emit(vars, ctx);
  }

  /**
   * Section instruction.
   *
   * inst[1]  - single variable name 'foo.bar'
   * inst[2]  - consequent block
   * inst[3]  - alternate instruction
   */
  executeSection(inst, ctx) {
    const name = inst[1];
    const names = splitVariable(name);
    ctx.pushNames(names);
    const node = ctx.node();

    if (ctx.visitor) {
      ctx.visitor.onSection(name, ctx);
    }
    if (isTruthy(node)) {
      this.executeBlock(inst[2], ctx);
    } else {
      this.execute(inst[3], ctx);
    }
    ctx.pop();
  }

  /**
   * Repeated section instruction.
   *
   * inst[1]  - single variable name 'foo.bar'
   * inst[2]  - consequent block
   * inst[3]  - alternate instruction
   * inst[4]  - alternates-with block
   */
  executeRepeated(inst, ctx) {
    const names = splitVariable(inst[1]);
    ctx.pushNames(names);
    const alternatesWith = inst[4];
    if (ctx.initIteration()) {
      const frame = ctx.frame;
      const len = ctx.node().value.length;
      const lastIndex = len - 1;
      while (frame.currentIndex < len) {
        ctx.pushNext();
        this.executeBlock(inst[2], ctx);
        if (alternatesWith !== 0 && frame.currentIndex < lastIndex) {
          this.executeBlock(alternatesWith, ctx);
        }
        ctx.pop();
        frame.currentIndex++;
      }
    } else {
      ctx.pop();
      this.execute(inst[3], ctx);
    }
  }

  /**
   * Predicate instruction.
   *
   * inst[1]  - predicate name, or 0 if none.
   * inst[2]  - predicate args, or 0 if none
   * inst[3]  - consequent block
   * inst[4]  - alternate instruction
   */
  executePredicate(inst, ctx) {
    const name = inst[1];
    const consequent = inst[3];
    if (name === 0) {
      // If there is no predicate implementation, just execute the consequent.
      this.executeBlock(consequent, ctx);
    } else {
      // If predicate is not found, we just assume 'false' for now.
      const impl = this.predicates[name];
      let result = false;
      if (impl instanceof Predicate) {
        result = impl.apply(inst[2], ctx);
      }
      if (result) {
        this.executeBlock(consequent, ctx);
      } else {
        this.execute(inst[4], ctx);
      }
    }
  }

  /**
   * Bindvar instruction.
   *
   * inst[1]  - variable to define, e.g. '@foo'
   * inst[2]  - list of variable(s) to resolve
   * inst[3]  - list of formatters with optional arguments
   */
  executeBindvar(inst, ctx) {
    const name = inst[1];
    const vars = this.resolveVariables(inst[2], ctx);
    this.applyFormatters(inst[3], vars, ctx);
    if (ctx.visitor) {
      ctx.visitor.onBindvar(name, vars[0], ctx);
    }
    ctx.setVar(inst[1], vars[0].node);
  }

  /**
   * If instruction.
   *
   * inst[1]  - array of operators (0=OR 1=AND)
   * inst[2]  - array of variables
   * inst[3]  - consequent block
   * inst[4]  - alternate instruction
   */
  executeIf(inst, ctx) {
    const operators = inst[1];
    const vars = this.resolveVariables(inst[2], ctx);
    const len = vars.length;

    // Compute the boolean value of the operators. This is a legacy
    // instruction that has no operator binding order, so the results
    // can be a bit odd.
    let result = isTruthy(vars[0].node);
    for (let i = 1; i < len; i++) {
      const value = isTruthy(vars[i].node);
      const op = operators[i - 1];

      // 0=OR  1=AND
      result = op === 1 ? result && value : result || value;

      // Short circuit
      if (op === 0) {
        if (result) {
          break;
        }
      } else if (!result) {
        break;
      }
    }

    if (result) {
      this.executeBlock(inst[3], ctx);
    } else {
      this.execute(inst[4], ctx);
    }
  }

  /**
   * Inject instruction.
   *
   * inst[1]  - variable to define, e.g. '@foo'
   * inst[2]  - file path to resolve (key in the injectables map)
   * inst[3]  - optional arguments (currently unused)
   */
  executeInject(inst, ctx) {
    const name = inst[1];
    const path = inst[2];
    // const args = inst[3] - ignored for now
    const node = ctx.getInjectable(path);
    ctx.setVar(name, node);
  }

  /**
   * Macro instruction.
   *
   * inst[1]  - name of the macro
   * inst[2]  - block of instructions to execute
   */
  executeMacro(inst, ctx) {
    const name = inst[1];
    const block = inst[2];
    ctx.setMacro(name, block);
  }

  /**
   * Apply formatters to the list of vars.
   */
  applyFormatters(calls, vars, ctx) {
    const len = calls.length;
    for (let i = 0; i < len; i++) {
      const call = calls[i];
      const name = call[0];
      const formatter = this.formatters[name];
      // Undefined formatters currently do not raise an error.
      if (!formatter || !(formatter instanceof Formatter)) {
        continue;
      }
      const args = call.length === 1 ? [] : call[1];
      formatter.apply(args, vars, ctx);
    }
  }

  /**
   * Emit a variable into the output.
   */
  emit(vars, ctx) {
    const first = vars[0].node;
    switch (first.type) {
    case types.NUMBER:
    case types.STRING:
    case types.BOOLEAN:
    case types.NULL:
      ctx.append(first.value);
      break;
    }
  }

  /**
   * Resolve one or more variables against the context. Accepts a raw list of
   * variable names (e.g. ['foo.bar', 'baz.quux']), splits each info parts
   * (.e.g. [['foo', 'bar'], ['baz', 'quux']]), resolves them against the
   * context, and wraps in a Variable instance.
   */
  resolveVariables(rawlist, ctx) {
    return rawlist.map(r => {
      const names = splitVariable(r);
      return new Variable(r, ctx.resolve(names, ctx.frame));
    });
  }
}

export default Engine;
