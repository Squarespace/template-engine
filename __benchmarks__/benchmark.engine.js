import { makeSuite, pad } from './util';
import Compiler from '../src';
import { repeat } from '../src/util';


const executeSuite = makeSuite('Execute');

const compiler = new Compiler();

const iterations = [1, 4, 16, 64, 256, 1024, 4096];
const padding = 32;


let base = pad(padding, 'fooooooooooooooooooooo', 'x');
iterations.forEach(n => {
  const source = repeat(n, base);
  const desc = `- text ${n} (${source.length} chars)`;
  const { code } = compiler.parse(source);
  const json = {};

  executeSuite.add(`execute ${desc}`, () => {
    compiler.execute({ code, json });
  });
});


base = pad(padding, 'fooooooooooooooooooooo{a}', 'x');
iterations.forEach(n => {
  const source = repeat(n, base);
  const desc = `- text + var ${n} (${source.length} chars)`;
  const { code } = compiler.parse(source);
  const json = { a: 'hello' };

  executeSuite.add(`execute ${desc}`, () => {
    compiler.execute({ code, json });
  });
});


base = pad(padding, '{a|html}{b}{a|html|json}{b}{c}', 'x');
iterations.forEach(n => {
  const source = repeat(n, base);
  const desc = `- vars ${n} (${source.length} chars)`;
  const { code } = compiler.parse(source);
  const json = { a: '<tag>', b: 3.14159, c: 'hello' };

  executeSuite.add(`execute ${desc}`, () => {
    compiler.execute({ code, json });
  });
});


base = pad(padding, '{.section a}{b}{.end}', 'x');
iterations.forEach(n => {
  const source = repeat(n, base);
  const desc = `- section ${n} (${source.length} chars)`;
  const { code } = compiler.parse(source);
  const json = { a: { b: 'hello' } };

  executeSuite.add(`execute ${desc}`, () => {
    compiler.execute({ code, json });
  });
});


base = pad(padding, '{.repeated section a}{b}{.end}', 'x');
iterations.forEach(n => {
  const source = repeat(n, base);
  const desc = `- repeated ${n} (${source.length} chars)`;
  const { code } = compiler.parse(source);
  const json = { a: [{ b: 'hello' }, { b: 'world' }] };

  executeSuite.add(`execute ${desc}`, () => {
    compiler.execute({ code, json });
  });
});


base = pad(padding, '{.var @foo a.b.c}{@foo.d|json}', 'x');
iterations.forEach(n => {
  const source = repeat(n, base);
  const desc = `- bindvar ${n} (${source.length} chars)`;
  const { code } = compiler.parse(source);
  const json = { a: { b: { c: { d: 'hello' } } } };

  executeSuite.add(`execute ${desc}`, () => {
    compiler.execute({ code, json });
  });
});

export {
  executeSuite,
};
