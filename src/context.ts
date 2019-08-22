import { partialParseFail, partialRecursion, partialSelfRecursion, TemplateError } from './errors';
import { Frame } from './frame';
import { MISSING_NODE, Node } from './node';
import { Opcode } from './opcodes';
import { Type } from './types';
import { Variable } from './variable';
import { Code, RootCode } from './instructions';

const DEFAULT_MAX_PARTIAL_DEPTH = 16;

export type Partials = { [name: string]: string | RootCode };

type ParsedPartials = { [name: string]: Code };

export interface ContextProps {
  locale?: any;
  partials?: Partials;
  injects?: any;
}

type ParseFunc = (s: string) => { code: Code, errors: TemplateError[] };

const NULL_TEMPLATE: RootCode = [Opcode.ROOT, 1, [], Opcode.EOF];

export interface ContextEngineRef {
  execute(inst: Code, ctx: Context): void;
  executeBlock(block: Code[], ctx: Context): void;
}

/**
 * Context for a single template execution.
 */
export class Context {

  public version: number;
  public engine: ContextEngineRef | null;
  public parsefunc: ParseFunc | null;
  public errors: any[];

  private locale?: any;
  private partials: Partials;
  private injects: any;
  private buf: string;
  private stack: Frame[];
  private partialsDepth: number;
  private maxPartialDepth: number;
  private partialsExecuting: Set<string>;
  private parsedPartials: ParsedPartials;

  constructor(node: Node | any, props: ContextProps = {}) {
    if (!(node instanceof Node)) {
      node = this.newNode(node);
    }

    this.locale = props.locale;
    this.partials = props.partials || {};
    this.injects = props.injects || {};

    // TODO: REMOVE version, add temporary state to engine.
    // version of the template syntax being processed
    this.version = 1;

    // Once execution starts, the engine will set this reference. Otherwise
    // the 'apply' formatter will fail to work, since it executes templates.
    this.engine = null;

    // Partials may need to be parsed and cached on the fly. Need an instance
    // of a parser to accomplish this.
    this.parsefunc = null;
    this.parsedPartials = {};

    this.buf = '';
    this.stack = [new Frame(node)];
    this.version = 1;
    this.errors = [];

    this.partialsDepth = 0;
    this.maxPartialDepth = DEFAULT_MAX_PARTIAL_DEPTH;
    this.partialsExecuting = new Set();
  }

  enterPartial(name: string): boolean {
    if (this.partialsExecuting.has(name)) {
      this.error(partialSelfRecursion(name));
      return false;
    }
    this.partialsExecuting.add(name);
    this.partialsDepth++;
    if (this.partialsDepth > this.maxPartialDepth) {
      this.error(partialRecursion(name, this.maxPartialDepth));
      return false;
    }
    return true;
  }

  exitPartial(name: string): void {
    this.partialsExecuting.delete(name);
    this.partialsDepth--;
  }

  error(msg: TemplateError): void {
    this.errors.push(msg);
  }

  newNode(value: any): Node {
    return new Node(value);
  }

  newVariable(name: string, node: Node): Variable {
    return new Variable(name, node);
  }

  /**
   * Swap in a fresh buffer, returning the old one.
   */
  swapBuffer(): string {
    const tmp = this.buf;
    this.buf = '';
    return tmp;
  }

  /**
   * Restore the old buffer.
   */
  restoreBuffer(old: string): void {
    this.buf = old;
  }

  frame(): Frame {
    return this.stack[this.stack.length - 1];
  }

  /**
   * Hide details of how the buffer is updated. This allows someone to intercept
   * each string fragment as it is appended. For instance, to append fragments to
   * an array instead of a string.
   */
  append(s: string): void {
    this.buf += s;
  }

  /**
   * Allow subclasses to control the rendering process.
   */
  render(): string {
    return this.buf;
  }

  /**
   * Emit a variable into the output.
   */
  emit(vars: Variable[]): void {
    const first = vars[0].node!;
    switch (first.type) {
    case Type.NUMBER:
    case Type.STRING:
    case Type.BOOLEAN:
      this.append(first.value);
      break;

    case Type.NULL:
      this.append('');
      break;

    case Type.ARRAY: {
      const arr = first.value;
      for (let i = 0; i < arr.length; i++) {
        if (i > 0) {
          this.append(',');
        }
        this.append(arr[i]);
      }
      break;
    }
    }

  }

  /**
   * Return the current stack frame's node.
   */
  node(): Node {
    return this.frame().node;
  }

