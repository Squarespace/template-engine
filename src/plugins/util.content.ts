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
  const title = item.get('title');
  if (isTruthy(title)) {
    return title.asString();
  }

  const body = item.get('body');
  if (isTruthy(body)) {
    const text = removeTags(body.asString());
    if (text.length > 0) {
      return text;
    }
  }

  const filename = item.get('filename');
  if (isTruthy(filename)) {
    return filename.asString();
  }

  return '';
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
