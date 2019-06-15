import { notAllowedAtRoot } from '../src/errors';
import { Opcode } from '../src/opcodes';


test('error messages', () => {
  const err = notAllowedAtRoot(Opcode.END);
  expect(err.type).toEqual('assembler');
  expect(err.message).toContain('END not allowed at root');
});
