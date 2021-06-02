import { isTruthy, Node } from '../node';
import { escapeHtmlAttributes, removeTags } from './util.string';
import { Type } from '../types';

export const getFocalPoint = (media: Node) => {
  const node = media.get('mediaFocalPoint');
  if (!node.isMissing()) {
    const x = node.get('x').asNumber();
    const y = node.get('y').asNumber();
    return `${x},${y}`;
  }
  return '0.5,0.5';
};

export const getAltTextFromContentItem = (item: Node) => {
  const alt = item.get('altText');
  if (isTruthy(alt)) {
    return removeTags(alt.asString());
  }

  return '';
};

export const humanizeDatePlural = (value: number, type: string) => {
  let r = 'about ';
  switch (type) {
    case 'hour': {
      if (value === 1) {
        r += 'an hour';
      } else {
        r += `${value} ${type}s`;
      }
      break;
    }

    default:
      if (value === 1) {
        r += `a ${type}`;
      } else {
        r += `${value} ${type}s`;
      }
      break;
  }
  return r + ' ago';
};

export const humanizeDate = (delta: number, showSeconds: boolean) => {
  delta /= 1000 | 0;
  const days = delta / 86400 | 0;
  const years = days / 365 | 0;
  if (years > 0) {
    return humanizeDatePlural(years, 'year');
  }
  const months = days / 30 | 0;
  if (months > 0) {
    return humanizeDatePlural(months, 'month');
  }
  const weeks = days / 7 | 0;
  if (weeks > 0) {
    return humanizeDatePlural(weeks, 'week');
  }
  if (days > 0) {
    return humanizeDatePlural(days, 'day');
  }
  delta -= (days * 86400);
  const hours = delta / 3600 | 0;
  if (hours > 0) {
    return humanizeDatePlural(hours, 'hour');
  }
  const mins = delta / 60 | 0;
  if (mins > 0) {
    return humanizeDatePlural(mins, 'minute');
  }
  if (showSeconds) {
    return humanizeDatePlural(delta, 'second');
  }
  return 'less than a minute ago';
};

export const isLicensedAssetPreview = (image: Node) => {
  return image.path(['licensedAssetPreview']).type === Type.OBJECT;
};

export const outputImageMeta = (image: Node, preferredAlt: string) => {
  if (image.isMissing()) {
    return '';
  }

  const componentKey = image.path(['componentKey']);
  const focalPoint = getFocalPoint(image);
  const origSize = image.get('originalSize').asString();
  const assetUrl = image.get('assetUrl').asString();
  const altText = escapeHtmlAttributes(
    preferredAlt ? preferredAlt : getAltTextFromContentItem(image)
  );

  let res = '';
  if (isLicensedAssetPreview(image)) {
    res += 'data-licensed-asset-preview="true" ';
  }

  if (!componentKey.isMissing()) {
    res += `data-component-key="${componentKey.asString()}" `;
  }

  res += `data-src="${assetUrl}" `;
  res += `data-image="${assetUrl}" `;
  res += `data-image-dimensions="${origSize}" `;
  res += `data-image-focal-point="${focalPoint}" `;
  res += `alt="${altText}" `;
  return res;
};

export const splitDimensions = (node: Node) => {
  const val = node.asString();
  const parts = val.split('x');
  return parts.length === 2 ? parts : null;
};