  /**
   * Return the partial template for the given name.
   */
  getPartial(name: string): Code | null {
    // See if a named inline macro is defined
    let inst: Code | null;

    inst = this.getMacro(name);
    if (inst) {
      return inst;
    }

    // Check for a parsed partial
    inst = this.parsedPartials[name];
    if (inst) {
      return inst;
    }

    // Check for a raw partial, which may be in string form.
    const raw = this.partials[name];
    if (typeof raw !== 'string') {
      inst = raw;
    } else if (this.parsefunc) {
      // Parse the partial
      const res = this.parsefunc(raw);

      // If errors occurred, append them to this context's errors
      if (res.errors && res.errors.length > 0) {
        for (let i = 0; i < res.errors.length; i++) {
          this.error(partialParseFail(name, res.errors[i].message));
        }

        // Set empty template
        inst = NULL_TEMPLATE;
      } else {
        // No errors, get the code.
        inst = res.code;
      }
    }

    // Cache it and return
    if (inst) {
      this.parsedPartials[name] = inst;
    }
    return inst;
  }

  /**
   * Returns a macro instruction, or null if none is defined.
   */
  getMacro(name: string): Code | null {
    const len = this.stack.length - 1;
    for (let i = len; i >= 0; i--) {
      const inst = this.stack[i]._getMacro(name);
      if (inst !== null) {
        return inst;
      }
    }
    return null;
  }

  /**
   * Get an injectable value by name. Injectables are assumed to be real
   * values.
   */
  getInjectable(name: string): Node {
    const node = this.injects[name] || null;
    if (node !== null) {
      return node instanceof Node ? node : this.newNode(node);
    }
    return MISSING_NODE;
  }

  /**
   * Marks the current stack frame to stop resolution. This forms a barrier beyond
   * which no variables can be resolved.
   */
  stopResolution(flag: boolean): void {
    this.frame().stopResolution = flag;
  }

  /**
   * Resolve the names to a node (or missing node) and push a frame onto the stack.
   */
  pushSection(names: (string | number)[]): void {
    const len = names.length;
    let node = MISSING_NODE;
    if (len > 0) {
      node = this.resolveName(names[0], this.frame());
    }
    if (len > 1) {
      node = node.path(names.slice(1));
    }
    this.stack.push(new Frame(node));
  }

  /**
   * Push a node explicitly onto the stack (no resolution).
   */
  pushNode(node: Node): void {
    this.stack.push(new Frame(node));
  }

  /**
   * Pops the stack.
   */
  pop(): void {
    this.stack.pop();
    // If the compiler is correctly-implemented and the instruction tree built by
    // the assembler is valid, this should never happen. Treat as a severe error.
    // If can (of course) occur when compiling a hand-created invalid instruction tree.
    if (this.stack.length === 0) {
      throw new Error('Too many Context.pop() calls, attempt to pop the root frame!!!');
    }
  }

  /**
   * Defines an @-prefixed variable on the current stack frame.
   */
  setVar(name: string, variable: Variable): void {
    this.frame().setVar(name, variable.node);
  }

  /**
   * Defines a macro on the current stack frame.
   */
  setMacro(name: string, inst: Code): void {
    this.frame().setMacro(name, inst);
  }

  /**
   * Initialize state needed to iterate over an array in a
   * repeated section instruction.
   */
  initIteration(): boolean {
    const frame = this.frame();
    const node = frame.node;
    if (node.type !== Type.ARRAY || node.value.length === 0) {
      return false;
    }
    frame.currentIndex = 0;
    return true;
  }

  /**
   * Push the next element of the current array onto the stack.
   */
  pushNext(): void {
    const frame = this.frame();
    const node = frame.node.path([frame.currentIndex]);
    if (node.type === Type.MISSING) {
      this.pushNode(MISSING_NODE);
    } else {
      this.pushNode(node);
    }
  }

  /**
   * Resolve the name array against the stack frame. If no frame is defined
   * it uses the current frame.
   */
  resolve(names: (string | number)[]): Node {
    const len = names.length;
    if (len === 0) {
      return MISSING_NODE;
    }
    let node = this.lookupStack(names[0]);
    if (len > 1) {
      node = node.path(names.slice(1));
    }
    return node;
  }

  /**
   * Look up the stack looking for the first name that resolves successfully.
   * If a frame is marked "stopResolution" we bail out at that point.
   */
  lookupStack(name: string | number): Node {
    const len = this.stack.length - 1;
    for (let i = len; i >= 0; i--) {
      const frame = this.stack[i];
      const node = this.resolveName(name, frame);
      if (node.type !== Type.MISSING) {
        return node;
      }

      if (frame.stopResolution) {
        break;
      }
    }
    return MISSING_NODE;
  }

  /**
   * Resolve a single name against a stack frame. If the name starts with '@'
   * it resolves a special variable (@ for current node, @index or
   * @index0 for 1- and 0-based array indices) or looks up a user-defined variable.
   */
  resolveName(name: string | number, frame: Frame): Node {
    if (typeof name === 'string' && name[0] === '@') {
      if (name === '@') {
        return frame.node;
      } else if (name === '@index' || name === '@index0') {
        if (frame.currentIndex !== -1) {
          const offset = name === '@index' ? 1 : 0;
          return this.newNode(frame.currentIndex + offset);
        }
        return MISSING_NODE;
      }
      return frame.getVar(name);
    }
    return frame.node.get(name);
  }

}
