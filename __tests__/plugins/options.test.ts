import {
  currencyOptions,
  datetimeOptions,
  decimalOptions,
  intervalOptions,
  relativetimeOptions,
} from '../../src/plugins/options';

test('decimal options', () => {
  expect(decimalOptions(null as unknown as string[])).toEqual({});
  expect(decimalOptions(undefined as unknown as string[])).toEqual({});
  expect(decimalOptions([])).toEqual({});
  expect(decimalOptions(['style:short'])).toEqual({ style: 'short' });
  expect(decimalOptions(['style:standard'])).toEqual({ style: 'decimal' });
  expect(decimalOptions(['style:unknown'])).toEqual({});

  expect(decimalOptions(['group'])).toEqual({ group: true });
  expect(decimalOptions(['group:false'])).toEqual({ group: false });
  expect(decimalOptions(['grouping:false'])).toEqual({ group: false });
  expect(decimalOptions(['no-group'])).toEqual({ group: false });
  expect(decimalOptions(['no-grouping'])).toEqual({ group: false });

  expect(decimalOptions(['round:ceil'])).toEqual({ round: 'ceiling' });
  expect(decimalOptions(['round:truncate'])).toEqual({ round: 'down' });
  expect(decimalOptions(['round:half-up'])).toEqual({ round: 'half-up' });
  expect(decimalOptions(['round:unknown'])).toEqual({});

  expect(decimalOptions(['minint:1'])).toEqual({ minimumIntegerDigits: 1 });
  expect(decimalOptions(['minimumIntegerDigits:1000'])).toEqual({ minimumIntegerDigits: 50 });

  expect(decimalOptions(['minsig:3'])).toEqual({ minimumSignificantDigits: 3 });
  expect(decimalOptions(['maxsig:3'])).toEqual({ maximumSignificantDigits: 3 });
  expect(decimalOptions(['maxSig:3'])).toEqual({ maximumSignificantDigits: 3 });
  expect(decimalOptions(['maximumSignificantDigits:7'])).toEqual({ maximumSignificantDigits: 7 });

  expect(decimalOptions(['maxfrac:2'])).toEqual({ maximumFractionDigits: 2 });
  expect(decimalOptions(['minimumFractionDigits:5'])).toEqual({ minimumFractionDigits: 5 });
  expect(decimalOptions(['minFrac:2'])).toEqual({ minimumFractionDigits: 2 });
  expect(decimalOptions(['minfrac:2'])).toEqual({ minimumFractionDigits: 2 });

  expect(decimalOptions(['unknown:3'])).toEqual({});
});

test('currency options', () => {
  expect(currencyOptions(['style:short'])).toEqual({ style: 'short' });
  expect(currencyOptions(['style:standard'])).toEqual({ style: 'symbol' });
  expect(currencyOptions(['style:unknown'])).toEqual({});

  expect(currencyOptions(['symbol:narrow'])).toEqual({ symbolWidth: 'narrow' });
  expect(currencyOptions(['symbol:unknown'])).toEqual({});

  expect(currencyOptions(['group:false'])).toEqual({ group: false });
});

test('datetime options', () => {
  expect(datetimeOptions([])).toEqual({ ca: 'gregory' });
  expect(datetimeOptions(['date'])).toEqual({ date: 'short', ca: 'gregory' });
  expect(datetimeOptions(['time'])).toEqual({ time: 'short', ca: 'gregory' });
  expect(datetimeOptions(['short'])).toEqual({ datetime: 'short', ca: 'gregory' });
  expect(datetimeOptions(['yMMMd'])).toEqual({ skeleton: 'yMMMd', ca: 'gregory' });

  expect(datetimeOptions(['date:full'])).toEqual({ date: 'full', ca: 'gregory' });
  expect(datetimeOptions(['time:full'])).toEqual({ time: 'full', ca: 'gregory' });
  expect(datetimeOptions(['datetime:full'])).toEqual({ datetime: 'full', ca: 'gregory' });

  expect(datetimeOptions(['context:begin-sentence'])).toEqual({ context: 'begin-sentence', ca: 'gregory' });

  expect(datetimeOptions(['skeleton:hmsv'])).toEqual({ skeleton: 'hmsv', ca: 'gregory' });

  expect(datetimeOptions(['wrapper:full'])).toEqual({ wrap: 'full', ca: 'gregory' });

  expect(datetimeOptions(['unknown:foo'])).toEqual({ ca: 'gregory' });
});

test('interval options', () => {
  expect(intervalOptions([])).toEqual({ ca: 'gregory' });
  expect(intervalOptions(['yMMMd'])).toEqual({ skeleton: 'yMMMd', ca: 'gregory' });
  expect(intervalOptions(['skeleton:yMMMd'])).toEqual({ skeleton: 'yMMMd', ca: 'gregory' });

  expect(intervalOptions(['date:yMMMd'])).toEqual({ date: 'yMMMd', ca: 'gregory' });
  expect(intervalOptions(['time:Bh'])).toEqual({ time: 'Bh', ca: 'gregory' });

  expect(intervalOptions(['context:begin-sentence'])).toEqual({ context: 'begin-sentence', ca: 'gregory' });

  // ignore bare properties
  expect(intervalOptions(['context'])).toEqual({ ca: 'gregory' });

  expect(intervalOptions(['unknown:foo'])).toEqual({ ca: 'gregory' });
});

test('relative time options', () => {
  expect(relativetimeOptions(['context:middle-of-text'])).toEqual({ context: 'middle-of-text', ca: 'gregory' });
  expect(relativetimeOptions(['context:foo'])).toEqual({ ca: 'gregory' });
  expect(relativetimeOptions(['field:year'])).toEqual({ field: 'year', ca: 'gregory' });
  expect(relativetimeOptions(['field:foo'])).toEqual({ ca: 'gregory' });
  expect(relativetimeOptions(['dayOfWeek:true'])).toEqual({ dayOfWeek: true, ca: 'gregory' });
  expect(relativetimeOptions(['numericOnly:true'])).toEqual({ numericOnly: true, ca: 'gregory' });
  expect(relativetimeOptions(['alwaysNow:true'])).toEqual({ alwaysNow: true, ca: 'gregory' });
  expect(relativetimeOptions(['width:wide'])).toEqual({ width: 'wide', ca: 'gregory' });
  expect(relativetimeOptions(['width:foo'])).toEqual({ ca: 'gregory' });
  expect(relativetimeOptions(['maxFrac:3'])).toEqual({ maximumFractionDigits: 3, ca: 'gregory' });

  expect(relativetimeOptions(['unknown:foo'])).toEqual({ ca: 'gregory' });
});
