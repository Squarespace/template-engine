import { Suite } from 'benchmark';
import beautify from 'beautify-benchmark';
import chalk from 'chalk';


/**
 * Constructs a benchmark suite, setting a few lifecycle handlers.
 */
export const makeSuite = (name) => {
  const suite = new Suite(name);
  suite.on('cycle', e => beautify.add(e.target));
  suite.on('complete', (e) => {
    beautify.log();
    console.log(`Fastest is: ${chalk.green(suite.filter('fastest').map('name'))}`);
    console.log(`Slowest is: ${chalk.red(suite.filter('slowest').map('name'))}`);
  });
  return suite;
};

/**
 * Pad a string to length n using the replacement string.
 */
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
