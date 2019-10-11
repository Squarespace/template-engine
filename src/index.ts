import { Assembler } from './assembler';
import { Compiler } from './compiler';
import { Context, Partials } from './context';
import { Engine } from './engine';
import { MISSING_NODE, Node } from './node';
import { Parser } from './parser';
import { Variable } from './variable';
import { Formatter, FormatterTable, Predicate, PredicateTable } from './plugin';
import { ReferenceScanner } from './scan';

export { Opcode } from './opcodes';
export * from './plugins';

// tslint:disable-next-line:no-default-export
export default Compiler;

export {
  Assembler,
  Compiler,
  Context,
  Engine,
  Formatter,
  FormatterTable,
  MISSING_NODE,
  Node,
  Parser,
  Partials,
  Predicate,
  PredicateTable,
  ReferenceScanner,
  Variable,
};
