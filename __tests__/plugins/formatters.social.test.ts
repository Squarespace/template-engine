import { join } from 'path';
import { Context } from '../../src/context';
import { CompatLevel } from '../../src/compat/compat-level';
import { SOCIAL_FORMATTERS as TABLE } from '../../src/plugins/formatters.social';
import { Node } from '../../src/node';
import { TemplateTestLoader } from '../loader';
import { Formatter } from '../../src/plugin';
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

loader.paths('f-activate-twitter-links-%N.html').forEach((path) => {
  test(`${path}`, () => loader.execute(path));
});

loader.paths('f-comment-count-%N.html').forEach((path) => {
  test(`comment count - ${path}`, () => loader.execute(path));
});

loader.paths('f-comment-link-%N.html').forEach((path) => {
  test(`comment link - ${path}`, () => loader.execute(path));
});

loader.paths('f-comments-%N.html').forEach((path) => {
  test(`comments - ${path}`, () => loader.execute(path));
});

loader.paths('f-like-button-%N.html').forEach((path) => {
  test(`like button - ${path}`, () => loader.execute(path));
});

loader.paths('f-google-calendar-url-%N.html').forEach((path) => {
  test(`google calendar url - ${path}`, () => loader.execute(path));
});

loader.paths('f-social-button-%N.html').forEach((path) => {
  test(`social button - ${path}`, () => loader.execute(path));
});

loader.paths('f-social-button-inline-%N.html').forEach((path) => {
  test(`social button inline - ${path}`, () => loader.execute(path));
});

const SOCIAL_BUTTON = TABLE['social-button'];
const SOCIAL_BUTTON_INLINE = TABLE['social-button-inline'];

// Hostile values: a quote in any attribute must not break out of the
// markup. Mirrors the Java testSocialButton JSON.
const hostile = {
  website: { shareButtonOptions: ['foo'] },
  systemDataId: 'id"x',
  assetUrl: 'http://evil.com/a"><script>',
  recordType: '1">',
  fullUrl: 'http://full.com/x</script>',
  title: 't"><script>alert(2)</script>',
};

// Present but empty assetUrl falls back to mainImage.assetUrl. Mirrors the
// Java testSocialButtonEmptyAssetUrlFallsBack JSON.
const emptyAssetUrl = {
  website: { shareButtonOptions: ['foo'] },
  systemDataId: '560c37c1a7c8465c4a71d99a',
  assetUrl: '',
  mainImage: { assetUrl: 'http://img.com/pic.jpg' },
  recordType: 1,
  title: 'foo image',
  fullUrl: 'http://full.com/url',
};

/**
 * Mirror of the Java UnitTestBase.format helper: the context root and the
 * variable node are the same JSON object, so the formatter resolves
 * 'website' and reads the item fields from the same node.
 */
const format = (impl: Formatter, json: unknown, level: number) => {
  const node = new Node(json);
  const ctx = new Context(node, { compat: CompatLevel.at(level) });
  const vars = variables(node);
  impl.apply([], vars, ctx);
  return vars[0].get();
};

// Hostile markup passes through raw while the legacy path is active and is
// escaped at level 2, where @user and #tag still become links. Mirrors the
// Java testActivateTwitterLinksEscapesHtml JSON and the level-2 fixture
// output.
const TWITTER_LINKS = TABLE['activate-twitter-links'];
const hostileMarkup = 'hello <img src=x onerror=alert(1)> @user #tag';
const hostileMarkupLegacy =
  'hello <img src=x onerror=alert(1)> ' +
  '<a target="new" href="https://twitter.com/user/">@user</a> ' +
  '<a target="new" href="https://twitter.com/hashtag/tag?src=hash">#tag</a>';
const hostileMarkupFixed =
  'hello &lt;img src=x onerror=alert(1)&gt; ' +
  '<a target="new" href="https://twitter.com/user/">@user</a> ' +
  '<a target="new" href="https://twitter.com/hashtag/tag?src=hash">#tag</a>';

// A & in a linkified url renders as &amp; inside the href at level 2.
// Mirrors the Java testActivateTwitterLinksUrlWithAmpersand JSON.
const ampersandUrl = 'go to http://example.com/x?a=1&b=2 now';
const ampersandUrlLegacy =
  'go to <a target="new" href="http://example.com/x?a=1&b=2">' +
  'http://example.com/x?a=1&b=2</a> now';
const ampersandUrlFixed =
  'go to <a target="new" href="http://example.com/x?a=1&amp;b=2">' +
  'http://example.com/x?a=1&amp;b=2</a> now';

test('activate twitter links: levels 0 and 1 linkify raw text, level 2 escapes first', () => {
  expect(format(TWITTER_LINKS, hostileMarkup, 0)).toEqual(hostileMarkupLegacy);
  expect(format(TWITTER_LINKS, hostileMarkup, 1)).toEqual(hostileMarkupLegacy);
  expect(format(TWITTER_LINKS, hostileMarkup, 2)).toEqual(hostileMarkupFixed);
});

test('activate twitter links: a url amp stays raw at levels 0 and 1, escapes in the href at level 2', () => {
  expect(format(TWITTER_LINKS, ampersandUrl, 0)).toEqual(ampersandUrlLegacy);
  expect(format(TWITTER_LINKS, ampersandUrl, 1)).toEqual(ampersandUrlLegacy);
  expect(format(TWITTER_LINKS, ampersandUrl, 2)).toEqual(ampersandUrlFixed);
});

