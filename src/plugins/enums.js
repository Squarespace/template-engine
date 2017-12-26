import makeEnum from '../enum';


// Helper to build an enum value
const val = (c, s) => ({ code: c, string: s });

export const BackgroundSource = makeEnum('BackgroundSource', {
  UNDEFINED: val(-1, 'undefined'),
  UPLOAD: val(1, 'upload'),
  INSTAGRAM: val(2, 'instagram'),
  VIDEO: val(3, 'video'),
  NONE: val(4, 'none'),
});

export const CollectionType = makeEnum('CollectionType', {
  UNDEFINED: val(-1, 'undefined'),
  COLLECTION_TYPE_GENERIC: val(1, 'generic'),
  COLLECTION_TYPE_SUBSCRIPTION: val(2, 'subscription'),
  TWITTER: val(3, 'twitter'),
  FOURSQUARE: val(4, 'foursquare'),
  INSTAGRAM: val(5, 'instagram'),
  GALLERY_BLOCK: val(6, 'gallery-block'),
  TEMPLATE_PAGE: val(7, 'template-page'),
  SPLASH_PAGE: val(8, 'splash-page'),
  COLLECTION_TYPE_PAGE: val(10, 'page'),
  FIVEHUNDREDPIX: val(11, 'fivehundredpix'),
  FLICKR: val(12, 'flickr'),
  PRODUCTS: val(13, 'products'),
  SLIDE_GALLERY: val(15, 'slide-gallery'),
  SLIDE_ALBUM: val(16, 'slide-album'),
  SLIDE_VIDEO: val(17, 'slide-video'),
  ALBUM_BLOCK: val(18, 'album-block'),
});

export const FolderBehavior = makeEnum('FolderBehavior', {
  UNDEFINED: val(-1, 'undefined'),
  INDEX: val(1, 'index'),
  REDIRECT: val(2, 'redirect'),
  NONE: val(3, 'none'),
});

export const ProductType = makeEnum('ProductType', {
  UNDEFINED: val(-1, 'undefined'),
  PHYSICAL: val(1, 'physical'),
  DIGITAL: val(2, 'digital'),
  SERVICE: val(3, 'service'),
  GIFT_CARD: val(4, 'gift-card'),
});

export const RecordType = makeEnum('RecordType', {
  UNDEFINED: val(-1, 'undefined'),
  TEXT: val(1, 'text'),
  IMAGE: val(2, 'image'),
  QUOTE: val(4, 'quote'),
  LINK: val(5, 'link'),
  AUDIO: val(7, 'audio'),
  VIDEO: val(8, 'video'),
  STORE_ITEM: val(11, 'store-item'),
  EVENT: val(12, 'event'),
  GALLERY: val(14, 'gallery'),
  BINARY: val(15, 'binary'),
  CSSASSET: val(16, 'css-asset'),
  TWEAKASSET: val(17, 'tweak-asset'),
  DIGITALGOOD: val(18, 'digital-good'),
  ATTACHMENT: val(19, 'attachment'),
  EXPORT_WORDPRESS: val(20, 'wordpress-export'),
  EXPORT_INTERNAL: val(21, 'json-export'),
  SITE_SEARCH: val(30, 'site-search'),
  ACTIVE_TIME: val(31, 'active-time'),
  TWEET: val(50, 'tweet'),
  CHECKIN: val(52, 'checkin'),
  KBARTICLE: val(54, 'kbarticle'),
});

export const SliceType = makeEnum('SliceType', {
  UNDEFINED: val(-1, 'undefined'),
  HEADING: val(1, 'heading'),
  BODY: val(3, 'body'),
  IMAGE: val(4, 'image'),
  GALLERY: val(5, 'gallery'),
  VIDEO: val(6, 'video'),
  SOCIAL_ICONS: val(7, 'social-icons'),
  BUTTONS: val(8, 'buttons'),
  NAVIGATION: val(9, 'navigation'),
  CUSTOM_FORM: val(10, 'custom-form'),
  NEWSLETTERL: val(11, 'newsletter'),
  ALBUM: val(12, 'album'),
  MAP: val(13, 'map'),
  LOGO: val(14, 'logo'),
  ACTION: val(15, 'action'),
  FORM: val(16, 'form'),
  LOCK: val(17, 'lock'),
  PASSWORD: val(18, 'password'),
  TWITTER: val(19, 'twitter'),
});
