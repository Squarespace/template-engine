
import { makeSuite, pad, repeat } from './util';
import Compiler, { Parser } from '../src';
import Sink from '../src/sink';


const parseSuite = makeSuite('Parse');
const assembleSuite = makeSuite('Parse + Assemble');

const compiler = new Compiler();
const nullSink = new Sink();

const sizes = [1, 4, 16, 64, 256, 1024];
const padding = 32;


let base = pad(padding, 'fooooooooooooooooooooo', 'x');
sizes.forEach(n => {
  const source = repeat(n, base);
  const desc = `- text ${n} (${source.length} chars)`;

  parseSuite.add(`parse ${desc}`, () => {
    const parser = new Parser(source, nullSink);
    parser.parse();
  });

  assembleSuite.add(`parse + assemble ${desc}`, () => {
    compiler.parse(source);
  });
});


base = pad(padding, '{a|html}{b}{c|html|json}{d}{e}', 'x');
sizes.forEach(n => {
  const source = repeat(n, base);
  const desc = `- vars ${n} (${source.length} chars)`;

  parseSuite.add(`parse ${desc}`, () => {
    const parser = new Parser(source, nullSink);
    parser.parse();
  });

  assembleSuite.add(`parse + assemble ${desc}`, () => {
    compiler.parse(source);
  });
});


base = pad(padding, '{.section a}{@|html}{.end}', 'x');
sizes.forEach(n => {
  const source = repeat(n, base);
  const desc = `- section ${n} (${source.length} chars)`;

  parseSuite.add(`parse ${desc}`, () => {
    const parser = new Parser(source, nullSink);
    parser.parse();
  });

  assembleSuite.add(`parse + assemble ${desc}`, () => {
    compiler.parse(source);
  });
});


base = pad(padding, '{.var @foo a.b.c}{@foo.d|json}', 'x');
sizes.forEach(n => {
  const source = repeat(n, base);
  const desc = `- bindvar ${n} (${source.length} chars)`;

  parseSuite.add(`parse ${desc}`, () => {
    const parser = new Parser(source, nullSink);
    parser.parse();
  });

  assembleSuite.add(`parse + assemble ${desc}`, () => {
    compiler.parse(source);
  });
});

const options = { async: false, delay: 1 };

parseSuite.run(options);
assembleSuite.run(options);