test('social button: hostile values break out at level 0 and escape at level 2', () => {
  // Level 0 keeps the released surface: system-data-id, asset-url,
  // record-type and full-url go in raw and only data-title is escaped, so
  // the hostile values break out of the attribute.
  let result = format(SOCIAL_BUTTON, hostile, 0);
  expect(result).toContain('data-system-data-id="id"x"');
  expect(result).toContain('data-asset-url="http://evil.com/a"><script>"');
  expect(result).toContain('data-record-type="1">"');
  expect(result).toContain('data-full-url="http://full.com/x</script>"');
  expect(result).toContain('data-title="t&quot;&gt;&lt;script&gt;alert(2)&lt;/script&gt;"');
  expect(result).toContain('"><script>');

  // Level 2 routes all five values through the attribute escape.
  result = format(SOCIAL_BUTTON, hostile, 2);
  expect(result).toContain('data-system-data-id="id&quot;x"');
  expect(result).toContain('data-asset-url="http://evil.com/a&quot;&gt;&lt;script&gt;"');
  expect(result).toContain('data-record-type="1&quot;&gt;"');
  expect(result).toContain('data-full-url="http://full.com/x&lt;/script&gt;"');
  expect(result).toContain('data-title="t&quot;&gt;&lt;script&gt;alert(2)&lt;/script&gt;"');
  expect(result).not.toContain('"><script>');
});

test('social button: present but empty assetUrl falls back at level 2', () => {
  expect(format(SOCIAL_BUTTON, emptyAssetUrl, 0)).toContain('data-asset-url=""');
  expect(format(SOCIAL_BUTTON, emptyAssetUrl, 2)).toContain('data-asset-url="http://img.com/pic.jpg"');
});

test('social button: levels 0 and 1 render legacy, level 2 fixed', () => {
  const legacy =
    '<div class="squarespace-social-buttons button-style" data-system-data-id="id"x" ' +
    'data-asset-url="http://evil.com/a"><script>" data-record-type="1">" ' +
    'data-full-url="http://full.com/x</script>" data-title="t&quot;&gt;&lt;script&gt;alert(2)&lt;/script&gt;"></div>';
  const fixed =
    '<div class="squarespace-social-buttons button-style" data-system-data-id="id&quot;x" ' +
    'data-asset-url="http://evil.com/a&quot;&gt;&lt;script&gt;" data-record-type="1&quot;&gt;" ' +
    'data-full-url="http://full.com/x&lt;/script&gt;" data-title="t&quot;&gt;&lt;script&gt;alert(2)&lt;/script&gt;"></div>';
  expect(format(SOCIAL_BUTTON, hostile, 0)).toEqual(legacy);
  expect(format(SOCIAL_BUTTON, hostile, 1)).toEqual(legacy);
  expect(format(SOCIAL_BUTTON, hostile, 2)).toEqual(fixed);
});

test('social button inline: levels 0 and 1 render legacy, level 2 fixed', () => {
  const legacy =
    '<span class="squarespace-social-buttons inline-style" data-system-data-id="id"x" ' +
    'data-asset-url="http://evil.com/a"><script>" data-record-type="1">" ' +
    'data-full-url="http://full.com/x</script>" data-title="t&quot;&gt;&lt;script&gt;alert(2)&lt;/script&gt;"></span>';
  const fixed =
    '<span class="squarespace-social-buttons inline-style" data-system-data-id="id&quot;x" ' +
    'data-asset-url="http://evil.com/a&quot;&gt;&lt;script&gt;" data-record-type="1&quot;&gt;" ' +
    'data-full-url="http://full.com/x&lt;/script&gt;" data-title="t&quot;&gt;&lt;script&gt;alert(2)&lt;/script&gt;"></span>';
  expect(format(SOCIAL_BUTTON_INLINE, hostile, 0)).toEqual(legacy);
  expect(format(SOCIAL_BUTTON_INLINE, hostile, 1)).toEqual(legacy);
  expect(format(SOCIAL_BUTTON_INLINE, hostile, 2)).toEqual(fixed);
});

test('social button: levels 0 and 1 keep an empty assetUrl, level 2 falls back', () => {
  const kept =
    '<div class="squarespace-social-buttons button-style" data-system-data-id="560c37c1a7c8465c4a71d99a" ' +
    'data-asset-url="" data-record-type="1" data-full-url="http://full.com/url" data-title="foo image"></div>';
  const fellBack =
    '<div class="squarespace-social-buttons button-style" data-system-data-id="560c37c1a7c8465c4a71d99a" ' +
    'data-asset-url="http://img.com/pic.jpg" data-record-type="1" data-full-url="http://full.com/url" data-title="foo image"></div>';
  expect(format(SOCIAL_BUTTON, emptyAssetUrl, 0)).toEqual(kept);
  expect(format(SOCIAL_BUTTON, emptyAssetUrl, 1)).toEqual(kept);
  expect(format(SOCIAL_BUTTON, emptyAssetUrl, 2)).toEqual(fellBack);
});

loader.paths('f-twitter-follow-button-%N.html').forEach((path) => {
  test(`twitter follow button - ${path}`, () => loader.execute(path));
});
