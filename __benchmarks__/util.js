import { Suite } from 'benchmark';
import beautify from 'beautify-benchmark';
import chalk from 'chalk';


export const onComplete = function() {
  beautify.log();
  console.log(`Fastest is: ${chalk.green(this.filter('fastest').map('name'))}`);
  console.log(`Slowest is: ${chalk.red(this.filter('slowest').map('name'))}`);
};

export const onCycle = e => beautify.add(e.target);

export const makeSuite = (name) => {
  const suite = new Suite(name);
  suite.on('cycle', onCycle);
  suite.on('complete', onComplete);
  return suite;
};


export const pad = (n, str, repl) => {
  if (n < str.length) {
    throw new Error(`String is longer than the padding amount ${n}`);
  }
  if (n === str.length) {
    return str;
  }

  let res = str;
  let i = 0;
  while (res.length < n) {
    res += repl[i++ % repl.length];
  }
  return res;
};

export const repeat = (n, str) => {
  if (n === 1) {
    return str;
  }
  let res = '';
  for (let i = 0; i < n; i++) {
    res += str;
  }
  return res;
};
