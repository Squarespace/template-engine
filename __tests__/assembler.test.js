import Assembler from '../src/assembler';
import CodeBuilder from '../src/builder';
import { Section } from '../src/instructions';

import {
  notAllowedAtRoot,
  stateEOFNotReached,
  transitionFromEOF,
  unclosed,
} from '../src/errors';

import {
  ALTERNATES_WITH,
  END,
  OR_PREDICATE,
  SECTION,
} from '../src/opcodes';


test('assembler sanity check', () => {
  const assembler = new Assembler();

  expect(() => assembler.stateFor(null)).toThrow(Error);

  assembler.accept(new Section('foo'));
  assembler.pop();

  // Ensure error is thrown when state machine has a bug
  expect(() => assembler.pop()).toThrow(Error);
  expect(assembler.complete()).toEqual(false);

  const errors = assembler.errors;
  expect(errors.length).toEqual(2);
  expect(errors[0]).toEqual(unclosed(null));
  expect(errors[1]).toEqual(stateEOFNotReached());
});


test('assembly complete', () => {
  const { assembler, errors } = new CodeBuilder()
    .section('a').text('A').end()
    .eof()
    .get();

  expect(assembler.complete()).toEqual(true);
  expect(errors).toEqual([]);
});


test('atomic instructions', () => {
  const { root, errors } = new CodeBuilder()
    .bindvar('@foo', ['a', 'b'], [['html'], ['json-pretty']])
    .inject('@bar', 'messages.json')
    .variable('@baz', [['json'], ['capitalize']])
    .eof()
    .get();

  expect(errors).toEqual([]);
  expect(root.code).toEqual([17, 1, [
    [6, '@foo', ['a', 'b'], [['html'], ['json-pretty']]],
    [9, '@bar', 'messages.json', 0],
    [1, '@baz', [['json'], ['capitalize']]]
  ], 18]);
});

test('empty', () => {
  const { root, errors } = new CodeBuilder().eof().get();

  expect(errors).toEqual([]);
  expect(root.code).toEqual([17, 1, [], 18]);
});


test('root invalid', () => {
  let assembler;
  let errors;

  // alternates-with at root scope
  ({ assembler, errors } = new CodeBuilder()
    .text('A').alternatesWith().eof()
    .get());

  expect(assembler.complete()).toEqual(false);
  expect(errors.length).toEqual(1);
  expect(errors[0]).toEqual(notAllowedAtRoot(ALTERNATES_WITH));

  // end at root scope
  ({ assembler, errors } = new CodeBuilder()
    .section('foo.bar').text('hi').end()
    .end() // end closing root
    .eof()
    .get());

  expect(assembler.complete()).toEqual(false);
  expect(errors.length).toEqual(1);
  expect(errors[0]).toEqual(notAllowedAtRoot(END));

  // or in root scope
  ({ assembler, errors } = new CodeBuilder()
    .text('A').or().text('B')
    .eof()
    .get());

  expect(assembler.complete()).toEqual(false);
  expect(errors.length).toEqual(1);
  expect(errors[0]).toEqual(notAllowedAtRoot(OR_PREDICATE));

  // instructions after eof
  ({ assembler, errors } = new CodeBuilder()
    .text('A')
    .eof()
    .section('foo')
    .text('B')
    .end()
    .get());

  expect(assembler.complete()).toEqual(false);
  expect(errors.length).toEqual(2);
  expect(errors[0]).toEqual(transitionFromEOF(SECTION));
  expect(errors[1]).toEqual(stateEOFNotReached());
});


test('comments and literals', () => {
  const { root, errors } = new CodeBuilder()
    .comment('single').comment('multiline', true)
    .metaLeft().metaRight().newline().space().tab()
    .eof()
    .get();

  expect(errors).toEqual([]);
  expect(root.code).toEqual([17, 1, [
    [11, 'single', 0],
    [11, 'multiline', 1],
    12, 13, 14, 15, 16
  ], 18]);
});


