import { Formatter } from '../plugin';
import { EOF, ROOT, TEXT, VARIABLE } from '../opcodes';
import { executeTemplate } from '../util';


class AbsUrl extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const url = ctx.resolve(['base-url']).asString();
    const value = first.node.asString();
    first.set(url + '/' + value);
  }
}

const audioPlayer = [ROOT, 1, [
  [TEXT, '<script>Y.use(\'squarespace-audio-player-frontend\');</script>'],
  [TEXT, '<div class="squarespace-audio-player" data-audio-asset-url="'],
  [VARIABLE, [['structuredContent', 'audioAssetUrl']], 0],
  [TEXT, '" data-item-id="'],
  [VARIABLE, [['id']], 0],
  [TEXT, '" id="audio-player-'],
  [VARIABLE, [['id']], 0],
  [TEXT, '"></div>']
], EOF];

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
