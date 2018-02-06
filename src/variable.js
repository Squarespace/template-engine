import { Node } from './node';

/**
 * Wrapper for passing variables to formatters, simplifying passing
 * multiple values through a formatter chain.
 */
class Variable {

  constructor(name, node) {
    this.name = name;
    this.set(node);
  }

  newNode(value) {
    return new Node(value);
  }

  set(node) {
    this.node = node instanceof Node ? node : this.newNode(node);
  }

  get() {
    return this.node.value;
  }
}

export default Variable;
