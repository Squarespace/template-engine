import * as contentutil from '../../src/plugins/util.content';
import Node from '../../src/node';


test('focal point', () => {
  const node = new Node({ mediaFocalPoint: { x: 0.6, y: 0.1 } });
  expect(contentutil.getFocalPoint(node)).toEqual('0.6,0.1');

  expect(contentutil.getFocalPoint(new Node({}))).toEqual('0.5,0.5');
});

