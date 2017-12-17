
import { makeSuite, pad, repeat } from './util';
import Compiler, { Parser } from '../src';
import Sink from '../src/sink';


const engineSuite = makeSuite('Execute');

const compiler = new Compiler();

const sizes = [1, 4, 16, 64, 256, 1024];
// const sizes = [1, 4];
const padding = 32;


let base = pad(padding, 'fooooooooooooooooooooo', 'x');
sizes.forEach(n => {
  const source = repeat(n, base);
  const desc = `- text ${n} (${source.length} chars)`;
  const { code } = compiler.parse(source);
  const json = {};

  engineSuite.add(`execute ${desc}`, () => {
    compiler.execute({ code, json });
  });
});


base = pad(padding, '{a|html}{b}{a|html|json}{b}{c}', 'x');
sizes.forEach(n => {
  const source = repeat(n, base);
  const desc = `- vars ${n} (${source.length} chars)`;
  const { code } = compiler.parse(source);
  const json = { a: '<tag>', b: 3.14159, c: 'hello' };

  engineSuite.add(`execute ${desc}`, () => {
    compiler.execute({ code, json });
  });
});


base = pad(padding, '{.section a}{b}{.end}', 'x');
sizes.forEach(n => {
  const source = repeat(n, base);
  const desc = `- section ${n} (${source.length} chars)`;
  const { code } = compiler.parse(source);
  const json = { a: { b: 'hello' } };

  engineSuite.add(`execute ${desc}`, () => {
    compiler.execute({ code, json });
  });
});


base = pad(padding, '{.var @foo a.b.c}{@foo.d|json}', 'x');
sizes.forEach(n => {
  const source = repeat(n, base);
  const desc = `- bindvar ${n} (${source.length} chars)`;
  const { code } = compiler.parse(source);
  const json = { a: { b: { c: { d: 'hello' } } } };

  engineSuite.add(`execute ${desc}`, () => {
    compiler.execute({ code, json });
  });
});

const options = { async: false, delay: 1 };

engineSuite.run(options);
