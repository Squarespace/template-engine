import { Assembler } from '../src/assembler';
import { CodeBuilder } from '../src/builder';
import { Instruction, Section } from '../src/instructions';
import { Opcode as O } from '../src/opcodes';

import { notAllowedAtRoot, stateEOFNotReached, transitionFromEOF, unclosed } from '../src/errors';

test('assembler sanity check', () => {
  const assembler = new Assembler();

  expect(() => assembler.stateFor(null as unknown as O)).toThrow(Error);

  assembler.accept(new Section(['foo']));
  assembler.pop();

  // Ensure error is thrown when state machine has a bug
  expect(() => assembler.pop()).toThrow(Error);
  expect(assembler.complete()).toEqual(false);

  const errors = assembler.errors;
  expect(errors.length).toEqual(2);
  expect(errors[0]).toEqual(unclosed(null as unknown as Instruction));
  expect(errors[1]).toEqual(stateEOFNotReached());
});

test('assembly complete', () => {
  const { assembler, errors } = new CodeBuilder().section(['a']).text('A').end().eof().get();

  expect(assembler.complete()).toEqual(true);
  expect(errors).toEqual([]);
});

test('atom', () => {
  const { root, errors } = new CodeBuilder().text('A').atom({ mydata: 'foo' }).text('B').eof().get();
  expect(errors).toEqual([]);
  expect(root.code).toEqual([
    O.ROOT,
    1,
    [
      [O.TEXT, 'A'],
      [O.ATOM, { mydata: 'foo' }],
      [O.TEXT, 'B'],
    ],
    O.EOF,
  ]);
});

test('atomic instructions', () => {
  const { root, errors } = new CodeBuilder()
    .bindvar('@foo', ['a', 'b'], [['html'], ['json-pretty']])
    .inject('@bar', 'messages.json')
    .variable([['@baz']], [['json'], ['capitalize']])
    .eof()
    .get();

  expect(errors).toEqual([]);
  expect(root.code).toEqual([
    O.ROOT,
    1,
    [
      [O.BINDVAR, '@foo', ['a', 'b'], [['html'], ['json-pretty']]],
      [O.INJECT, '@bar', 'messages.json', 0],
      [O.VARIABLE, [['@baz']], [['json'], ['capitalize']]],
    ],
    O.EOF,
  ]);
});

test('empty', () => {
  const { root, errors } = new CodeBuilder().eof().get();

  expect(errors).toEqual([]);
  expect(root.code).toEqual([O.ROOT, 1, [], O.EOF]);
});

test('root invalid', () => {
  let assembler;
  let errors;

  // alternates-with at root scope
  ({ assembler, errors } = new CodeBuilder().text('A').alternatesWith().eof().get());

  expect(assembler.complete()).toEqual(false);
  expect(errors.length).toEqual(1);
  expect(errors[0]).toEqual(notAllowedAtRoot(O.ALTERNATES_WITH));

  // end at root scope
  ({ assembler, errors } = new CodeBuilder()
    .section(['foo', 'bar'])
    .text('hi')
    .end()
    .end() // end closing root
    .eof()
    .get());

  expect(assembler.complete()).toEqual(false);
  expect(errors.length).toEqual(1);
  expect(errors[0]).toEqual(notAllowedAtRoot(O.END));

  // or in root scope
  ({ assembler, errors } = new CodeBuilder().text('A').or().text('B').eof().get());

  expect(assembler.complete()).toEqual(false);
  expect(errors.length).toEqual(1);
  expect(errors[0]).toEqual(notAllowedAtRoot(O.OR_PREDICATE));

  // instructions after eof
  ({ assembler, errors } = new CodeBuilder().text('A').eof().section(['foo']).text('B').end().get());

  expect(assembler.complete()).toEqual(false);
  expect(errors.length).toEqual(2);
  expect(errors[0]).toEqual(transitionFromEOF(O.SECTION));
  expect(errors[1]).toEqual(stateEOFNotReached());
});

test('comments and literals', () => {
  const { root, errors } = new CodeBuilder()
    .comment('single')
    .comment('multiline', true)
    .metaLeft()
    .metaRight()
    .newline()
    .space()
    .tab()
    .eof()
    .get();

  expect(errors).toEqual([]);
  expect(root.code).toEqual([
    O.ROOT,
    1,
    [[O.COMMENT, 'single', 0], [O.COMMENT, 'multiline', 1], O.META_LEFT, O.META_RIGHT, O.NEWLINE, O.SPACE, O.TAB],
    O.EOF,
  ]);
});