test('if invalid', () => {
  let errors;

  // eof inside if
  ({ errors } = new CodeBuilder()
    .ifinst([1, 0], ['a.b', 'b.c', 'c.d]'])
    .text('A')
    .eof()
    .get());

  expect(errors.length).toEqual(1);

  // alternates-with inside if
  ({ errors } = new CodeBuilder()
    .ifinst([1], ['a', 'b'])
    .text('A')
    .alternatesWith()
    .end()
    .eof()
    .get());

  expect(errors.length).toEqual(1);
});


test('if', () => {
  const { root, errors } = new CodeBuilder()
    .ifinst([1, 0], ['a', 'b', 'c'])
    .section('a').text('...').end()
    .text('A')
    .or('odd?', ['a'])
    .text('B')
    .end()
    .eof()
    .get();

  expect(errors).toEqual([]);
  expect(root.code).toEqual([17, 1, [
    [8, [1, 0], ['a', 'b', 'c'], [
      [2, 'a', [[0, '...']], 3],
      [0, 'A']
    ], [7, 'odd?', ['a'], [
      [0, 'B']
    ], 3]]
  ], 18]);
});


test('macro invalid', () => {
  let errors;

  // eof inside macro
  ({ errors } = new CodeBuilder()
    .macro('foo.html').text('A')
    .eof()
    .end()
    .get());

  expect(errors.length).toEqual(1);

  // alternates-with inside macro
  ({ errors } = new CodeBuilder()
    .macro('foo.html').text('A')
    .alternatesWith()
    .end()
    .eof()
    .get());

  expect(errors.length).toEqual(1);

  // or predicate inside macro
  ({ errors } = new CodeBuilder()
    .macro('foo.html').text('A')
    .or()
    .end()
    .eof()
    .get());

  expect(errors.length).toEqual(1);
});


test('macro', () => {
  const { root, errors } = new CodeBuilder()
    .macro('foo.html').text('A')
    .section('bar').text('B')
    .end().end()
    .eof()
    .get();

  expect(errors).toEqual([]);
  expect(root.code).toEqual([17, 1, [
    [10, 'foo.html', [
      [0, 'A'],
      [2, 'bar', [
        [0, 'B']
      ], 3]]]
  ], 18]);
});


test('predicate invalid', () => {
  let errors;

  // eof inside predicate
  ({ errors } = new CodeBuilder()
    .predicate('.even?', ['a', 'b']).text('A')
    .eof()
    .get());

  expect(errors.length).toEqual(1);

  // alternates-with inside predicate
  ({ errors } = new CodeBuilder()
    .predicate('.odd?', ['a']).text('A')
    .alternatesWith()
    .end()
    .eof()
    .get());

  expect(errors.length).toEqual(1);

  // eof inside or
  ({ errors } = new CodeBuilder()
    .predicate('.even?').text('A')
    .or()
    .eof()
    .end()
    .get());

  expect(errors.length).toEqual(1);

  // alternates-with inside or
  ({ errors } = new CodeBuilder()
    .predicate('.odd?').text('A')
    .or()
    .alternatesWith()
    .end()
    .eof()
    .get());

  expect(errors.length).toEqual(1);

  // dead code
  ({ errors } = new CodeBuilder()
    .predicate('.odd?', ['a']).text('A')
    .or()
    .or('.equal?', ['a'])
    .end()
    .eof()
    .get());

  expect(errors.length).toEqual(1);
});


test('predicate with or branch', () => {
  const { root, errors } = new CodeBuilder()
    .predicate('.even?', ['a']).section('a').text('A').end()
    .or('.equal?', ['a', 'b']).section('b').text('B').end()
    .or().text('C')
    .end().eof()
    .get();

  expect(errors).toEqual([]);
  expect(root.code).toEqual([17, 1, [
    [5, '.even?', ['a'], [
      [2, 'a', [
        [0, 'A']
      ], 3]
    ], [7, '.equal?', ['a', 'b'], [
      [2, 'b', [
        [0, 'B']
      ], 3]
    ], [7, 0, 0, [
      [0, 'C']
    ], 3]]]
  ], 18]);
});


