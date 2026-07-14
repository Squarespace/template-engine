import { execFile } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import * as fs from 'fs';

/**
 * Spawn-level tests for the templatec CLI, port of the Java TemplateC
 * compat-flag surface (template-compiler TemplateC.java). Until a patch is
 * wired to a code path, the level flags cannot change output, so the
 * output-identity assertions are the real check here.
 */

const BIN = join(__dirname, '..', 'bin', 'templatec.js');

interface CliError extends Error {
  code?: number;
  stdout: string;
  stderr: string;
}

interface CliResult {
  stdout: string;
  stderr: string;
}

const run = (args: string[]): Promise<CliResult> =>
  new Promise((resolve, reject) => {
    execFile(process.execPath, [BIN, ...args], { encoding: 'utf-8' }, (error, stdout, stderr) => {
      if (error) {
        const err = error as CliError;
        err.stdout = stdout;
        err.stderr = stderr;
        reject(err);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });

const runFail = async (args: string[]): Promise<CliError | undefined> => {
  try {
    await run(args);
  } catch (e) {
    return e as CliError;
  }
  return undefined;
};

const TEMPLATE = '{s|truncate 3}';
const DATA = '{"s": "abcdef"}';
const OUTPUT = 'abc...';

describe('templatec compat flags', () => {
  let dir: string;
  let template: string;
  let data: string;

  const runTemplate = (flags: string[]) => run([...flags, '-t', template, '-j', data]);

  beforeEach(() => {
    dir = fs.mkdtempSync(join(tmpdir(), 'templatec-'));
    template = join(dir, 'template.html');
    data = join(dir, 'data.json');
    fs.writeFileSync(template, TEMPLATE);
    fs.writeFileSync(data, DATA);
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('no flags renders the released output', async () => {
    const res = await runTemplate([]);
    expect(res.stdout).toBe(OUTPUT);
  });

  test('--compat-level 0 matches no flags', async () => {
    const plain = await runTemplate([]);
    const leveled = await runTemplate(['--compat-level', '0']);
    expect(leveled.stdout).toBe(plain.stdout);
  });

  test('--compat-level N keeps the output while no patch is wired', async () => {
    const plain = await runTemplate([]);
    for (const level of ['1', '2', '3', '999']) {
      const res = await runTemplate(['--compat-level', level]);
      expect(res.stdout).toBe(plain.stdout);
    }
  });

  test('unknown --compat-patch names the entry, prints usage, exits nonzero', async () => {
    const err = await runFail(['--compat-patch', 'BOGUS', '-t', template, '-j', data]);
    expect(err).toBeDefined();
    expect(err!.code).not.toBe(0);
    expect(err!.stderr).toContain('BOGUS');
    expect(err!.stdout).toContain('templatec OPTIONS');
    expect(err!.stdout).toContain('--compat-level');
    expect(err!.stdout).toContain('--compat-patch');
  });

  test('--compat-patch repeats accumulate in order', async () => {
    // A bogus first entry must error before a valid second is reached; an
    // overwriting parser would keep only MOD_ZERO and run clean.
    const err = await runFail(['--compat-patch', 'BOGUS', '--compat-patch', 'MOD_ZERO', '-t', template, '-j', data]);
    expect(err).toBeDefined();
    expect(err!.stderr).toContain('BOGUS');
  });

  test('valid repeated --compat-patch keeps the released output', async () => {
    const plain = await runTemplate([]);
    const patched = await runTemplate(['--compat-patch', 'mod_zero', '--compat-patch', 'TRUNCATE_NEGATIVE']);
    expect(patched.stdout).toBe(plain.stdout);
  });

  test('a negative --compat-level is a usage error', async () => {
    const err = await runFail(['--compat-level', '-1', '-t', template, '-j', data]);
    expect(err).toBeDefined();
    expect(err!.code).not.toBe(0);
    expect(err!.stdout).toContain('templatec OPTIONS');
  });

  test('a non-integer --compat-level is a usage error', async () => {
    for (const bad of ['x', '1.5', '']) {
      const err = await runFail(['--compat-level', bad, '-t', template, '-j', data]);
      expect(err).toBeDefined();
      expect(err!.code).not.toBe(0);
    }
  });

  test('a pre-parsed .json template executes at the level', async () => {
    const { stdout: code } = await run(['-t', template, '-d']);
    const codefile = join(dir, 'template.json');
    fs.writeFileSync(codefile, code);
    const viaCode = await run(['--compat-level', '2', '-t', codefile, '-j', data]);
    const viaHtml = await runTemplate(['--compat-level', '2']);
    expect(viaCode.stdout).toBe(viaHtml.stdout);
    expect(viaCode.stdout).toBe(OUTPUT);
  });
});
