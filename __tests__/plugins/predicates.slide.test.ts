import { join } from 'path';
import { CompatLevel } from '../../src/compat/compat-level';
import { Compiler } from '../../src/compiler';
import { Context } from '../../src/context';
import { CurrentTypePredicate } from '../../src/plugins/predicates.slide';
import { TemplateTestLoader } from '../loader';

const loader = new TemplateTestLoader(join(__dirname, 'resources'));

test('current-type?', () => {
  loader.execute('p-current-type.html');
});

test('current-type? arity', () => {
  const compiler = new Compiler();
  const impl = new CurrentTypePredicate();
  const render = (compat?: CompatLevel, template = '{.current-type?}yes{.or}no{.end}') => {
    const { ctx, errors } = compiler.execute({
      code: template,
      json: { currentType: 5 },
      compat,
    });
    return { output: ctx.render(), errors };
  };

  // Legacy, no arguments reaches args[0] and throws at render time. The
  // engine records the error and skips both branches of the if.
  for (const compat of [undefined, CompatLevel.at(1)]) {
    const legacy = render(compat);
    expect(legacy.errors.length).toEqual(1);
    expect(legacy.errors[0].type).toEqual('engine');
    expect(legacy.errors[0].message).toContain('IndexOutOfBoundsException');
    expect(legacy.errors[0].message).toContain('Index: 0, Size: 0');
    expect(legacy.output).toEqual('');
  }

  // The direct call throws the same shape at each legacy level.
  for (const compat of [undefined, CompatLevel.at(1)]) {
    const ctx = new Context({ currentType: 5 }, { compat });
    expect(() => impl.apply([], ctx)).toThrow('Index: 0, Size: 0');
    try {
      impl.apply([], ctx);
    } catch (e) {
      expect((e as Error).name).toEqual('IndexOutOfBoundsException');
    }
  }

  // Fixed, no arguments is not a match and the .or branch renders.
  for (const compat of [CompatLevel.at(2), CompatLevel.fixed()]) {
    const fixed = render(compat);
    expect(fixed.errors).toEqual([]);
    expect(fixed.output).toEqual('no');
    expect(impl.apply([], new Context({ currentType: 5 }, { compat }))).toEqual(false);
  }

  // Extra args are ignored, matching the Java engine: first arg wins.
  const gallery = render(CompatLevel.fixed(), '{.current-type? gallery extra}a{.or}b{.end}');
  expect(gallery.errors).toEqual([]);
  expect(gallery.output).toEqual('a');
  const blog = render(CompatLevel.fixed(), '{.current-type? blog extra}a{.or}b{.end}');
  expect(blog.errors).toEqual([]);
  expect(blog.output).toEqual('b');
});
