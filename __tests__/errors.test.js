import * as errors from '../src/errors';
import { END } from '../src/opcodes';


test('error messages', () => {
  const err = errors.notAllowedAtRoot(END);
  expect(err.type).toEqual(errors.ASSEMBLER);
  expect(err.message).toContain('END not allowed at root');
});
