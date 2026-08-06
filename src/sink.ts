import { Instruction } from './instructions';
import { Opcode } from './opcodes';
import { TemplateError } from './errors';

export abstract class Sink {
  /**
   * Accept an instruction.
   */
  abstract accept(inst: Instruction | Opcode): void;

  /**
   * Push an error to the sink.
   */
  abstract error(err: TemplateError): void;
}
