import { MISSING_NODE, Node } from '../../src/node';
import { getFirstMatchingNode, makeSocialButton } from '../../src/plugins/util.social';

test('get first matching node', () => {
  const node = new Node({
    foo: 1,
    bar: 2,
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

// Hostile values: a quote in any attribute must not break out of the
// markup. Mirrors the Java testSocialButton JSON.
const hostile = () => ({
  systemDataId: 'id"x',
  assetUrl: 'http://evil.com/a"><script>',
  recordType: '1">',
  fullUrl: 'http://full.com/x</script>',
  title: 't"><script>alert(2)</script>',
});

// Present but empty assetUrl falls back to mainImage.assetUrl. Mirrors the
// Java testSocialButtonEmptyAssetUrlFallsBack JSON.
const emptyAssetUrl = () => ({
  systemDataId: '560c37c1a7c8465c4a71d99a',
  assetUrl: '',
  mainImage: { assetUrl: 'http://img.com/pic.jpg' },
  recordType: 1,
  title: 'foo image',
  fullUrl: 'http://full.com/url',
});

test('make social button: hostile attribute values raw at legacy, escaped when fixed', () => {
  const website = new Node({ shareButtonOptions: ['foo'] });
  const item = () => new Node(hostile());

  // Legacy keeps the four attribute values raw, so the hostile values
  // break out of the attribute; data-title is escaped. The flag defaults
  // to legacy.
  const legacy = '<div class="squarespace-social-buttons button-style" data-system-data-id="id"x" ' +
    'data-asset-url="http://evil.com/a"><script>" data-record-type="1">" ' +
    'data-full-url="http://full.com/x</script>" data-title="t&quot;&gt;&lt;script&gt;alert(2)&lt;/script&gt;"></div>';
  expect(makeSocialButton(website, item(), false)).toEqual(legacy);
  expect(makeSocialButton(website, item(), false, true)).toEqual(legacy);

  // Fixed routes all four values through the attribute escape.
  const fixed = '<div class="squarespace-social-buttons button-style" data-system-data-id="id&quot;x" ' +
    'data-asset-url="http://evil.com/a&quot;&gt;&lt;script&gt;" data-record-type="1&quot;&gt;" ' +
    'data-full-url="http://full.com/x&lt;/script&gt;" data-title="t&quot;&gt;&lt;script&gt;alert(2)&lt;/script&gt;"></div>';
  expect(makeSocialButton(website, item(), false, false)).toEqual(fixed);

  // Same split for the inline form.
  expect(makeSocialButton(website, item(), true)).toContain('data-system-data-id="id"x"');
  expect(makeSocialButton(website, item(), true, false)).toContain('data-system-data-id="id&quot;x"');
});

test('make social button: assetUrl fallback at legacy, fixed and null', () => {
  const website = new Node({ shareButtonOptions: ['foo'] });

  // Legacy keeps a present but empty assetUrl as-is; legacy also keeps a
  // null assetUrl as-is (Node.asString of null is the empty string).
  expect(makeSocialButton(website, new Node(emptyAssetUrl()), false, true)).toContain('data-asset-url=""');
  expect(makeSocialButton(website, new Node({ ...emptyAssetUrl(), assetUrl: null }), false, true)).toContain(
    'data-asset-url=""'
  );

  // Fixed falls back on an empty assetUrl.
  expect(makeSocialButton(website, new Node(emptyAssetUrl()), false, false)).toContain(
    'data-asset-url="http://img.com/pic.jpg"'
  );

  // Fixed falls back on a null assetUrl too.
  expect(makeSocialButton(website, new Node({ ...emptyAssetUrl(), assetUrl: null }), false, false)).toContain(
    'data-asset-url="http://img.com/pic.jpg"'
  );

  // Fixed falls back on a missing assetUrl after the empty and null cases.
  const noAssetUrl = { ...emptyAssetUrl(), assetUrl: undefined };
  expect(makeSocialButton(website, new Node(noAssetUrl), false, false)).toContain(
    'data-asset-url="http://img.com/pic.jpg"'
  );
});