test('repeated invalid', () => {
  let errors;

  // eof inside repeated
  ({ errors } = new CodeBuilder()
    .repeated('a').text('A')
    .eof().get());

  expect(errors.length).toEqual(1);

  // eof inside alternates-with
  ({ errors } = new CodeBuilder()
    .repeated('a').text('A')
    .alternatesWith().text('B')
    .eof()
    .get());

  expect(errors.length).toEqual(1);

  // multiple alternates-with
  ({ errors } = new CodeBuilder()
    .repeated('a.b.c').text('A')
    .alternatesWith().text('B')
    .alternatesWith().text('C')
    .end()
    .eof()
    .get());

  expect(errors.length).toEqual(1);
});


test('repeated', () => {
  const { root, errors } = new CodeBuilder()
    .repeated('a').section('b').text('B').end()
    .end().eof()
    .get();

  expect(errors).toEqual([]);
  expect(root.code).toEqual([17, 1, [
    [4, 'a', [
      [2, 'b', [
        [0, 'B']
      ], 3]
    ], 3, []]
  ], 18]);
});


test('repeated with or branch', () => {
  const { root, errors } = new CodeBuilder()
    .repeated('a').text('A')
    .or().text('B')
    .end().eof()
    .get();

  expect(errors).toEqual([]);
  expect(root.code).toEqual([17, 1, [
    [4, 'a', [
      [0, 'A']
    ], [7, 0, 0, [
      [0, 'B']
    ], 3], []]
  ], 18]);
});


test('repeated with or branch and alternates block', () => {
  const { root, errors } = new CodeBuilder()
    .repeated('a').text('A')
    .alternatesWith()
    .or().text('B')
    .end().eof()
    .get();

  expect(errors).toEqual([]);
  expect(root.code).toEqual([17, 1, [
    [4, 'a', [
      [0, 'A']
    ],
    [7, 0, 0, [
      [0, 'B']
    ], 3], []]
  ], 18]);
});


test('repeated with or branch and alternates block 2', () => {
  const { root, errors } = new CodeBuilder()
    .repeated('a').text('A')
    .alternatesWith().section('b').text('---').end()
    .or().text('B')
    .end().eof()
    .get();

  expect(errors).toEqual([]);
  expect(root.code).toEqual([17, 1, [
    [4, 'a', [
      [0, 'A'],
      [2, 'b', [
        [0, '---']
      ], 3]],
    [7, 0, 0, [
      [0, 'B']
    ], 3], []]
  ], 18]);
});


test('section invalid', () => {
  let errors;

  ({ errors } = new CodeBuilder()
    .section('foo.bar').text('hi').eof()
    .get());

  expect(errors.length).toEqual(1);

  ({ errors } = new CodeBuilder()
    .section('a.b.c').text('A').alternatesWith()
    .end().eof()
    .get());

  expect(errors.length).toEqual(1);
});


test('section with or branch', () => {
  const { root, errors } = new CodeBuilder()
    .section('foo.bar').text('hello')
    .or().text('goodbye')
    .end().eof()
    .get();

  expect(errors).toEqual([]);
  expect(root.code).toEqual([17, 1, [
    [2, 'foo.bar', [
      [0, 'hello']
    ], [7, 0, 0, [
      [0, 'goodbye']
    ], 3]
    ]
  ], 18]);
});


test('sections nested', () => {
  const { root, errors } = new CodeBuilder()
    .section('foo').text('A')
    .section('bar').text('B')
    .section('baz').text('C')
    .end().end().end().eof()
    .get();

  expect(errors).toEqual([]);
  expect(root.code).toEqual([17, 1, [
    [2, 'foo', [
      [0, 'A'],
      [2, 'bar', [
        [0, 'B'],
        [2, 'baz', [
          [0, 'C']
        ], 3]
      ], 3]
    ], 3]
  ], 18]);
});
