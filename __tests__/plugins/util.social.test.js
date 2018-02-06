import { Node, MISSING_NODE } from '../../src/node';
import { getFirstMatchingNode, makeSocialButton } from '../../src/plugins/util.social';


test('get first matching node', () => {
  const node = new Node({
    'foo': 1,
    'bar': 2
  });
  expect(getFirstMatchingNode(node, 'foo', 'bar').value).toEqual(1);
  expect(getFirstMatchingNode(node, 'bar', 'foo').value).toEqual(2);
  expect(getFirstMatchingNode(node, 'quuz', 'baz')).toEqual(MISSING_NODE);
});


test('make social button', () => {
  let website = new Node({});
  let item = new Node({});

  expect(makeSocialButton(website, item, true)).toEqual('');
  expect(makeSocialButton(MISSING_NODE, item, true)).toEqual('');
  expect(makeSocialButton(website, MISSING_NODE, true)).toEqual('');

  website = new Node({ shareButtonOptions: [] });
  item = new Node({ fullUrl: 'https://www.squarespace.com/' });
  expect(makeSocialButton(website, MISSING_NODE, true)).toEqual('');
  expect(makeSocialButton(MISSING_NODE, item, true)).toEqual('');
});
