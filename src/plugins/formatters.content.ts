import { Context } from '../context';
import { isTruthy, MISSING_NODE, Node } from '../node';
import { Formatter, FormatterTable } from '../plugin';
import { executeTemplate } from '../exec';
import { Variable } from '../variable';
import { RootCode } from '../instructions';

import { RecordType } from './enums';
import { isOnSale, isSoldOut } from './util.commerce';
import { getAltText, getFocalPoint, outputImageMeta, splitDimensions } from './util.content';
import { pad } from './util.date';
import { escapeHtmlAttributes, slugify } from './util.string';
import { hexColorToInt } from './util.color';

// Template imports
import audioPlayerTemplate from './templates/audio-player.json';

const SQUARESPACE_SIZES = ['100w', '300w', '500w', '750w', '1000w', '1500w', '2500w'];

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
    first.set(outputImageMeta(child, ctx));
  }
}

export class CoverImageMetaFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const image = first.node.get('coverImage');
    first.set(outputImageMeta(image, ctx));
  }
}

const HALFBRIGHT = 0xffffff / 2;

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

export class HumanizeDurationFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const ms = (first.node.asNumber() / 1000) | 0;
    const mins = (ms / 60) | 0;
    const secs = ms - mins * 60;
    const res = `${mins}:${pad(`${secs}`, '0', 2)}`;
    first.set(res);
  }
}

export class ImageFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const node = first.node;
    const cls = args.length === 1 ? args[0] : 'thumb-image';

    const id = node.get('id').asString();
    const altText = escapeHtmlAttributes(getAltText(ctx, node));
    const assetUrl = node.get('assetUrl').asString();

    let res = '<noscript>';
    res += `<img src="${assetUrl}" `;
    res += `alt="${altText}" `;
    res += '/></noscript>';

    res += `<img class="${cls}" `;
    res += outputImageMeta(node, ctx, altText);

    res += 'data-load="false" ';
    res += `data-image-id="${id}" `;
    res += 'data-type="image" />';
    first.set(res);
  }
}

const IMAGE_COLOR_POSITIONS = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'center'];

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
    first.set(outputImageMeta(image, ctx));
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
    variants = variants.filter((v) => v[v.length - 1] === 'w');
    if (!variants.length) {
      return;
    }

    let originalImageFormatVariant = '';
    const lastVariant = variants[variants.length - 1];
    if (lastVariant !== SQUARESPACE_SIZES[SQUARESPACE_SIZES.length - 1]) {
      // If the largest variant is not the largest available resolution.
      for (let i = SQUARESPACE_SIZES.length - 2; i >= 0; i--) {
        if (lastVariant === SQUARESPACE_SIZES[i]) {
          // Append the original image as the next size up
          originalImageFormatVariant = `,${assetUrl}?format=original ${SQUARESPACE_SIZES[i + 1]}`;
          break;
        }
      }
    }

    const _variants = variants.map((v) => `${assetUrl}?format=${v} ${v}`).join(',');
    const text = ` srcset="${_variants}${originalImageFormatVariant}"`;
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

const numberToFixed = (num: number, places: number): number => parseFloat(num.toFixed(places));

export class WebsiteColorFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    let hasAlphaValue = false;
    let errorMessage = '';

    const hueNode = first.node.get('hue');
    const saturationNode = first.node.get('saturation');
    const lightnessNode = first.node.get('lightness');

    if (hueNode.isMissing() || saturationNode.isMissing() || lightnessNode.isMissing()) {
      first.set('Missing an H/S/L value.');
      return;
    }

    const hue = hueNode.asNumber();
    let saturation = saturationNode.asNumber();
    let lightness = lightnessNode.asNumber();
    const alphaNode = first.node.get('alpha');
    let alpha = null;
    if (!alphaNode.isMissing()) {
      hasAlphaValue = true;
      alpha = alphaNode.asNumber();
    }

    if (hue < 0 || hue > 360) {
      errorMessage += 'Hue out of bounds. ';
    }

    if (saturation >= 0 && saturation <= 1) {
      saturation *= 100;
    } else {
      errorMessage += 'Saturation out of bounds. ';
    }

    if (lightness >= 0 && lightness <= 1) {
      lightness *= 100;
    } else {
      errorMessage += 'Lightness out of bounds. ';
    }

    if (alpha != null && (alpha < 0 || alpha > 1)) {
      errorMessage += 'Alpha out of bounds.';
    }

    if (isTruthy(errorMessage)) {
      first.set(errorMessage);
      return;
    }

    let res = '';
    if (hasAlphaValue) {
      res += 'hsla(';
    } else {
      res += 'hsl(';
    }

    res += numberToFixed(hue, 2);
    res += ', ';
    res += numberToFixed(saturation, 2);
    res += '%, ';
    res += numberToFixed(lightness, 2);

    if (hasAlphaValue) {
      res += '%, ';
      res += numberToFixed(alpha!, 2);
      res += ')';
    } else {
      res += '%)';
    }

    first.set(res);
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
  AbsUrl: new AbsUrlFormatter(),
  'audio-player': new AudioPlayerFormatter(),
  capitalize: new CapitalizeFormatter(),
  'child-image-meta': new ChildImageMetaFormatter(),
  'cover-image-meta': new CoverImageMetaFormatter(),
  'color-weight': new ColorWeightFormatter(),
  height: new HeightFormatter(),
  humanizeDuration: new HumanizeDurationFormatter(),
  image: new ImageFormatter(),
  'image-color': new ImageColorFormatter(),
  'image-meta': new ImageMetaFormatter(),
  'image-srcset': new ImageMetaSrcSetFormatter(),
  'item-classes': new ItemClassesFormatter(),
  resizedHeightForWidth: new ResizedHeightForWidthFormatter(),
  resizedWidthForHeight: new ResizedWidthForHeightFormatter(),
  squarespaceThumbnailForHeight: new SquarespaceThumbnailForHeightFormatter(),
  squarespaceThumbnailForWidth: new SquarespaceThumbnailForWidthFormatter(),
  'website-color': new WebsiteColorFormatter(),
  width: new WidthFormatter(),
  video: new VideoFormatter(),
};
