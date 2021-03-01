import { join } from 'path';
import { framework } from '../cldr';
import { TemplateTestLoader } from '../loader';
import { CONTENT_PREDICATES as Content } from '../../src/plugins/predicates.content';
import { Context } from '../../src/context';

const loader = new TemplateTestLoader(join(__dirname, 'resources'));

loader.paths('p-active-time-%N.html').forEach(path => {
  test(`active-time - ${path}`, () => loader.execute(path));
});

loader.paths('p-attachment-%N.html').forEach(path => {
  test(`attachment - ${path}`, () => loader.execute(path));
});

loader.paths('p-audio-%N.html').forEach(path => {
  test(`audio - ${path}`, () => loader.execute(path));
});

loader.paths('p-background-source-%N.html').forEach(path => {
  test(`background-source - ${path}`, () => loader.execute(path));
});

loader.paths('p-binary-%N.html').forEach(path => {
  test(`binary - ${path}`, () => loader.execute(path));
});

loader.paths('p-calendar-view-%N.html').forEach(path => {
  test(`calendar-view - ${path}`, () => loader.execute(path));
});

loader.paths('p-checkin-%N.html').forEach(path => {
  test(`checkin - ${path}`, () => loader.execute(path));
});

loader.paths('p-child-images-%N.html').forEach(path => {
  test(`child-images - ${path}`, () => loader.execute(path));
});

loader.paths('p-clickable-%N.html').forEach(path => {
  test(`clickable - ${path}`, () => loader.execute(path));
});

loader.paths('p-collection-page-%N.html').forEach(path => {
  test(`collection-page - ${path}`, () => loader.execute(path));
});

loader.paths('p-collection-template-page-%N.html').forEach(path => {
  test(`collection-template-page - ${path}`, () => loader.execute(path));
});

loader.paths('p-collection-type-name-equals-%N.html').forEach(path => {
  test(`collection-type-name-equals - ${path}`, () => loader.execute(path));
});

loader.paths('p-collection-%N.html').forEach(path => {
  test(`collection - ${path}`, () => loader.execute(path));
});

loader.paths('p-excerpt-%N.html').forEach(path => {
  test(`excerpt - ${path}`, () => loader.execute(path));
});

loader.paths('p-external-link-%N.html').forEach(path => {
  test(`external-link - ${path}`, () => loader.execute(path));
});

loader.paths('p-folder-%N.html').forEach(path => {
  test(`folder - ${path}`, () => loader.execute(path));
});

loader.paths('p-gallery-autoplay-%N.html').forEach(path => {
  test(`gallery-autoplay - ${path}`, () => loader.execute(path));
});

loader.paths('p-gallery-design-%N.html').forEach(path => {
  test(`gallery-design - ${path}`, () => loader.execute(path));
});

loader.paths('p-gallery-meta-%N.html').forEach(path => {
  test(`gallery-meta - ${path}`, () => loader.execute(path));
});

loader.paths('p-has-multiple-%N.html').forEach(path => {
  test(`has-multiple - ${path}`, () => loader.execute(path));
});

loader.paths('p-index-%N.html').forEach(path => {
  test(`index - ${path}`, () => loader.execute(path));
});

loader.paths('p-location-%N.html').forEach(path => {
  test(`location - ${path}`, () => loader.execute(path));
});

loader.paths('p-main-image-%N.html').forEach(path => {
  test(`main-image - ${path}`, () => loader.execute(path));
});

loader.paths('p-passthrough-%N.html').forEach(path => {
  test(`passthrough - ${path}`, () => loader.execute(path));
});

loader.paths('p-record-type-%N.html').forEach(path => {
  test(`record-type - ${path}`, () => loader.execute(path));
});

loader.paths('p-redirect-%N.html').forEach(path => {
  test(`redirect - ${path}`, () => loader.execute(path));
});

loader.paths('p-service-name-email-%N.html').forEach(path => {
  test(`service-name-email - ${path}`, () => loader.execute(path));
});

loader.paths('p-show-past-events-%N.html').forEach(path => {
  test(`show-past-events - ${path}`, () => loader.execute(path));
});

// ---

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
