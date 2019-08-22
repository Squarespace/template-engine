import { MISSING_NODE, Node } from '../node';
import { escapeHtmlAttributes } from './util.string';

export const getFirstMatchingNode = (parent: Node, ...names: string[]) => {
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    const node = parent.get(name);
    if (!node.isMissing()) {
      return node;
    }
  }
  return MISSING_NODE;
};

export const makeSocialButton = (website: Node, item: Node, inline: boolean) => {
  const options = website.get('shareButtonOptions');
  if (website.isMissing() || options.isMissing() || options.size() === 0) {
    return '';
  }

  const imageId = getFirstMatchingNode(item, 'systemDataId', 'mainImageId').asString();
  const recordType = item.get('recordType').asString();
  const fullUrl = item.get('fullUrl').asString();
  const title = escapeHtmlAttributes(item.get('title').asString());

  let assetUrl = item.get('assetUrl');
  if (assetUrl.isMissing()) {
    assetUrl = item.path(['mainImage', 'assetUrl']);
  }

  let res = inline ? '<span ' : '<div ';
  res += `class="squarespace-social-buttons ${inline ? 'inline-style' : 'button-style'}"`;
  res += ` data-system-data-id="${imageId}"`;
  res += ` data-asset-url="${assetUrl.asString()}"`;
  res += ` data-record-type="${recordType}"`;
  res += ` data-full-url="${fullUrl}"`;
  res += ` data-title="${title}">`;
  res += inline ? '</span>' : '</div>';
  return res;
};
