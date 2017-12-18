import { RecordType } from './enums';
import { MISSING_NODE } from '../node';
import { Formatter } from '../plugin';
import { executeTemplate, isTruthy } from '../util';
import { isOnSale, isSoldOut } from './util.commerce';
import {
  outputImageMeta,
  splitDimensions,
  getAltTextFromContentItem,
  getFocalPoint,
  isLicensedAssetPreview } from './util.content';
import { escapeHtmlAttributes, slugify } from './util.string';
import { hexColorToInt } from './util.color';


// Template imports
import audioPlayerTemplate from './templates/audio-player.json';


class AbsUrlFormatter extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const url = ctx.resolve(['base-url']).asString();
    const value = first.node.asString();
    first.set(url + '/' + value);
  }
}

class AudioPlayerFormatter extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const text = executeTemplate(ctx, audioPlayerTemplate, first.node, true);
    first.set(text);
  }
}

class CapitalizeFormatter extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const value = first.node.asString();
    first.set(value.toUpperCase());
  }
}

class ChildImageMetaFormatter extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const index = args.length === 0 ? 0 : parseInt(args[0], 10);
    const child = first.node().path(['items', index]);
    first.set(outputImageMeta(child));
  }
}

class CoverImageMetaFormatter extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const image = first.node().get('coverImage');
    first.set(outputImageMeta(image));
  }
}

const HALFBRIGHT = 0xFFFFFF / 2;

class ColorWeightFormatter extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const hex = first.node().asString();
    const color = hexColorToInt(hex);
    if (color === -1) {
      first.set(MISSING_NODE);
      return;
    }
    const weight = color > HALFBRIGHT ? 'light' : 'dark';
    first.set(weight);
  }
}

class HeightFormatter extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const parts = splitDimensions(first.node());
    if (parts === null) {
      first.set(MISSING_NODE);
    } else {
      const height = parseInt(parts[1], 10);
      first.set(height);
    }
  }
}

class HumanizeDurationFormatter extends Formatter {
  apply(args, vars, ctx) {
    // TODO: implement
  }
}

class ImageFormatter extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const node = first.node();
    const cls = args.length === 1 ? args[0] : 'thumb-image';

    const id = node.get('id').asString();
    const altText = escapeHtmlAttributes(this.getAltText(ctx));
    const assetUrl = node.get('assetUrl').asString();
    const focalPoint = getFocalPoint(node);
    const origSize = node.get('originalSize').asString();

    let res = '<noscript>';
    res += `<img src="${assetUrl}" `;
    if (altText.length > 0) {
      res += `alt="${altText}" `;
    }
    res += '/></noscript>';

    res += `<img class="${cls}" `;
    if (altText.length > 0) {
      res += `alt="${altText}" `;
    }

    if (isLicensedAssetPreview(node)) {
      res += 'data-licensed-asset-preview="true" ';
    }

    res += `data-src="${assetUrl}" `;
    res += `data-image="${assetUrl}" `;
    res += `data-image-dimensions="${origSize}" `;
    res += `data-image-focal-point="${focalPoint}" `;
    res += 'data-load="false"';
    res += `data-image-id="${id}" `;
    res += 'data-type="image" />';
    first.set(res);
  }

  getAltText(ctx) {
    // For image blocks, caption is stored on the block and not the item.
    // need to reach out via the context to see if it exist first,
    // before falling back on the data on the item
    const alt = ctx.resolve(['info', 'altText']);
    if (!alt.isMissing()) {
      const text = alt.asString().trim();
      if (text.length > 0) {
        return text;
      }
    }

    return getAltTextFromContentItem(ctx.node());
  }
}

const IMAGE_COLOR_POSITIONS = [
  'topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'center'
];

class ImageColorFormatter extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const colorData = first.node().get('colorData');

    if (colorData.isMissing()) {
      first.set(MISSING_NODE);
      return;
    }

    let res = '';
    if (args.length > 0) {
      const key = args[0];
      const color = colorData.get(key + 'Average').asString();
      if (color.length > 0) {
        if (args.length === 2) {
          res += args[0].append(': ');
        }
        res += `#${color}`;
      } else {
        res += `"${key}" not found.`;
      }
    } else {
      const len = IMAGE_COLOR_POSITIONS.length;
      for (let i = 0; i < len; i++) {
        const key = IMAGE_COLOR_POSITIONS[i];
        const value = colorData.get(key + 'Average').asString();
        res += `data-color-${key}="#${value}" `;
      }
    }
    first.set(res);
  }
}

