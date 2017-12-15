
class Sink {
  /**
   * Accept an instruction.
   */
  accept(inst) {}

  /**
   * Run the completion checks.
   */
  complete() {}

  /**
   * Push an error to the sink.
   */
  error(err) {}
}

export default Sink;

