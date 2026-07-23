import { format } from '../../src/plugins/util.format';

test('basic', () => {
  const msg = 'Hi {0}, your last visit was on {1}.';
  const args = ['Betty', 'Thursday'];
  expect(format(msg, args)).toEqual('Hi Betty, your last visit was on Thursday.');
});

test('many args', () => {
  let expected = '';
  let msg = '';
  const args = [];
  for (let i = 0; i < 60; i++) {
    expected += i;
    msg += '{' + i + '}';
    args.push(i);
  }
  expect(format(msg, args)).toEqual(expected);
});

test('too few args', () => {
  const msg = '{0}{1}{2}';
  expect(format(msg, [])).toEqual('');
  expect(format(msg, ['x'])).toEqual('x');
  expect(format(msg, ['x', 'z'])).toEqual('xz');
});

test('bad format', () => {
  const msg = 'Hi {0} {abc} {1}!';
  expect(format(msg, ['x', 'y'])).toEqual('Hi x  y!');
});

// The FORMAT_STATE_DIGITS fix gates at level 2. Levels 0 and 1 keep the
// released state machine (the legacy flag reads true) and level 2 applies
// the fix (false).

const ARG = ['ARG0'];

test('substitution levels', () => {
  // Parallel slots render the same at every level.
  expect(format('one {0} two {1}', ['X', 'Y'])).toEqual('one X two Y');
  expect(format('one {0} two {1}', ['X', 'Y'], true)).toEqual('one X two Y');
  expect(format('one {0} two {1}', ['X', 'Y'], false)).toEqual('one X two Y');
  // A multi-digit slot needs at least 11 args.
  const eleven = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'];
  expect(format('ten {10}', eleven)).toEqual('ten k');
  expect(format('ten {10}', eleven, true)).toEqual('ten k');
  expect(format('ten {10}', eleven, false)).toEqual('ten k');
});

test('bad tag never leaks digits', () => {
  // Java legacy counts digits while a bad tag is ignored, which re-arms a
  // slot and leaks its value ("cost ARG0 dollars"). The released TS never
  // counted them, so level 0 keeps the clean output, and the fixed path
  // renders the same.
  expect(format('cost {x 2} dollars', ARG)).toEqual('cost  dollars');
  expect(format('cost {x 2} dollars', ARG, true)).toEqual('cost  dollars');
  expect(format('cost {x 2} dollars', ARG, false)).toEqual('cost  dollars');
  // A bad tag without digits is swallowed at every level.
  expect(format('full {x} text', ARG)).toEqual('full  text');
  expect(format('full {x} text', ARG, true)).toEqual('full  text');
  expect(format('full {x} text', ARG, false)).toEqual('full  text');
});

test('brace escape', () => {
  // Legacy, braces have no escape: the tag is swallowed and a stray "}"
  // survives. Fixed, "{{" and "}}" are literal braces.
  expect(format('literal {{ brace }}', ARG)).toEqual('literal }');
  expect(format('literal {{ brace }}', ARG, true)).toEqual('literal }');
  expect(format('literal {{ brace }}', ARG, false)).toEqual('literal { brace }');

  expect(format('a {{0}} b', ARG)).toEqual('a } b');
  expect(format('a {{0}} b', ARG, true)).toEqual('a } b');
  expect(format('a {{0}} b', ARG, false)).toEqual('a {0} b');

  expect(format('{{ }}', ARG)).toEqual('}');
  expect(format('{{ }}', ARG, true)).toEqual('}');
  expect(format('{{ }}', ARG, false)).toEqual('{ }');
});

test('brace during a bad tag', () => {
  // Legacy, a '{' during a bad tag starts a new tag, so "{x {0}" renders
  // its argument at the default level. Java keeps ignoring until the
  // closing brace at every level; the fixed path does the same.
  expect(format('{x {0}', ARG)).toEqual('ARG0');
  expect(format('{x {0}', ARG, true)).toEqual('ARG0');
  expect(format('{x {0}', ARG, false)).toEqual('');
});