class ImageMetaFormatter extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const image = first.node();
    first.set(outputImageMeta(image));
  }
}

const slugifyClasses = (prefix, node) => {
  let res = '';
  const size = node.size();
  for (let i = 0; i < size; i++) {
    const text = slugify(node.get(i).asString());
    res += ` ${prefix}-${text}`;
  }
  return res;
};

class ItemClassesFormatter extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const value = first.node();

    let res = 'hentry';
    let node = ctx.resolve(['promotedBlockType']);
    if (isTruthy(node)) {
      const text = slugify(node.asString());
      res += ` promoted promoted-block-${text}`;
    }

    node = ctx.resolve(['categories']);
    if (isTruthy(node)) {
      res += slugifyClasses('category', node);
    }

    node = ctx.resolve(['tags']);
    if (isTruthy(node)) {
      res += slugifyClasses('tag', node);
    }

    node = ctx.resolve(['author']);
    const displayName = node.get('displayName');
    if (isTruthy(node) && isTruthy(displayName)) {
      const text = slugify(displayName.asString());
      res += ` author-${text}`;
    }

    node = ctx.resolve(['recordTypeLabel']);
    res += ` post-type-${node.asString()}`;

    node = ctx.resolve(['@index']);
    if (!node.isMissing()) {
      res += ` article-index-${node.asNumber()}`;
    }

    node = ctx.resolve('starred');
    if (isTruthy(node)) {
      res += ' featured';
    }

    node = value.get('recordType');
    if (RecordType.STORE_ITEM.code === node.asNumber()) {
      if (isOnSale(value)) {
        res += ' on-sale';
      }
      if (isSoldOut(value)) {
        res += ' sold-out';
      }
    }

    first.set(res);
  }
}

class ResizedHeightForWidthFormatter extends Formatter {
  apply(vars, args, ctx) {
    // TODO: implement
  }
}

class ResizedWidthForHeightFormatter extends Formatter {
  apply(vars, args, ctx) {
    // TODO: implement
  }
}

class SquarespaceThumbnailForHeightFormatter extends Formatter {
  apply(vars, args, ctx) {
    // TODO: implement
  }
}

class SquarespaceThumbnailForWidthFormatter extends Formatter {
  apply(vars, args, ctx) {
    // TODO: implement
  }
}

class TimeSinceFormatter extends Formatter {
  apply(vars, args, ctx) {
    // TODO: implement
  }
}

class WidthFormatter extends Formatter {
  apply(vars, args, ctx) {
    const first = vars[0];
    const parts = splitDimensions(first.node());
    if (parts === null) {
      first.set(MISSING_NODE);
    } else {
      const height = parseInt(parts[0], 10);
      first.set(height);
    }
  }
}

class VideoFormatter extends Formatter {
  apply(vars, args, ctx) {
    // TODO: implement
  }
}


export default {
  'AbsUrl': new AbsUrlFormatter(),
  'audio-player': new AudioPlayerFormatter(),
  'capitalize': new CapitalizeFormatter(),
  'child-image-meta': new ChildImageMetaFormatter(),
  'cover-image-meta': new CoverImageMetaFormatter(),
  'color-weight': new ColorWeightFormatter(),
  'height': new HeightFormatter(),
  'humanizeDuration': new HumanizeDurationFormatter(),
  'image': new ImageFormatter(),
  'image-color': new ImageColorFormatter(),
  'image-meta': new ImageMetaFormatter(),
  'item-classes': new ItemClassesFormatter(),
  'resizedHeightForWidth': new ResizedHeightForWidthFormatter(),
  'resizedWidthForHeight': new ResizedWidthForHeightFormatter(),
  'squarespaceThumbnailForHeight': new SquarespaceThumbnailForHeightFormatter(),
  'squarespaceThumbnailForWidth': new SquarespaceThumbnailForWidthFormatter(),
  'timesince': new TimeSinceFormatter(),
  'width': new WidthFormatter(),
  'video': new VideoFormatter(),
};
