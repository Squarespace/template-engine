import { Compiler } from '../src/compiler';
import { CompatLevel } from '../src/compat/compat-level';
import { Context } from '../src/context';
import { TwitterFollowButtonFormatter } from '../src/plugins/formatters.social';
import { Variable } from '../src/variable';

const twitter = () => new TwitterFollowButtonFormatter();

/**
 * Port of the Java SocialFormattersTest.testTwitterFollowButton rows. The
 * patch thresholds sit at level 1, so the default level keeps the released
 * behavior: an empty derived username throws, and the username goes into the
 * attribute unescaped. Level 1 and above render nothing without error and
 * escape the username.
 */
describe('twitter-follow-button compat', () => {
  test('legacy throws on an empty derived username', () => {
    // Direct formatter call, no engine, mirrors the Java assertion that the
    // legacy index into the split array throws ArrayIndexOutOfBoundsException.
    const ctx = new Context({ userName: '', profileUrl: '' });
    const vars = [new Variable('var', ctx.node())];
    let caught: unknown;
    try {
      twitter().apply([], vars, ctx);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeDefined();
    expect((caught as Error).name).toEqual('ArrayIndexOutOfBoundsException');
    expect((caught as Error).message).toContain('Index 0 out of bounds for length 0');
  });

  test('legacy renders with exactly one recorded error', () => {
    // Through a full execute the engine records the throw; this is the
    // unexpectedError shape from errors.ts and its message carries the
    // formatter exception name.
    const compiler = new Compiler();
    const { ctx, errors } = compiler.execute({
      code: 'x {@|twitter-follow-button} x',
      json: { userName: '', profileUrl: '' },
    });
    expect(ctx.render()).toEqual('x  x');
    expect(errors.length).toEqual(1);
    expect(errors[0].message).toContain('ArrayIndexOutOfBoundsException');
  });

  test('fixed renders nothing without error', () => {
    const compiler = new Compiler();
    const { ctx, errors } = compiler.execute({
      code: 'x {@|twitter-follow-button} x',
      json: { userName: '', profileUrl: '' },
      compat: CompatLevel.at(1),
    });
    expect(ctx.render()).toEqual('x  x');
    expect(errors.length).toEqual(0);
  });

  test('fixed escapes the username in the attribute', () => {
    const ctx = new Context({ userName: 'a"b' });
    ctx.setCompat(CompatLevel.fixed());
    const vars = [new Variable('var', ctx.node())];
    twitter().apply([], vars, ctx);
    expect(vars[0].get()).toContain('data-username="a&quot;b"');
  });

  test('legacy leaves the username unescaped in the attribute', () => {
    const ctx = new Context({ userName: 'a"b' });
    const vars = [new Variable('var', ctx.node())];
    twitter().apply([], vars, ctx);
    expect(vars[0].get()).toContain('data-username="a"b"');
  });
});
