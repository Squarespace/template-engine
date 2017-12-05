import { Formatter } from '../plugin';
import { executeTemplate } from '../util';


class AbsUrl extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const url = ctx.resolve(['base-url']).asString();
    const value = first.node.asString();
    first.set(url + '/' + value);
  }
}

const audioPlayer = [17, 1, [
  [0, '<script>Y.use(\'squarespace-audio-player-frontend\');</script>'],
  [0, '<div class="squarespace-audio-player" data-audio-asset-url="'],
  [1, ['structuredContent.audioAssetUrl'], 0],
  [0, '" data-item-id="'],
  [1, ['id'], 0],
  [0, '" id="audio-player-'],
  [1, ['id'], 0],
  [0, '"></div>']
], 18];

class AudioPlayer extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const text = executeTemplate(ctx, audioPlayer, first.node, true);
    first.set(text);
  }
}

class Capitalize extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const value = first.node.asString();
    first.set(value.toUpperCase());
  }
}

export default {
  AbsUrl: new AbsUrl(),
  'audio-player': new AudioPlayer(),
  capitalize: new Capitalize(),
};
