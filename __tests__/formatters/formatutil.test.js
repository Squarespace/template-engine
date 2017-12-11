import { format } from '../../src/formatters/formatutil';

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
