import Context from '../src/context';
import Engine from '../src/engine';
import Visitor from '../src//visitor';

/**
 * Example of constructing a custom context to modify in visitor methods.
 */
class VisitorContext extends Context {
  constructor(node, props) {
    super(node, props);
    this.path = [];
  }
}

/**
 * Example visitor to collect execution data, modify custom context.
 */
class ExampleVisitor extends Visitor {
  constructor() {
    super();
    this.names = [];
  }

  onVariable(variable, ctx) {
    this.names.push(variable.name);
  }

  onSection(name, ctx) {
    ctx.path.push(name);
  }
}


test('basic', () => {
  const engine = new Engine();
  const inst = [17, 1, [
    [2, 'b', [
      [1, ['a'], 0]
    ], 3]
  ], 18];

  const visitor = new ExampleVisitor();
  const ctx = new VisitorContext({ a: 1, b: { c: 2 } }, { visitor });
  engine.execute(inst, ctx);
  expect(visitor.names).toEqual(['a']);
  expect(ctx.path).toEqual(['b']);
});
