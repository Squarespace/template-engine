import Frame from './frame';
import Node, { MISSING_NODE } from './node';
import types from './types';
import Visitor from './visitor';

/**
 * Context for a single template execution.
 */
class Context {

  constructor(node, { locale, partials, injectables, visitor } = {}) {
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
    this.frame = new Frame(null, node);
    this.version = 1;
    this.locale = locale || {};
    this.partials = partials || {};
    this.injectables = injectables || {};
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
   * Return the current stack frame's node.
   */
  node() {
    return this.frame.node;
  }

  /**
   * Return the partial template for the given name.
   */
  getPartial(name) {
    const inst = this.frame.getMacro(name);
    return inst === null ? (this.partials[name] || null) : inst;
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
    this.frame.stopResolution = flag;
  }

  /**
   * Resolve the names to a node (or missing node) and push a frame onto the stack.
   */
  pushNames(names) {
    const node = this.resolve(names, this.frame);
    this.frame = new Frame(this.frame, node);
  }

  /**
   * Push a node explicitly onto the stack (no resolution).
   */
  pushNode(node) {
    this.frame = new Frame(this.frame, node);
  }

  /**
   * Pops the stack.
   */
  pop() {
    // If the compiler is correctly-implemented and the instruction tree is sound,
    // this should never happen. Treat as a severe error.
    if (this.frame.parent === null) {
      throw new Error('Too many Context.pop() calls, attempt to pop the root frame!!!');
    }
    this.frame = this.frame.parent;
  }

  /**
   * Defines an @-prefixed variable on the current stack frame.
   */
  setVar(name, node) {
    this.frame.setVar(name, node);
  }

  /**
   * Defines a macro on the current stack frame.
   */
  setMacro(name, inst) {
    this.frame.setMacro(name, inst);
  }

  /**
   * Initialize state needed to iterate over an array in a
   * repeated section instruction.
   */
  initIteration() {
    const node = this.frame.node;
    if (node.type !== types.ARRAY || node.value.length === 0) {
      return false;
    }
    this.frame.currentIndex = 0;
    return true;
  }

  /**
   * Push the next element of the current array onto the stack.
   */
  pushNext() {
    const node = this.frame.node.path([this.frame.currentIndex]);
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
  resolve(names, frame) {
    if (!frame) {
      frame = this.frame;
    }
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
    let frame = this.frame;
    while (frame !== null) {
      const node = this.resolveName(name, frame);
      if (!node.isMissing()) {
        return node;
      }
      if (frame.stopResolution) {
        break;
      }
      frame = frame.parent;
    }
    return MISSING_NODE;
  }

  /**
   * Resolve a single name against a stack frame. If the name starts with '@'
   * it resolves a special variable (@ for current node, @index for array index)
   * or looks up a user-defined variable.
   */
  resolveName(name, frame) {
    if (typeof name === 'string' && name.startsWith('@')) {
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
