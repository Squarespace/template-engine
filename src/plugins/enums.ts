import { enum_, EnumMap, EnumValue } from '../enum';

export const BackgroundSourceMap: EnumMap = {
  UNDEFINED: [-1, 'undefined'],
  UPLOAD: [1, 'upload'],
  INSTAGRAM: [2, 'instagram'],
  VIDEO: [3, 'video'],
  NONE: [4, 'none'],
};

export type BackgroundSource = EnumValue<'BackgroundSource'>;
export const BackgroundSource = enum_('BackgroundSource', BackgroundSourceMap);

export type CollectionType = EnumValue<'CollectionType'>;
export const CollectionType = enum_('CollectionType', {
  UNDEFINED: [-1, 'undefined'],
  COLLECTION_TYPE_GENERIC: [1, 'generic'],
  COLLECTION_TYPE_SUBSCRIPTION: [2, 'subscription'],
  TWITTER: [3, 'twitter'],
  FOURSQUARE: [4, 'foursquare'],
  INSTAGRAM: [5, 'instagram'],
  GALLERY_BLOCK: [6, 'gallery-block'],
  TEMPLATE_PAGE: [7, 'template-page'],
  SPLASH_PAGE: [8, 'splash-page'],
  COLLECTION_TYPE_PAGE: [10, 'page'],
  FIVEHUNDREDPIX: [11, 'fivehundredpix'],
  FLICKR: [12, 'flickr'],
  PRODUCTS: [13, 'products'],
  SLIDE_GALLERY: [15, 'slide-gallery'],
  SLIDE_ALBUM: [16, 'slide-album'],
  SLIDE_VIDEO: [17, 'slide-video'],
  ALBUM_BLOCK: [18, 'album-block'],
});

export type FolderBehavior = EnumValue<'FolderBehavior'>;
export const FolderBehavior = enum_('FolderBehavior', {
  UNDEFINED: [-1, 'undefined'],
  INDEX: [1, 'index'],
  REDIRECT: [2, 'redirect'],
  NONE: [3, 'none'],
});

export type ProductType = EnumValue<'ProductType'>;
export const ProductType = enum_('ProductType', {
  UNDEFINED: [-1, 'undefined'],
  PHYSICAL: [1, 'physical'],
  DIGITAL: [2, 'digital'],
  SERVICE: [3, 'service'],
  GIFT_CARD: [4, 'gift-card'],
});

export type RecordType = EnumValue<'RecordType'>;
export const RecordType = enum_('RecordType', {
  UNDEFINED: [-1, 'undefined'],
  TEXT: [1, 'text'],
  IMAGE: [2, 'image'],
  QUOTE: [4, 'quote'],
  LINK: [5, 'link'],
  AUDIO: [7, 'audio'],
  VIDEO: [8, 'video'],
  STORE_ITEM: [11, 'store-item'],
  EVENT: [12, 'event'],
  GALLERY: [14, 'gallery'],
  BINARY: [15, 'binary'],
  CSSASSET: [16, 'css-asset'],
  TWEAKASSET: [17, 'tweak-asset'],
  DIGITALGOOD: [18, 'digital-good'],
  ATTACHMENT: [19, 'attachment'],
  EXPORT_WORDPRESS: [20, 'wordpress-export'],
  EXPORT_INTERNAL: [21, 'json-export'],
  SITE_SEARCH: [30, 'site-search'],
  ACTIVE_TIME: [31, 'active-time'],
  TWEET: [50, 'tweet'],
  CHECKIN: [52, 'checkin'],
  KBARTICLE: [54, 'kbarticle'],
});

export type SliceType = EnumValue<'SliceType'>;
export const SliceType = enum_('SliceType', {
  UNDEFINED: [-1, 'undefined'],
  HEADING: [1, 'heading'],
  BODY: [3, 'body'],
  IMAGE: [4, 'image'],
  GALLERY: [5, 'gallery'],
  VIDEO: [6, 'video'],
  SOCIAL_ICONS: [7, 'social-icons'],
  BUTTONS: [8, 'buttons'],
  NAVIGATION: [9, 'navigation'],
  CUSTOM_FORM: [10, 'custom-form'],
  NEWSLETTERL: [11, 'newsletter'],
  ALBUM: [12, 'album'],
  MAP: [13, 'map'],
  LOGO: [14, 'logo'],
  ACTION: [15, 'action'],
  FORM: [16, 'form'],
  LOCK: [17, 'lock'],
  PASSWORD: [18, 'password'],
  TWITTER: [19, 'twitter'],
});
