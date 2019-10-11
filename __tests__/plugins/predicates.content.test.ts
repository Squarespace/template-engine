import { join } from 'path';
import { pathseq } from '../helpers';
import { framework } from '../cldr';
import { TemplateTestLoader } from '../loader';
import { CONTENT_PREDICATES as Content } from '../../src/plugins/predicates.content';
import { Context } from '../../src/context';

const loader = new TemplateTestLoader(join(__dirname, 'resources'));

test('background source', () => {
  loader.execute('p-background-source.html');
});

test('calendar view', () => {
  loader.execute('p-calendar-view.html');
});

pathseq('p-child-images-%N.html', 4).forEach(path => {
  test(`child images - ${path}`, () => loader.execute(path));
});

test('clickable', () => {
  loader.execute('p-clickable.html');
});

test('collection page', () => {
  loader.execute('p-collection-page.html');
});

test('collection template page', () => {
  loader.execute('p-collection-template-page.html');
});

test('collection', () => {
  loader.execute('p-collection.html');
});

test('collection type name equals', () => {
  loader.execute('p-collection-type-name-equals.html');
});

test('excerpt', () => {
  loader.execute('p-excerpt.html');
});

test('external link', () => {
  loader.execute('p-external-link.html');
});

test('folder', () => {
  loader.execute('p-folder.html');
});

test('gallery autoplay', () => {
  loader.execute('p-gallery-boolean.html');
});

test('gallery design', () => {
  loader.execute('p-gallery-select.html');
});

test('gallery meta', () => {
  loader.execute('p-gallery-meta.html');
});

test('has multiple', () => {
  loader.execute('p-has-multiple.html');
});

test('index', () => {
  loader.execute('p-index.html');
});

test('location', () => {
  loader.execute('p-location.html');
});

test('main image', () => {
  loader.execute('p-main-image.html');
});

test('passthrough', () => {
  loader.execute('p-passthrough.html');
});

test('record types', () => {
  loader.execute('p-record-type.html');
});

test('redirect', () => {
  loader.execute('p-redirect.html');
});

test('same day', () => {
  const cldr = framework.get('en');
  const impl = Content['same-day?'];
  const make = (startDate: number, endDate: number) =>
    new Context({ startDate, endDate }, { cldr });

  // Nov 15 2013 - 123030 UTC
  const instant = 1384518630000;

  let ctx = make(instant - (3600 * 1000), instant);
  expect(impl.apply([], ctx)).toEqual(true);

  ctx = make(instant, instant - (86400 * 1000));
  expect(impl.apply([], ctx)).toEqual(false);

  ctx = make(instant, instant - (86400 * 1000 * 2));
  expect(impl.apply([], ctx)).toEqual(false);
});

test('service name email', () => {
  loader.execute('p-service-name-email.html');
});

test('show past events', () => {
  loader.execute('p-show-past-events.html');
});