test('if invalid', () => {
  let errors;

  // eof inside if
  ({ errors } = new CodeBuilder()
    .ifinst(
      [1, 0],
      [
        ['a', 'b'],
        ['b', 'c'],
        ['c', 'd'],
      ]
    )
    .text('A')
    .eof()
    .get());

  expect(errors.length).toEqual(1);

  // alternates-with inside if
  ({ errors } = new CodeBuilder()
    .ifinst([1], [['a'], ['b']])
    .text('A')
    .alternatesWith()
    .end()
    .eof()
    .get());

  expect(errors.length).toEqual(1);
});

test('if', () => {
  const { root, errors } = new CodeBuilder()
    .ifinst([1, 0], [['a'], ['b'], ['c']])
    .section(['a'])
    .text('...')
    .end()
    .text('A')
    .or('odd?', [['a'], ' '])
    .text('B')
    .end()
    .eof()
    .get();

  expect(errors).toEqual([]);
  expect(root.code).toEqual([
    O.ROOT,
    1,
    [
      [
        O.IF,
        [1, 0],
        [['a'], ['b'], ['c']],
        [
          [O.SECTION, ['a'], [[O.TEXT, '...']], O.END],
          [O.TEXT, 'A'],
        ],
        [O.OR_PREDICATE, 'odd?', [['a'], ' '], [[O.TEXT, 'B']], O.END],
      ],
    ],
    O.EOF,
  ]);
});

test('macro invalid', () => {
  let errors;

  // eof inside macro
  ({ errors } = new CodeBuilder().macro('foo.html').text('A').eof().end().get());

  expect(errors.length).toEqual(1);

  // alternates-with inside macro
  ({ errors } = new CodeBuilder().macro('foo.html').text('A').alternatesWith().end().eof().get());

  expect(errors.length).toEqual(1);

  // or predicate inside macro
  ({ errors } = new CodeBuilder().macro('foo.html').text('A').or().end().eof().get());

  expect(errors.length).toEqual(1);
});

test('macro', () => {
  const { root, errors } = new CodeBuilder().macro('foo.html').text('A').section(['bar']).text('B').end().end().eof().get();

  expect(errors).toEqual([]);
  expect(root.code).toEqual([
    O.ROOT,
    1,
    [
      [
        O.MACRO,
        'foo.html',
        [
          [O.TEXT, 'A'],
          [O.SECTION, ['bar'], [[O.TEXT, 'B']], O.END],
        ],
      ],
    ],
    O.EOF,
  ]);
});

test('predicate invalid', () => {
  let errors;

  // eof inside predicate
  ({ errors } = new CodeBuilder()
    .predicate('.even?', [['a', 'b'], ' '])
    .text('A')
    .eof()
    .get());

  expect(errors.length).toEqual(1);

  // alternates-with inside predicate
  ({ errors } = new CodeBuilder()
    .predicate('.odd?', [['a'], ' '])
    .text('A')
    .alternatesWith()
    .end()
    .eof()
    .get());

  expect(errors.length).toEqual(1);

  // eof inside or
  ({ errors } = new CodeBuilder().predicate('.even?').text('A').or().eof().end().get());

  expect(errors.length).toEqual(1);

  // alternates-with inside or
  ({ errors } = new CodeBuilder().predicate('.odd?').text('A').or().alternatesWith().end().eof().get());

  expect(errors.length).toEqual(1);

  // dead code
  ({ errors } = new CodeBuilder()
    .predicate('.odd?', [['a'], ' '])
    .text('A')
    .or()
    .or('.equal?', [['a'], ' '])
    .end()
    .eof()
    .get());

  expect(errors.length).toEqual(1);
});

test('predicate with or branch', () => {
  const { root, errors } = new CodeBuilder()
    .predicate('.even?', [['a'], ' '])
    .section(['a'])
    .text('A')
    .end()
    .or('.equal?', [['a', 'b'], ' '])
    .section(['b'])
    .text('B')
    .end()
    .or()
    .text('C')
    .end()
    .eof()
    .get();

  expect(errors).toEqual([]);
  expect(root.code).toEqual([
    O.ROOT,
    1,
    [
      [
        O.PREDICATE,
        '.even?',
        [['a'], ' '],
        [[O.SECTION, ['a'], [[O.TEXT, 'A']], O.END]],
        [
          O.OR_PREDICATE,
          '.equal?',
          [['a', 'b'], ' '],
          [[O.SECTION, ['b'], [[O.TEXT, 'B']], O.END]],
          [O.OR_PREDICATE, 0, 0, [[O.TEXT, 'C']], O.END],
        ],
      ],
    ],
    O.EOF,
  ]);
});

