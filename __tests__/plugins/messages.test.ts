import { framework } from '../cldr';
import { Node } from '../../src/node';
import { MessageFormats } from '../../src/plugins/messages';

test('message formats', () => {
    const num1 = new Node('12345.6789');
    const num2 = new Node(3456.78);
    const amt1 = new Node({ decimalValue: 12345, currencyCode: 'EUR' });
    const amt2 = new Node({ decimalValue: -678.5678, currencyCode: 'EUR' });
    const amtbad = new Node('ABCDEF');
    const date1 = new Node(1614798160345);
    const date2 = new Node(1617476560000);
    const cldr = framework.get('en');
    const f = new MessageFormats(cldr).formatters();
    const bool = new Node(true);
    const nil = new Node(null);

    expect(f.currency([], [])).toEqual('');
    expect(f.currency(undefined as any, [])).toEqual('');
    expect(f.currency([amtbad], [])).toEqual('');
    expect(f.currency([amt1], [])).toEqual('€12,345.00');
    expect(f.currency([amt2], ['style:accounting'])).toEqual('(€678.57)');

    expect(f.datetime([], [])).toEqual('');
    expect(f.datetime(undefined as any, [])).toEqual('');
    expect(f.datetime([date1], [])).toEqual('March 3, 2021');

    expect(f.decimal([], [])).toEqual('');
    expect(f.decimal(undefined as any, [])).toEqual('');
    expect(f.decimal([num1], [])).toEqual('12,345.679');
    expect(f.decimal([num2], ['maxfrac:1'])).toEqual('3,456.8');
    expect(f.decimal([amt1], [])).toEqual('12,345');
    expect(f.decimal([amtbad], [])).toEqual('0');
    expect(f.decimal([bool], [])).toEqual('1');
    expect(f.decimal([nil], [])).toEqual('0');

    expect(f['datetime-interval']([], [])).toEqual('');
    expect(f['datetime-interval'](undefined as any, [])).toEqual('');
    expect(f['datetime-interval']([date1, date2], [])).toEqual('Mar 3 – Apr 3, 2021');
});
