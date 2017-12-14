import Context from '../src/context';
import Engine from '../src/engine';
import Visitor from '../src//visitor';
import { END, EOF, ROOT, SECTION, VARIABLE, BINDVAR } from '../src/opcodes';

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

  onBindvar(name, variables, ctx) {
    this.names.push(name);
    this.names.push(variables[0].name);
  }

  onVariable(variables, ctx) {
    this.names.push(variables[0].name);
  }

  onSection(name, ctx) {
    ctx.path.push(name);
  }

}


test('basic', () => {
  const engine = new Engine();
  const inst = [ROOT, 1, [
    [SECTION, 'b', [
      [BINDVAR, '@foo', ['a', 'b'], [['html']]],
      [VARIABLE, ['a'], 0],
      [VARIABLE, ['@foo'], 0]
    ], END]
  ], EOF];

  const visitor = new ExampleVisitor();
  const ctx = new VisitorContext({ a: 1, b: { c: 2 } }, { visitor });
  engine.execute(inst, ctx);
  expect(visitor.names).toEqual(['@foo', 'a', 'a', '@foo']);
  expect(ctx.path).toEqual(['b']);
});
