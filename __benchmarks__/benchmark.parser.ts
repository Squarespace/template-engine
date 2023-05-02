import { makeSuite, pad } from './util';
import { Compiler, Parser, StickyMatcher } from '../src';
import { Sink } from '../src/sink';
import { Opcode } from '../src/opcodes';
import { Instruction } from '../src/instructions';
import { repeat } from '../src/util';

class DummySink extends Sink {
  accept(inst: Instruction | Opcode): void {}
  complete(): void {}
  error(err: any): void {}
}

const parseSuite = makeSuite('Parse');
const assembleSuite = makeSuite('Parse + Assemble');

const compiler = new Compiler();
const nullSink = new DummySink();

const iterations = [1, 4, 16, 64, 256, 1024, 4096];
const padding = 32;

const MATCHER = new StickyMatcher('');
let base: string;

base = pad(padding, '{.eval 17.5 * max(-2, 3) == "a"}', 'x');
iterations.forEach((n) => {
  const source = repeat(n, base);
  const desc = `- eval ${n} (${source.length} chars)`;

  parseSuite.add(`parse ${desc}`, () => {
    const parser = new Parser(source, nullSink, MATCHER);
    parser.parse();
  });

  assembleSuite.add(`parse + assemble ${desc}`, () => {
    compiler.parse(source);
  });
});

base = pad(padding, 'fooooooooooooooooooooo', 'x');
iterations.forEach((n) => {
  const source = repeat(n, base);
  const desc = `- text ${n} (${source.length} chars)`;

  parseSuite.add(`parse ${desc}`, () => {
    const parser = new Parser(source, nullSink, MATCHER);
    parser.parse();
  });

  assembleSuite.add(`parse + assemble ${desc}`, () => {
    compiler.parse(source);
  });
});

base = pad(padding, 'fooooooooooooooooooooo{a}', 'x');
iterations.forEach((n) => {
  const source = repeat(n, base);
  const desc = `- text + var ${n} (${source.length} chars)`;

  parseSuite.add(`parse ${desc}`, () => {
    const parser = new Parser(source, nullSink, MATCHER);
    parser.parse();
  });

  assembleSuite.add(`parse + assemble ${desc}`, () => {
    compiler.parse(source);
  });
});

base = pad(padding, '{a|html}{b}{c|html|json}{d}{e}', 'x');
iterations.forEach((n) => {
  const source = repeat(n, base);
  const desc = `- vars ${n} (${source.length} chars)`;

  parseSuite.add(`parse ${desc}`, () => {
    const parser = new Parser(source, nullSink, MATCHER);
    parser.parse();
  });

  assembleSuite.add(`parse + assemble ${desc}`, () => {
    compiler.parse(source);
  });
});

base = pad(padding, '{.section a}{@|html}{.end}', 'x');
iterations.forEach((n) => {
  const source = repeat(n, base);
  const desc = `- section ${n} (${source.length} chars)`;

  parseSuite.add(`parse ${desc}`, () => {
    const parser = new Parser(source, nullSink, MATCHER);
    parser.parse();
  });

  assembleSuite.add(`parse + assemble ${desc}`, () => {
    compiler.parse(source);
  });
});

base = pad(padding, '{.repeated section a}{b}{.end}', 'x');
iterations.forEach((n) => {
  const source = repeat(n, base);
  const desc = `- repeated ${n} (${source.length} chars)`;

  parseSuite.add(`parse ${desc}`, () => {
    const parser = new Parser(source, nullSink, MATCHER);
    parser.parse();
  });

  assembleSuite.add(`parse + assemble ${desc}`, () => {
    compiler.parse(source);
  });
});

base = pad(padding, '{.var @foo a.b.c}{@foo.d|json}', 'x');
iterations.forEach((n) => {
  const source = repeat(n, base);
  const desc = `- bindvar ${n} (${source.length} chars)`;

  parseSuite.add(`parse ${desc}`, () => {
    const parser = new Parser(source, nullSink, MATCHER);
    parser.parse();
  });

  assembleSuite.add(`parse + assemble ${desc}`, () => {
    compiler.parse(source);
  });
});

export { assembleSuite, parseSuite };
