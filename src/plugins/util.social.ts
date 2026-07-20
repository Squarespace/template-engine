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

/**
 * The legacyAttributes flag has the same polarity as Context.compatEnabled:
 * true keeps the released behavior (raw attribute values, assetUrl read
 * before the missing check), false applies the SOCIAL_BUTTON_ATTRIBUTES fix
 * (every attribute value escaped, missing/null/empty assetUrl falls back).
 */
export const makeSocialButton = (website: Node, item: Node, inline: boolean, legacyAttributes = true) => {
  const options = website.get('shareButtonOptions');
  if (website.isMissing() || options.isMissing() || options.size() === 0) {
    return '';
  }

  const imageId = getFirstMatchingNode(item, 'systemDataId', 'mainImageId').asString();
  const recordType = item.get('recordType').asString();
  const fullUrl = item.get('fullUrl').asString();
  const title = escapeHtmlAttributes(item.get('title').asString());

  let assetUrl: string;
  if (legacyAttributes) {
    // Legacy, the released behavior: read assetUrl before the missing
    // check, so a present but empty or null assetUrl is kept as-is.
    const node = item.get('assetUrl');
    assetUrl = node.asString();
    if (node.isMissing()) {
      assetUrl = item.path(['mainImage', 'assetUrl']).asString();
    }
  } else {
    // Fixed, check the node before reading. A missing, null or empty
    // assetUrl falls back to mainImage.assetUrl too.
    const node = item.get('assetUrl');
    if (node.isMissing() || node.isNull() || node.asString() === '') {
      assetUrl = item.path(['mainImage', 'assetUrl']).asString();
    } else {
      assetUrl = node.asString();
    }
  }

  // Legacy writes these four values raw; the fix routes them through the
  // attribute escape, matching data-title.
  const attr = (value: string) => (legacyAttributes ? value : escapeHtmlAttributes(value));

  let res = inline ? '<span ' : '<div ';
  res += `class="squarespace-social-buttons ${inline ? 'inline-style' : 'button-style'}"`;
  res += ` data-system-data-id="${attr(imageId)}"`;
  res += ` data-asset-url="${attr(assetUrl)}"`;
  res += ` data-record-type="${attr(recordType)}"`;
  res += ` data-full-url="${attr(fullUrl)}"`;
  res += ` data-title="${title}">`;
  res += inline ? '</span>' : '</div>';
  return res;
};
