import Frame from './frame';
import Node, { MISSING_NODE } from './node';
import types from './types';
import Visitor from './visitor';

/**
 * Context for a single template execution.
 */
class Context {

  constructor(node, { locale, partials = {}, injectables = {}, visitor } = {}) {
    if (!(node instanceof Node)) {
      node = new Node(node);
    }

    // TODO: REMOVE version, add temporary state to engine.
    // version of the template syntax being processed
    this.version = 1;

    // Once execution starts, the engine will set this reference. Otherwise
    // the 'apply' formatter will fail to work, since it executes templates.
    this.engine = null;

    this.buf = '';
    this.stack = [new Frame(node)];
    this.version = 1;
    this.locale = locale;
    this.partials = partials;
    this.injectables = injectables;
    this.visitor = visitor instanceof Visitor ? visitor : null;
  }

  /**
   * Swap in a fresh buffer, returning the old one.
   */
  swapBuffer() {
    const tmp = this.buf;
    this.buf = '';
    return tmp;
  }

  /**
   * Restore the old buffer.
   */
  restoreBuffer(old) {
    this.buf = old;
  }

  frame() {
    return this.stack[this.stack.length - 1];
  }

  /**
   * Hide details of how the buffer is updated. This allows someone to intercept
   * each string fragment as it is appended. For instance, to append fragments to
   * an array instead of a string.
   */
  append(s) {
    this.buf += s;
  }

  /**
   * Allow subclasses to control the rendering process.
   */
  render() {
    return this.buf;
  }

  /**
   * Emit a variable into the output.
   */
  emit(vars) {
    const first = vars[0].node;
    switch (first.type) {
    case types.NUMBER:
    case types.STRING:
    case types.BOOLEAN:
    case types.NULL:
      this.buf += first.value;
      break;
    }
  }

  /**
   * Return the current stack frame's node.
   */
  node() {
    return this.frame().node;
  }

  /**
   * Return the partial template for the given name.
   */
  getPartial(name) {
    const inst = this.getMacro(name);
    return inst === null ? (this.partials[name] || null) : inst;
  }

  /**
   * Returns a macro instruction, or null if none is defined.
   */
  getMacro(name) {
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
  getInjectable(name) {
    const node = this.injectables[name] || null;
    if (node !== null) {
      return node instanceof Node ? node : new Node(node);
    }
    return MISSING_NODE;
  }

  /**
   * Marks the current stack frame to stop resolution. This forms a barrier beyond
   * which no variables can be resolved.
   */
  stopResolution(flag) {
    this.frame().stopResolution = flag;
  }

  /**
   * Resolve the names to a node (or missing node) and push a frame onto the stack.
   */
  pushNames(names) {
    const node = this.resolve(names);
    this.stack.push(new Frame(node));
  }

  /**
   * Push a node explicitly onto the stack (no resolution).
   */
  pushNode(node) {
    this.stack.push(new Frame(node));
  }

  /**
   * Pops the stack.
   */
  pop() {
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
  setVar(name, node) {
    this.frame().setVar(name, node);
  }

  /**
   * Defines a macro on the current stack frame.
   */
  setMacro(name, inst) {
    this.frame().setMacro(name, inst);
  }

  /**
   * Initialize state needed to iterate over an array in a
   * repeated section instruction.
   */
  initIteration() {
    const frame = this.frame();
    const node = frame.node;
    if (node.type !== types.ARRAY || node.value.length === 0) {
      return false;
    }
    frame.currentIndex = 0;
    return true;
  }

  /**
   * Push the next element of the current array onto the stack.
   */
  pushNext() {
    const frame = this.frame();
    const node = frame.node.path([frame.currentIndex]);
    if (node.isNull()) {
      this.pushNode(MISSING_NODE);
    } else {
      this.pushNode(node);
    }
  }

  /**
   * Resolve the name array against the stack frame. If no frame is defined
   * it uses the current frame.
   */
  resolve(names) {
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
  lookupStack(name) {
    const len = this.stack.length - 1;
    for (let i = len; i >= 0; i--) {
      const frame = this.stack[i];
      const node = this.resolveName(name, frame);
      if (node.type !== types.MISSING) {
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
   * it resolves a special variable (@ for current node, @index for array index)
   * or looks up a user-defined variable.
   */
  resolveName(name, frame) {
    if (typeof name === 'string' && name[0] === '@') {
      if (name === '@') {
        return frame.node;

      } else if (name === '@index') {
        if (frame.currentIndex !== -1) {
          return new Node(frame.currentIndex + 1);
        }
        return MISSING_NODE;
      }
      return frame.getVar(name);
    }
    return frame.node.get(name);
  }

}

export default Context;
