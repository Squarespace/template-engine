import { Context } from './context';
import { nameOf, Opcode } from './opcodes';
import {
  BindvarCode,
  Code,
  CtxvarCode,
  FormatterCall,
  IfCode,
  InjectCode,
  MacroCode,
  PredicateCode,
  RepeatedCode,
  RootCode,
  SectionCode,
  StructCode,
  TextCode,
  VariableCode,
} from './instructions';
import { unexpectedError } from './errors';
import { Variable } from './variable';
import { Formatter, Predicate } from './plugin';
import { isTruthy } from './node';

export type FormatterMap = { [x: string]: Formatter };
export type PredicateMap = { [x: string]: Predicate };

type Bindings = { [x: string]: Node };

/**
 * Resolve one or more variables against the context. Accepts a raw list of
 * variable names (e.g. ['foo.bar', 'baz.quux']), splits each info parts
 * (.e.g. [['foo', 'bar'], ['baz', 'quux']]), resolves them against the
 * context, and wraps in a Variable instance.
 */
export const resolveVariables = (rawlist: (string | number)[][], ctx: Context) => {
  const result = new Array(rawlist.length);
  const size = rawlist.length;
  for (let i = 0; i < size; i++) {
    const names = rawlist[i];
    result[i] = ctx.newVariable('', ctx.resolve(names));
  }
  return result;
};

/**
 * Apply formatters to the list of vars.
 */
const applyFormatters = (formatters: FormatterMap, calls: FormatterCall[], vars: Variable[], ctx: Context) => {
  const len = calls.length;
  for (let i = 0; i < len; i++) {
    const call = calls[i];
    const name = call[0];
    const formatter = formatters[name];
    // Undefined formatters will raise an error in the parse phase.
    if (!formatter || !(formatter instanceof Formatter)) {
      continue;
    }
    const args = call.length === 1 ? [] : call[1];
    formatter.apply(args, vars, ctx);
  }
};

type Impl = (inst: Code, ctx: Context) => void;
type Hook = Impl | null;

export interface EngineProps {
  formatters?: FormatterMap;
  predicates?: PredicateMap;
}

/**
 * Engine that evaluates a tree of instructions and appends output to
 * the given context. All state for a single execution is maintained
 * in the Context, so a single Engine instance can be reused for
 * multiple concurrent compiles.
 */
export class Engine {

  impls: Hook[];
  private formatters: FormatterMap;
  private predicates: PredicateMap;

  constructor(props: EngineProps = {}) {
    this.formatters = props.formatters || {};
    this.predicates = props.predicates || {};

    // Instruction implementations are at linear offsets corresponding
    // to their opcode number, e.g. TEXT == 0, VARIABLE == 1, ...
    this.impls = [
      (inst, ctx) => ctx.append((inst as TextCode)[1]), // TEXT
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
      (inst, ctx) => this.executeBlock((inst as StructCode)[2], ctx), // STRUCT
      null, // ATOM
      this.executeCtxvar, // CTXVAR
    ];
  }

  /**
   * Looks up an opcode and executes the corresponding instruction.
   */
  execute(inst: Code, ctx: Context): void {
    const opcode: Opcode = typeof inst === 'number' ? inst : inst[0];
    const impl = this.impls[opcode];
    if (impl) {
      impl.call(this, inst, ctx);
    }
  }

  /**
   * Executes the root instruction.
   */
  executeRoot(inst: RootCode, ctx: Context): void {
    ctx.version = inst[1];
    ctx.engine = this;
    this.executeBlock(inst[2], ctx);
  }

  /**
   * Execute a block of instructions.
   */
  executeBlock(block: Code[], ctx: Context): void {
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
        try {
          impl.call(this, inst, ctx);
        } catch (e) {
          ctx.error(unexpectedError(e.name, nameOf(opcode), e.message));
        }
      }
    }
  }

  /**
   * Variable instruction.
   *
   * inst[1]  - list of variable names ['foo.bar', 'baz.quux']
   * inst[2]  - list of formatters with optional arguments [["html"], ["truncate", "10"]]
   */
  executeVariable(inst: Code, ctx: Context): void {
    const vars = resolveVariables((inst as VariableCode)[1], ctx);
    applyFormatters(this.formatters, (inst as VariableCode)[2] || [], vars, ctx);
    ctx.emit(vars);
  }

  /**
   * Section instruction.
   *
   * inst[1]  - single variable name 'foo.bar'
   * inst[2]  - consequent block
   * inst[3]  - alternate instruction
   */
  executeSection(inst: Code, ctx: Context): void {
    const names = (inst as SectionCode)[1];
    ctx.pushSection(names);
    const node = ctx.node();
    if (isTruthy(node)) {
      this.executeBlock((inst as SectionCode)[2], ctx);
    } else {
      this.execute((inst as SectionCode)[3], ctx);
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
  executeRepeated(inst: RepeatedCode, ctx: Context): void {
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
        if (alternatesWith && alternatesWith.length && frame.currentIndex < lastIndex) {
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
  executePredicate(inst: PredicateCode, ctx: Context): void {
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
      } else if (inst[4]) {
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
  executeBindvar(inst: BindvarCode, ctx: Context): void {
    const name = inst[1];
    const vars = resolveVariables(inst[2], ctx);

    applyFormatters(this.formatters, inst[3] || [], vars, ctx);
    ctx.setVar(name, vars[0]);
  }

  /**
   * Ctxvar instruction.
   *
   * inst[1]  - variable to define, e.g. '@foo'
   * inst[2]  - list of context bindings, e.g. ['baz', ['foo', 'bar', 'baz']]
   */
  executeCtxvar(inst: CtxvarCode, ctx: Context): void {
    const name = inst[1];
    const len = inst[2].length;
    const bindings: Bindings = {};
    for (let i = 0; i < len; i++) {
      const [key, ref] = inst[2][i];
      const val = ctx.resolve(ref).value;
      bindings[key] = val;
    }
    const variable = ctx.newVariable(name, ctx.newNode(bindings));
    ctx.setVar(name, variable);
  }

  /**
   * If instruction.
   *
   * inst[1]  - array of operators (0=OR 1=AND)
   * inst[2]  - array of variables
   * inst[3]  - consequent block
   * inst[4]  - alternate instruction
   */
  executeIf(inst: IfCode, ctx: Context): void {
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
    } else if (inst[4]) {
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
  executeInject(inst: InjectCode, ctx: Context): void {
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
  executeMacro(inst: MacroCode, ctx: Context): void {
    const name = inst[1];
    ctx.setMacro(name, inst);
  }

}