test('repeated invalid', () => {
  let errors;

  // eof inside repeated
  ({ errors } = new CodeBuilder().repeated(['a']).text('A').eof().get());

  expect(errors.length).toEqual(1);

  // eof inside alternates-with
  ({ errors } = new CodeBuilder().repeated(['a']).text('A').alternatesWith().text('B').eof().get());

  expect(errors.length).toEqual(1);

  // multiple alternates-with
  ({ errors } = new CodeBuilder()
    .repeated(['a', 'b', 'c'])
    .text('A')
    .alternatesWith()
    .text('B')
    .alternatesWith()
    .text('C')
    .end()
    .eof()
    .get());

  expect(errors.length).toEqual(1);
});

test('repeated', () => {
  const { root, errors } = new CodeBuilder().repeated(['a']).section(['b']).text('B').end().end().eof().get();

  expect(errors).toEqual([]);
  expect(root.code).toEqual([O.ROOT, 1, [[O.REPEATED, ['a'], [[O.SECTION, ['b'], [[O.TEXT, 'B']], O.END]], O.END, []]], O.EOF]);
});

test('repeated with or branch', () => {
  const { root, errors } = new CodeBuilder().repeated(['a']).text('A').or().text('B').end().eof().get();

  expect(errors).toEqual([]);
  expect(root.code).toEqual([
    O.ROOT,
    1,
    [[O.REPEATED, ['a'], [[O.TEXT, 'A']], [O.OR_PREDICATE, 0, 0, [[O.TEXT, 'B']], O.END], []]],
    O.EOF,
  ]);
});

test('repeated with or branch and alternates block', () => {
  const { root, errors } = new CodeBuilder().repeated(['a']).text('A').alternatesWith().or().text('B').end().eof().get();

  expect(errors).toEqual([]);
  expect(root.code).toEqual([
    O.ROOT,
    1,
    [[O.REPEATED, ['a'], [[O.TEXT, 'A']], [O.OR_PREDICATE, 0, 0, [[O.TEXT, 'B']], O.END], []]],
    O.EOF,
  ]);
});

test('repeated with or branch and alternates block 2', () => {
  const { root, errors } = new CodeBuilder()
    .repeated(['a'])
    .text('A')
    .alternatesWith()
    .section(['b'])
    .text('---')
    .end()
    .or()
    .text('B')
    .end()
    .eof()
    .get();

  expect(errors).toEqual([]);
  expect(root.code).toEqual([
    O.ROOT,
    1,
    [
      [
        O.REPEATED,
        ['a'],
        [
          [O.TEXT, 'A'],
          [O.SECTION, ['b'], [[O.TEXT, '---']], O.END],
        ],
        [O.OR_PREDICATE, 0, 0, [[O.TEXT, 'B']], O.END],
        [],
      ],
    ],
    O.EOF,
  ]);
});

test('section invalid', () => {
  let errors;

  ({ errors } = new CodeBuilder().section(['foo', 'bar']).text('hi').eof().get());

  expect(errors.length).toEqual(1);

  ({ errors } = new CodeBuilder().section(['a', 'b', 'c']).text('A').alternatesWith().end().eof().get());

  expect(errors.length).toEqual(1);
});

test('section with or branch', () => {
  const { root, errors } = new CodeBuilder().section(['foo', 'bar']).text('hello').or().text('goodbye').end().eof().get();

  expect(errors).toEqual([]);
  expect(root.code).toEqual([
    O.ROOT,
    1,
    [[O.SECTION, ['foo', 'bar'], [[O.TEXT, 'hello']], [O.OR_PREDICATE, 0, 0, [[O.TEXT, 'goodbye']], O.END]]],
    O.EOF,
  ]);
});

test('sections nested', () => {
  const { root, errors } = new CodeBuilder()
    .section(['foo'])
    .text('A')
    .section(['bar'])
    .text('B')
    .section(['baz'])
    .text('C')
    .end()
    .end()
    .end()
    .eof()
    .get();

  expect(errors).toEqual([]);
  expect(root.code).toEqual([
    O.ROOT,
    1,
    [
      [
        O.SECTION,
        ['foo'],
        [
          [O.TEXT, 'A'],
          [
            O.SECTION,
            ['bar'],
            [
              [O.TEXT, 'B'],
              [O.SECTION, ['baz'], [[O.TEXT, 'C']], O.END],
            ],
            O.END,
          ],
        ],
        O.END,
      ],
    ],
    O.EOF,
  ]);
});

test('struct', () => {
  const { root, errors } = new CodeBuilder().text('A').struct({ mydata: 'foo' }).text('B').end().text('C').eof().get();
  expect(errors).toEqual([]);
  expect(root.code).toEqual([
    O.ROOT,
    1,
    [
      [O.TEXT, 'A'],
      [O.STRUCT, { mydata: 'foo' }, [[O.TEXT, 'B']]],
      [O.TEXT, 'C'],
    ],
    O.EOF,
  ]);
});
