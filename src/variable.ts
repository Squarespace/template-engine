import { Node } from './node';

/**
 * Wrapper for passing variables to formatters, simplifying passing
 * multiple values through a formatter chain.
 */
export class Variable {

  constructor(readonly name: string, public node: Node) {
    this.set(node);
  }

  set(node: Node | any): void {
    this.node = node instanceof Node ? node : new Node(node);
  }

  get(): any {
    return this.node.value;
  }
}
