import { Context } from './context';
import { nameOfOpcode, Opcode } from './opcodes';
import { Node } from './node';
import {
  BindvarCode,
  Code,
  CtxvarCode,
  FormatterCall,
  EvalCode,
  IfCode,
  IncludeCode,
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
import { expressionParse, unexpectedError, partialMissing } from './errors';
import { Variable } from './variable';
import { Formatter, FormatterMap, PredicateMap, PredicatePlugin } from './plugin';
import { isTruthy } from './node';
import { tokenDebug, Expr } from './math';

const DEBUG_ARROW = new Node(' -> ');

type Bindings = { [x: string]: Node };

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
      this.executeEval, // EVAL
      this.executeInclude, // INCLUDE
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
          ctx.error(unexpectedError(e.name, nameOfOpcode(opcode), e.message));
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
    const vars = this.resolveVariables((inst as VariableCode)[1], ctx);
    ctx.pushNode(vars[0].node);
    this.applyFormatters(this.formatters, (inst as VariableCode)[2] || [], vars, ctx);
    ctx.emit(vars);
    ctx.pop();
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
      if (impl instanceof PredicatePlugin) {
        const args = inst[2]; // [args, delimiter]
        result = impl.apply(args === 0 ? [] : args[0], ctx);
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
    const vars = this.resolveVariables(inst[2], ctx);

    this.applyFormatters(this.formatters, inst[3] || [], vars, ctx);
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
   * Eval instruction
   *
   * inst[1]  - string expression to evaluate
   */
  executeEval(inst: EvalCode, ctx: Context): void {
    // Refuse to evaluate the instruction if not explicitly enabled.
    if (!ctx.enableExpr) {
      return;
    }

    // Raw expression to be parsed and evaluated.
    let raw = inst[1];

    // Check if we have no yet parsed and cached the expression.
    let expr: Expr = inst.expr;
    if (!expr) {
      let debug = false;

      // Check for debug flag at beginning of expression and skip it
      if (raw.startsWith('#')) {
        raw = raw.slice(1);
        debug = true;
      }

      // Construct the expression. This tokenizes the input.
      expr = new Expr(raw, ctx.exprOpts);

      // Build the expression. This assembles the expression in reverse
      // polish notation so it can be evaluated later.
      expr.build();

      // Check if the expression has a parse error and emit it.
      if (expr.errors.length) {
        expr.errors.map(e => ctx.error(expressionParse(raw, e)));
      }

      // Cache the assembled expression
      inst.expr = expr;
      inst.debug = debug;
    }

    if (inst.debug) {
      // Emit the assembled expressions
      const msg = `EVAL=[${expr.expr.map(
        e => '[' + e.map(tokenDebug).join(' ') + ']').join(', ')}]`;
      ctx.emitNode(new Node(msg));
    }

    // Evaluate the expression against the current context and append any output.
    // We only attempt to reduce the expression if there were no parse errors.
    if (!expr.errors.length) {
      // Track the error count to detect if reduce produces an error.
      const errs = ctx.errors.length;

      // Create a temporary stack frame. This will collect local variables created
      // by the expression. If reducing the expression produces an error, the
      // local variables created by the expression will be discarded.
      ctx.pushNode(ctx.node());

      // Reduce the expression
      const r = expr.reduce(ctx);

      // Collect all local variables created by the expression.
      const vars = ctx.frame().getVars();

      // Pop the temporary stack frame.
      ctx.pop();

      // If an error occurred during reduce we suppress the output. The temporary
      // stack frame allows us to "undo" the effects of the evaluation, removing
      // any local variables created by the invalid expression.
      if (ctx.errors.length === errs) {
        // Reduce produced no errors, so retain the local variables.
        if (vars) {
          // Copy the local variables to the stack frame.
          const frame = ctx.frame();
          vars.forEach((v, k) => {
            frame.setVar(k, v);
          });
        }

        // If the expression produced immediate output, emit it.
        if (r) {
          if (inst.debug) {
            ctx.emitNode(DEBUG_ARROW);
          }
          ctx.emitNode(r);
        }
      }
    }
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
    } else if (inst[4]) {
      this.execute(inst[4], ctx);
    }
  }

  /**
   * Include instruction.
   * 
   * inst[1]  - name of macro or partial to include
   * inst[2]  - optional arguments
   */
  executeInclude(inst: IncludeCode, ctx: Context): void {
    // Refuse to evaluate the instruction if not explicitly enabled.
    if (!ctx.enableInclude) {
      return;
    }

    const name = inst[1];
    const rawargs = inst[2];

    // Fetch the partial or macro code
    const code = ctx.getPartial(name);
    if (!Array.isArray(code)) {
      ctx.error(partialMissing(name));
      return;
    }

    // Set options from arguments
    let output = false;
    if (Array.isArray(rawargs)) {
      for (const arg of rawargs[0]) {
        switch (arg) {
          case 'output':
            output = true;
            break;
        }
      }
    }

    let buf: string | undefined;

    // By default we suppress output from the partial or macro
    if (!output) {
      buf = ctx.swapBuffer();
    }

    // Execute the partial or macro inline.
    if (ctx.enterPartial(name)) {
      switch (code[0]) {
        case Opcode.ROOT:
          this.execute(code as RootCode, ctx);
          break;
        case Opcode.MACRO:
          this.executeBlock((code as MacroCode)[2], ctx);
          break;
      }
      ctx.exitPartial(name);
    }

    if (!output && buf !== undefined) {
      ctx.restoreBuffer(buf);
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
    // const args = inst[3].slice(1) - arguments ignored for now
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

  /**
   * Resolve one or more variables against the context. Accepts a raw list of
   * variable names (e.g. ['foo.bar', 'baz.quux']), splits each info parts
   * (.e.g. [['foo', 'bar'], ['baz', 'quux']]), resolves them against the
   * context, and wraps in a Variable instance.
   */
  resolveVariables(rawlist: (string | number)[][], ctx: Context): Variable[] {
    const result: Variable[] = new Array(rawlist.length);
    const size = rawlist.length;
    for (let i = 0; i < size; i++) {
      const names = rawlist[i];
      result[i] = ctx.newVariable('', ctx.resolve(names));
    }
    return result;
  }

  /**
   * Apply formatters to the list of vars.
   */
  applyFormatters(formatters: FormatterMap, calls: FormatterCall[], vars: Variable[], ctx: Context): void {
    const len = calls.length;
    for (let i = 0; i < len; i++) {
      const call = calls[i];
      const name = call[0];
      const formatter = formatters[name];
      // Undefined formatters will raise an error in the parse phase.
      if (!formatter || !(formatter instanceof Formatter)) {
        continue;
      }
      const args = call.length === 1 ? [] : call[1][0];
      formatter.apply(args, vars, ctx);
    }
  }

}
