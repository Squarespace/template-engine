import { Node, MISSING_NODE } from './node';
import { Code } from './instructions';
/**
 * Stack frame.
 */
export class Frame {

  private variables?: Map<string, Node>;
  private macros?: Map<string, Code>;

  currentIndex: number = -1;
  stopResolution: boolean = false;

  constructor(readonly node: Node) {
  }

  /**
   * Adds a variable to this frame.
   */
  setVar(name: string, node: Node) {
    if (!this.variables) {
      this.variables = new Map<string, Node>();
    }
    this.variables.set(name, node);
  }

  /**
   * Returns a variable's value, or a missing node.
   */
  getVar(name: string): Node {
    const node = !this.variables ? MISSING_NODE : this.variables.get(name);
    return node === undefined ? MISSING_NODE : node;
  }

  /**
   * Adds a macro to this frame.
   */
  setMacro(name: string, inst: Code) {
    if (!this.macros) {
      this.macros = new Map<string, Code>();
    }
    this.macros.set(name, inst);
  }

  _getMacro(name: string): Code | null {
    const inst = this.macros === undefined ? null : this.macros.get(name);
    return inst || null;
  }
}
