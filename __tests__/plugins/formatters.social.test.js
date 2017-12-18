import Social from '../../src/plugins/formatters.social';
import Node from '../../src/node';
import Variable from '../../src/variable';


const variables = (...n) => {
  return n.map((v, i) => new Variable('var' + i, v));
};

test('activate twitter links', () => {
  const impl = Social['activate-twitter-links'];
  const vars = variables(new Node('#foo and #bar'));
  impl.apply([], vars, null);
  const result = vars[0].get();
  expect(result).toContain('<a target="new" href="https://twitter.com/hashtag/foo?src=hash">#foo</a>');
  expect(result).toContain('<a target="new" href="https://twitter.com/hashtag/bar?src=hash">#bar</a>');
});
