import * as contentutil from '../../src/plugins/util.content';
import { framework } from '../cldr';
import { Node } from '../../src/node';

test('focal point', () => {
  const node = new Node({ mediaFocalPoint: { x: 0.6, y: 0.1 } });
  expect(contentutil.getFocalPoint(node)).toEqual('0.6,0.1');

  expect(contentutil.getFocalPoint(new Node({}))).toEqual('0.5,0.5');
});

test('humanize date with zone offset', () => {
  const cldr = framework.get('en');

  // May 13, 2013 01:00:00 UTC, from the Java KnownDates table.
  const base = 1368406800000;
  const hour = 3600000;
  const instant = base - hour;

  // The cldr zone data at the instant. New York is on EDT, Tokyo is fixed +9.
  expect(contentutil.getZoneOffsetMs(cldr, 'America/New_York', instant)).toEqual(-14400000);
  expect(contentutil.getZoneOffsetMs(cldr, 'Asia/Tokyo', instant)).toEqual(32400000);

  // A date with no cldr zone info falls back to the host's own zone tables.
  const noZoneInfo: any = { Calendars: { toGregorianDate: () => ({}) } };
  expect(contentutil.getZoneOffsetMs(noZoneInfo, 'Asia/Tokyo', 1600003263000)).toEqual(32400000);

  // Legacy, the zone offset joins the delta.
  const legacy = (zoneId: string) =>
    contentutil.humanizeDate(hour + contentutil.getZoneOffsetMs(cldr, zoneId, instant), false);
  expect(legacy('America/New_York')).toEqual('less than a minute ago');
  expect(legacy('Asia/Tokyo')).toEqual('about 10 hours ago');

  // Fixed, the delta is the epoch millis difference in every zone.
  expect(contentutil.humanizeDate(hour, false)).toEqual('about an hour ago');

  // Fixed, a future instant and old instants bucket as before.
  expect(contentutil.humanizeDate(-hour, false)).toEqual('less than a minute ago');
  expect(contentutil.humanizeDate(1384518630000 - base, true)).toEqual('about 6 months ago');
  expect(contentutil.humanizeDate(1440437025000 - base, true)).toEqual('about 2 years ago');
});
