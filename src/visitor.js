
/**
 * Implementations can extend this to receive events as a template is
 * executed.
 */
class Visitor {

  // TODO: this is incomplete. need to examine the existing use case(s) for
  // visitor before completing this interface.

  onBindvar(name, variable, ctx) {}
  onSection(name, ctx) {}
  onRepeated(name, ctx) {}
  onVariable(variable, ctx) {}

}

export default Visitor;
