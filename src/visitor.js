
/**
 * Implementations can extend this to receive events as a template is
 * executed.
 */
class Visitor {

  onBindvar(name, variable, ctx) {}
  onSection(name, ctx) {}
  onRepeated(name, ctx) {}
  onVariable(variable, ctx) {}

}

export default Visitor;
