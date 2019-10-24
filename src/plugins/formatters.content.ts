import { Context } from '../context';
import { isTruthy, MISSING_NODE, Node } from '../node';
import { Formatter, FormatterTable } from '../plugin';
import { executeTemplate } from '../exec';
import { Variable } from '../variable';
import { RootCode } from '../instructions';

import { RecordType } from './enums';
import { isOnSale, isSoldOut } from './util.commerce';
import {
  getAltTextFromContentItem,
  getFocalPoint,
  isLicensedAssetPreview,
  outputImageMeta,
  splitDimensions } from './util.content';
import { escapeHtmlAttributes, slugify } from './util.string';
import { hexColorToInt } from './util.color';

// Template imports
import audioPlayerTemplate from './templates/audio-player.json';

export class AbsUrlFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const url = ctx.resolve(['base-url']).asString();
    const value = first.node.asString();
    first.set(url + '/' + value);
  }
}

export class AudioPlayerFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const text = executeTemplate(ctx, audioPlayerTemplate as unknown as RootCode, first.node, true);
    first.set(text);
  }
}

export class CapitalizeFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const value = first.node.asString();
    first.set(value.toUpperCase());
  }
}

export class ChildImageMetaFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const index = args.length === 0 ? 0 : parseInt(args[0], 10);
    const child = first.node.path(['items', index]);
    first.set(outputImageMeta(child));
  }
}

export class CoverImageMetaFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const image = first.node.get('coverImage');
    first.set(outputImageMeta(image));
  }
}

const HALFBRIGHT = 0xFFFFFF / 2;

export class ColorWeightFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const hex = first.node.asString();
    const color = hexColorToInt(hex);
    if (color === -1) {
      first.set(MISSING_NODE);
      return;
    }
    const weight = color > HALFBRIGHT ? 'light' : 'dark';
    first.set(weight);
  }
}

export class HeightFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const parts = splitDimensions(first.node);
    if (parts === null) {
      first.set(MISSING_NODE);
    } else {
      const height = parseInt(parts[1], 10);
      first.set(height);
    }
  }
}

export class ImageFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const node = first.node;
    const cls = args.length === 1 ? args[0] : 'thumb-image';

    const id = node.get('id').asString();
    const altText = escapeHtmlAttributes(this.getAltText(ctx));
    const assetUrl = node.get('assetUrl').asString();
    const focalPoint = getFocalPoint(node);
    const origSize = node.get('originalSize').asString();

    let res = '<noscript>';
    res += `<img src="${assetUrl}" `;
    if (altText.length > 0) {
      res += ` alt="${altText}" `;
    }
    res += ' /></noscript>';

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
    res += 'data-load="false" ';
    res += `data-image-id="${id}" `;
    res += 'data-type="image" />';
    first.set(res);
  }

  getAltText(ctx: Context): string {
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

export class ImageColorFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const colorData = first.node.get('colorData');

    if (colorData.isMissing()) {
      first.set(MISSING_NODE);
      return;
    }

    let res = '';
    if (args.length > 0) {
      const key = args[0];
      const color = colorData.get(key + 'Average').asString();
      if (color.length > 0) {
        if (args.length > 1) {
          res += `${args[1]}: `;
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

export class ImageMetaFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const image = first.node;
    first.set(outputImageMeta(image));
  }
}

export class ImageMetaSrcSetFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const image = first.node;
    if (image.isMissing()) {
      return;
    }

    const assetUrl = image.get('assetUrl').asString();
    let variants = image.get('systemDataVariants').asString().split(',');
    variants = variants.filter(v => v[v.length - 1] === 'w');
    if (variants.length === 0) {
      return;
    }

    const _variants = variants.map(v => `${assetUrl}?format=${v} ${v}`).join(',');
    const text = ` data-srcset="${_variants}"`;
    first.set(text);
  }
}

const slugifyClasses = (prefix: string, node: Node) => {
  let res = '';
  const size = node.size();
  for (let i = 0; i < size; i++) {
    const text = slugify(node.get(i).asString());
    res += ` ${prefix}-${text}`;
  }
  return res;
};

export class ItemClassesFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const value = first.node;

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

    node = ctx.resolve(['starred']);
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

const resize = (ctx: Context, node: Node, resizeWidth: boolean, requested: number) => {
  const parts = splitDimensions(node);
  if (parts === null || parts.length !== 2) {
    return "Invalid source parameter. Pass in 'originalSize'";
  }
  const width = parseInt(parts[0], 10);
  const height = parseInt(parts[1], 10);
  let value = 0;
  if (resizeWidth) {
    value = width * (requested / height);
  } else {
    value = height * (requested / width);
  }
  return value | 0;
};

