import { Instruction } from './instructions';
import { Opcode } from './opcodes';

export abstract class Sink {
  /**
   * Accept an instruction.
   */
  abstract accept(inst: Instruction | Opcode): void;

  /**
   * Run the completion checks.
   */
  abstract complete(): void;

  /**
   * Push an error to the sink.
   */
  abstract error(err: any): void;
}
