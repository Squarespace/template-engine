import * as errors from './errors';
import { nameOf } from './opcodes';
import { Formatter, Predicate } from './plugin';
import { isTruthy } from './util';

/**
 * Resolve one or more variables against the context. Accepts a raw list of
 * variable names (e.g. ['foo.bar', 'baz.quux']), splits each info parts
 * (.e.g. [['foo', 'bar'], ['baz', 'quux']]), resolves them against the
 * context, and wraps in a Variable instance.
 */
const resolveVariables = (rawlist, ctx) => {
  const result = new Array(rawlist.length);
  const size = rawlist.length;
  for (let i = 0; i < size; i++) {
    const names = rawlist[i];
    result[i] = ctx.newVariable(names, ctx.resolve(names, ctx.frame));
  }
  return result;
};


/**
 * Apply formatters to the list of vars.
 */
const applyFormatters = (formatters, calls, vars, ctx) => {
  const len = calls.length;
  for (let i = 0; i < len; i++) {
    const call = calls[i];
    const name = call[0];
    const formatter = formatters[name];
    // TODO: Undefined formatters currently do not raise an error.
    if (!formatter || !(formatter instanceof Formatter)) {
      ctx.error();
      continue;
    }
    const args = call.length === 1 ? [] : call[1];
    formatter.apply(args, vars, ctx);
  }
};


/**
 * Engine that evaluates a tree of instructions and appends output to
 * the given context. All state for a single execution is maintained
 * in the Context, so a single Engine instance can be reused for
 * multiple concurrent compiles.
 */
class Engine {

  constructor({ formatters = {}, predicates = {}} = {}) {
    this.formatters = formatters;
    this.predicates = predicates;

    // Instruction implementations are at linear offsets corresponding
    // to their opcode number, e.g. TEXT == 0, VARIABLE == 1, ...
    this.impls = [
      (inst, ctx) => ctx.append(inst[1]), // TEXT
      this.executeVariable,
      this.executeSection,
      null, // END
      this.executeRepeated, // REPEATED
      this.executePredicate, // PREDICATE
      this.executeBindvar, // BINDVAR
      this.executePredicate, // OR_PREDICATE
      this.executeIf, // IF
      this.executeInject, // INJECT
      this.executeMacro, // MACRO
      null, // COMMENT
      (inst, ctx) => ctx.append('{'), // META_LEFT
      (inst, ctx) => ctx.append('}'), // META_RIGHT
      (inst, ctx) => ctx.append('\n'), // NEWLINE
      (inst, ctx) => ctx.append(' '), // SPACE
      (inst, ctx) => ctx.append('\t'), // TAB
      this.executeRoot, // ROOT
      null, // EOF
      null, // ALTERNATES_WITH
      (inst, ctx) => this.executeBlock(inst[2], ctx), // STRUCT
      null, // ATOM
    ];
  }

  /**
   * Looks up an opcode and executes the corresponding instruction.
   */
  execute(inst, ctx) {
    const opcode = typeof inst === 'number' ? inst : inst[0];
    try {
      const impl = this.impls[opcode];
      if (impl) {
        impl.call(this, inst, ctx);
      }
    } catch (e) {
      ctx.error(errors.unexpectedError(e.name, nameOf(opcode), e.message));
    }
  }

  /**
   * Executes the root instruction.
   */
  executeRoot(inst, ctx) {
    ctx.version = inst[1];
    ctx.engine = this;
    this.executeBlock(inst[2], ctx);
  }

  /**
   * Execute a block of instructions.
   */
  executeBlock(block, ctx) {
    if (!Array.isArray(block)) {
      return;
    }
    const size = block.length;
    for (let i = 0; i < size; i++) {

      // Inlined execute() to save a stack frame.
      const inst = block[i];
      const opcode = typeof inst === 'number' ? inst : inst[0];
      const impl = this.impls[opcode];
      if (impl) {
        impl.call(this, inst, ctx);
      }
    }
  }

  /**
   * Variable instruction.
   *
   * inst[1]  - list of variable names ['foo.bar', 'baz.quux']
   * inst[2]  - list of formatters with optional arguments [["html"], ["truncate", "10"]]
   */
  executeVariable(inst, ctx) {
    const vars = resolveVariables(inst[1], ctx);
    applyFormatters(this.formatters, inst[2], vars, ctx);
    ctx.emit(vars);
  }

  /**
   * Section instruction.
   *
   * inst[1]  - single variable name 'foo.bar'
   * inst[2]  - consequent block
   * inst[3]  - alternate instruction
   */
  executeSection(inst, ctx) {
    const names = inst[1];
    ctx.pushSection(names);
    const node = ctx.node();
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
    const names = inst[1];
    ctx.pushSection(names);
    const alternatesWith = inst[4];
    if (ctx.initIteration()) {
      const frame = ctx.frame();
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
      ctx.pop();

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
        const args = inst[2];
        result = impl.apply(args === 0 ? [] : args, ctx);
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
    const vars = resolveVariables(inst[2], ctx);

    applyFormatters(this.formatters, inst[3], vars, ctx);
    ctx.setVar(name, vars[0]);
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
    const vars = resolveVariables(inst[2], ctx);
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
    // const args = inst[3] - arguments ignored for now
    const node = ctx.getInjectable(path);
    ctx.setVar(name, ctx.newVariable(name, node));
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

}

export default Engine;