export class ResizedHeightForWidthFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const requested = parseInt(args[0], 10);
    const first = vars[0];
    const text = resize(ctx, first.node, false, requested);
    first.set(text);
  }
}

export class ResizedWidthForHeightFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const requested = parseInt(args[0], 10);
    const first = vars[0];
    const text = resize(ctx, first.node, true, requested);
    first.set(text);
  }
}

const getSquarespaceSizeForWidth = (width: number) => {
  if (width > 1000) {
    return '1500w';
  } else if (width > 750) {
    return '1000w';
  } else if (width > 500) {
    return '750w';
  } else if (width > 300) {
    return '500w';
  } else if (width > 100) {
    return '300w';
  }
  return '100w';
};

export class SquarespaceThumbnailForWidthFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const width = parseInt(args[0], 10);
    const first = vars[0];
    first.set(getSquarespaceSizeForWidth(width));
  }
}

export class SquarespaceThumbnailForHeightFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const height = parseInt(args[0], 10);
    const first = vars[0];
    const resized = resize(ctx, first.node, true, height);
    if (typeof resized === 'number') {
      first.set(getSquarespaceSizeForWidth(resized));
    } else {
      first.set(resized);
    }
  }
}

export class WidthFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const parts = splitDimensions(first.node);
    if (parts === null) {
      first.set(MISSING_NODE);
    } else {
      const height = parseInt(parts[0], 10);
      first.set(height);
    }
  }
}

const COLOR_LOCATIONS = [
  { attr: 'topleft', key: 'topLeftAverage' },
  { attr: 'topright', key: 'topRightAverage' },
  { attr: 'bottomleft', key: 'bottomLeftAverage' },
  { attr: 'bottomright', key: 'bottomRightAverage' },
  { attr: 'center', key: 'centerAverage' },
];

export class VideoFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const node = first.node;

    const oEmbed = node.get('oembed');
    const colorData = node.get('colorData');
    const assetUrl = node.get('assetUrl').asString();
    const focalPoint = getFocalPoint(node);
    const originalSize = node.get('originalSize').asString();
    const html = escapeHtmlAttributes(oEmbed.get('html').asString());
    const providerName = oEmbed.get('providerName').asString();

    let loadFalse = false;
    let useColorData = false;

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === 'load-false') {
        loadFalse = true;
      } else if (arg === 'color-data') {
        useColorData = true;
      }
    }

    let res = '<div class="sqs-video-wrapper" ';
    if (loadFalse) {
      res += ' data-load="false" ';
    }
    res += `data-html="${html}" data-provider-name="${providerName}">`;

    if (isTruthy(node.get('overlay'))) {
      res += '<div class="sqs-video-overlay';
      if (isTruthy(node.get('mainImageId')) || isTruthy(node.get('systemDataId'))) {
        res += '" style="opacity: 0;">';
        res += `<img data-load="false" data-src="${assetUrl}" `;
        res += `data-image-dimensions="${originalSize}" `;
        res += `data-image-focal-point="${focalPoint}" `;

        if (useColorData && isTruthy(colorData)) {
          for (let j = 0; j < COLOR_LOCATIONS.length; j++) {
            const loc = COLOR_LOCATIONS[j];
            const value = colorData.get(loc.key).asString();
            res += `data-color-${loc.attr}="#${value}" `;
          }
        }
        res += '/>';
      } else {
        res += ' no-thumb" style="opacity: 0;">';
      }
      res += '<div class="sqs-video-opaque"> </div><div class="sqs-video-icon"></div>';
      res += '</div>';
    }
    res += '</div>';
    first.set(res);
  }
}

export const CONTENT_FORMATTERS: FormatterTable = {
  'AbsUrl': new AbsUrlFormatter(),
  'audio-player': new AudioPlayerFormatter(),
  'capitalize': new CapitalizeFormatter(),
  'child-image-meta': new ChildImageMetaFormatter(),
  'cover-image-meta': new CoverImageMetaFormatter(),
  'color-weight': new ColorWeightFormatter(),
  'height': new HeightFormatter(),
  'image': new ImageFormatter(),
  'image-color': new ImageColorFormatter(),
  'image-meta': new ImageMetaFormatter(),
  'image-srcset': new ImageMetaSrcSetFormatter(),
  'item-classes': new ItemClassesFormatter(),
  'resizedHeightForWidth': new ResizedHeightForWidthFormatter(),
  'resizedWidthForHeight': new ResizedWidthForHeightFormatter(),
  'squarespaceThumbnailForHeight': new SquarespaceThumbnailForHeightFormatter(),
  'squarespaceThumbnailForWidth': new SquarespaceThumbnailForWidthFormatter(),
  'width': new WidthFormatter(),
  'video': new VideoFormatter(),
};
