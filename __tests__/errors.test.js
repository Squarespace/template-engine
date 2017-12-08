import * as errors from '../src/errors';
import { END } from '../src/opcodes';


test('error messages', () => {
  const msg = errors.notAllowedAtRoot(END);
  expect(msg).toContain('END not allowed at root');
});