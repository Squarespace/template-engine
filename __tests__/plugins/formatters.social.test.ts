import { join } from 'path';
import { Context } from '../../src/context';
import { SOCIAL_FORMATTERS as TABLE } from '../../src/plugins/formatters.social';
import { Node } from '../../src/node';
import { TemplateTestLoader } from '../loader';
import { Variable } from '../../src/variable';

const loader = new TemplateTestLoader(join(__dirname, 'resources'));
const variables = (...n: any[]) => n.map((v, i) => new Variable('var' + i, v));

// TODO: create external test cases for 'activate twitter links' here and for Java compiler.
test('activate twitter links', () => {
  const impl = TABLE['activate-twitter-links'];

  const ctx = new Context({});
  const vars = variables(new Node('#Foo and #Bar'));
  impl.apply([], vars, ctx);
  const result = vars[0].get();
  expect(result).toContain('<a target="new" href="https://twitter.com/hashtag/Foo?src=hash">#Foo</a>');
  expect(result).toContain('<a target="new" href="https://twitter.com/hashtag/Bar?src=hash">#Bar</a>');
});

loader.paths('f-activate-twitter-links-%N.html').forEach(path => {
  test(`${path}`, () => loader.execute(path));
});

loader.paths('f-comment-count-%N.html').forEach(path => {
  test(`comment count - ${path}`, () => loader.execute(path));
});

loader.paths('f-comment-link-%N.html').forEach(path => {
  test(`comment link - ${path}`, () => loader.execute(path));
});

loader.paths('f-comments-%N.html').forEach(path => {
  test(`comments - ${path}`, () => loader.execute(path));
});

loader.paths('f-like-button-%N.html').forEach(path => {
  test(`like button - ${path}`, () => loader.execute(path));
});

loader.paths('f-google-calendar-url-%N.html').forEach(path => {
  test(`google calendar url - ${path}`, () => loader.execute(path));
});

loader.paths('f-social-button-%N.html').forEach(path => {
  test(`social button - ${path}`, () => loader.execute(path));
});

loader.paths('f-social-button-inline-%N.html').forEach(path => {
  test(`social button inline - ${path}`, () => loader.execute(path));
});

loader.paths('f-twitter-follow-button-%N.html').forEach(path => {
  test(`twitter follow button - ${path}`, () => loader.execute(path));
});
