import { Predicate } from '../plugin';
import { BackgroundSource, CollectionType, FolderBehavior, RecordType } from './enums';
import { removeTags } from './util.string';
import types from '../types';
import { isTruthy } from '../util';


class BackgroundSourcePredicate extends Predicate {
  constructor(type) {
    super();
    this.code = type.code;
  }

  apply(args, ctx) {
    return ctx.node().get('backgroundSource').asNumber() === this.code;
  }
}

class CalendarViewPredicate extends Predicate {
  apply(args, ctx) {
    return ctx.resolve(['calendarView']).asBoolean();
  }
}

class ChildImagesPredicate extends Predicate {
  apply(args, ctx) {
    const items = ctx.node().get('items');
    if (items.type === types.ARRAY && items.size() > 0) {
      const first = items.get(0);
      return isTruthy(first.get('mainImageId')) || isTruthy(first.get('systemDataId'));
    }
    return false;
  }
}

class ClickablePredicate extends Predicate {
  apply(args, ctx) {
    const node = ctx.resolve(['folderBehavior']);
    if (node.isMissing()) {
      return true;
    }
    const type = node.asNumber();
    return type === FolderBehavior.INDEX.code || type === FolderBehavior.REDIRECT.code;
  }
}

class CollectionPredicate extends Predicate {
  apply(args, ctx) {
    return isTruthy(ctx.node().get('collection'));
  }
}

class CollectionPagePredicate extends Predicate {
  apply(args, ctx) {
    const type = ctx.node().path(['collection', 'type']);
    if (!type.isMissing()) {
      return CollectionType.COLLECTION_TYPE_PAGE.code === type.asNumber();
    }
    return false;
  }
}

class CollectionTemplatePagePredicate extends Predicate {
  apply(args, ctx) {
    const collection = ctx.node().get('collection');
    if (collection.isMissing()) {
      const type = ctx.node().get('type');
      if (!type.isMissing()) {
        return CollectionType.TEMPLATE_PAGE.code === type.asNumber();
      }
    } else {
      const type = collection.get('type');
      if (!type.isMissing()) {
        return CollectionType.TEMPLATE_PAGE.code === type.asNumber();
      }
    }
    return false;
  }
}

class CollectionTypeNameEqualsPredicate extends Predicate {
  apply(args, ctx) {
    return args.length === 0 ? false : ctx.resolve(['typeName']).asString().equals(args[0]);
  }
}

const WHITESPACE_NBSP = /[\s\u200b\u00a0]+]/g;

class ExcerptPredicate extends Predicate {
  apply(args, ctx) {
    const excerpt = ctx.node().get('excerpt');
    const html = excerpt.path('html');
    let text = '';
    if (html.type === types.STRING) {
      text = html.asString();
    } else if (excerpt.type === types.STRING) {
      text = excerpt.asString();
    }
    text = removeTags(text);
    text = text.replace(WHITESPACE_NBSP, '');
    return text.length > 0;
  }
}

class ExternalLinkPredicate extends Predicate {
  apply(args, ctx) {
    return isTruthy(ctx.node().get('externalLink'));
  }
}

class FolderPredicate extends Predicate {
  apply(args, ctx) {
    return isTruthy(ctx.node().path(['collection', 'folder']));
  }
}

class GalleryBooleanPredicate extends Predicate {
  constructor(option) {
    super();
    this.option = option;
  }

  apply(args, ctx) {
    const node = ctx.resolve(['options']).get(this.option);
    return node.isMissing() ? false : node.asBoolean();
  }
}

class GalleryMetaPredicate extends Predicate {
  apply(args, ctx) {
    const options = ctx.resolve('options');
    return isTruthy(options.get('controls')) || isTruthy(options.get('indicators'));
  }
}

class GallerySelectPredicate extends Predicate {
  constructor(option, name) {
    super();
    this.option = option;
    this.name = name;
  }

  apply(args, ctx) {
    const node = ctx.resolve(['options']).get(this.option);
    return node.isMissing() ? false : this.name === node.asString();
  }
}

class HasMultiplePredicate extends Predicate {
  apply(args, ctx) {
    return ctx.node().size() > 1;
  }
}

class IndexPredicate extends Predicate {
  apply(args, ctx) {
    const collection = ctx.node().get('collection');
    if (collection.type !== types.OBJECT) {
      return false;
    }
    const folder = collection.get('folder');
    const behavior = folder.get('folderBehavior');
    return isTruthy(folder) &&
      behavior.type === types.NUMBER &&
      behavior.asNumber() === FolderBehavior.INDEX.code;
  }
}

class LocationPredicate extends Predicate {
  apply(args, ctx) {
    const location = ctx.node().get('location');
    if (location.get('mapLat').isMissing() || location.get('mapLng').isMissing()) {
      return false;
    }
    return true;
  }
}

class MainImagePredicate extends Predicate {
  apply(args, ctx) {
    const node = ctx.node();
    return isTruthy(node.get('mainImageId')) || isTruthy(node.get('systemDataId'));
  }
}

class PassThroughPredicate extends Predicate {
  apply(args, ctx) {
    const pass = ctx.node().get('passthrough');
    const url = ctx.node().get('sourceUrl').asString();
    return isTruthy(pass) && url !== '';
  }
}

class PromotedBlockTypePredicate extends Predicate {
  constructor(promotedBlockType) {
    super();
    this.promotedBlockType = promotedBlockType;
  }

  apply(args, ctx) {
    ctx.node().get('promotedBlockType').asString().equals(this.promotedBlockType);
  }
}

class PromotedRecordTypePredicate extends Predicate {
  constructor(recordType, promotedBlockType) {
    super();
    this.code = recordType.code;
    this.promotedBlockType = promotedBlockType;
  }

  apply(args, ctx) {
    const node = ctx.node();
    return node.get('recordType').asNumber() === this.code ||
      node.get('promotedBlockType').asString() === this.promotedBlockType;
  }
}

class RecordTypePredicate extends Predicate {
  constructor(recordType) {
    super();
    this.code = recordType.code;
  }

  apply(args, ctx) {
    return ctx.node().get('recordType').asNumber() === this.code;
  }
}

class RedirectPredicate extends Predicate {
  apply(args, ctx) {
    return ctx.node().get('folderBehavior').asNumber() === FolderBehavior.REDIRECT.code;
  }
}

// TODO: same-day?

class SameDayPredicate extends Predicate {
  apply(args, ctx) {
    return false;
  }
}

class ServiceNameEmailPredicate extends Predicate {
  apply(args, ctx) {
    return ctx.node().get('serviceName').asString() === 'email';
  }
}

class ShowPastEventsPredicate extends Predicate {
  apply(args, ctx) {
    return ctx.node().get('showPastOrUpcomingEvents').asString() === 'past';
  }
}

// BUILD TABLE AND EXPORT

const TABLE = {
  'calendar-view?': new CalendarViewPredicate(),
  'child-images?': new ChildImagesPredicate(),
  'clickable?': new ClickablePredicate(),
  'collection?': new CollectionPredicate(),
  'collection-page?': new CollectionPagePredicate(),
  'collection-template-page?': new CollectionTemplatePagePredicate(),
  'collectionTypeNameEquals?': new CollectionTypeNameEqualsPredicate(),
  'excerpt?': new ExcerptPredicate(),
  'external-link?': new ExternalLinkPredicate(),
  'folder?': new FolderPredicate(),
  'gallery-meta?': new GalleryMetaPredicate(),
  'has-multiple?': new HasMultiplePredicate(),
  'index?': new IndexPredicate(),
  'location?': new LocationPredicate(),
  'main-image?': new MainImagePredicate(),
  'passthrough?': new PassThroughPredicate(),
  'redirect?': new RedirectPredicate(),
  'same-day?': new SameDayPredicate(),
  'serviceNameEmail?': new ServiceNameEmailPredicate(),
  'show-past-events?': new ShowPastEventsPredicate(),
};

const GALLERY_DESIGN_SELECT = [
  'grid', 'slideshow', 'slider', 'stacked'
];

const META_POSITION_SELECT = [
  'top', 'top-left', 'top-right', 'center', 'bottom', 'bottom-left', 'bottom-right'
];

const ACTIVE_ALIGNMENT_SELECT = [
  'center', 'left', 'right'
];

const GALLERY_BOOLEAN = [
  'autoplay', 'auto-crop', 'controls', 'lightbox', 'square-thumbs', 'show-meta',
  'show-meta-on-hover', 'thumbnails'
];

const PROMOTED_RECORD_PREDICATES = new Set([
  RecordType.VIDEO, RecordType.IMAGE, RecordType.QUOTE, RecordType.LINK, RecordType.GALLERY,
]);

const PROMOTED_BLOCK_TYPES = [
  'map', 'embed', 'image', 'code', 'quote', 'twitter', 'link', 'video', 'foursquare',
  'instagram', 'form'
];

GALLERY_DESIGN_SELECT.forEach(name => {
  const identifier = `gallery-design-${name}?`;
  TABLE[identifier] = new GallerySelectPredicate('design', name);
});

META_POSITION_SELECT.forEach(name => {
  const identifier = `gallery-meta-position-${name}?`;
  TABLE[identifier] = new GallerySelectPredicate('meta-position', name);
});

ACTIVE_ALIGNMENT_SELECT.forEach(name => {
  const identifier = `gallery-active-alignment-${name}?`;
  TABLE[identifier] = new GallerySelectPredicate('active-alignment', name);
});

GALLERY_BOOLEAN.forEach(option => {
  const identifier = `gallery-${option}?`;
  TABLE[identifier] = new GalleryBooleanPredicate(option);
});

RecordType.values().forEach(type => {
  if (PROMOTED_RECORD_PREDICATES.has(type)) {
    return;
  }
  const identifier = `${type.string}?`;
  TABLE[identifier] = new RecordTypePredicate(type);
});

TABLE['external-video?'] = new PromotedRecordTypePredicate(RecordType.VIDEO, 'video');
TABLE['video?'] = new PromotedRecordTypePredicate(RecordType.VIDEO, 'video');
TABLE['image?'] = new PromotedRecordTypePredicate(RecordType.IMAGE, 'image');
TABLE['quote?'] = new PromotedRecordTypePredicate(RecordType.QUOTE, 'quote');
TABLE['link?'] = new PromotedRecordTypePredicate(RecordType.LINK, 'link');
TABLE['gallery?'] = new PromotedRecordTypePredicate(RecordType.GALLERY, 'gallery');

PROMOTED_BLOCK_TYPES.forEach(type => {
  const identifier = `promoted${type.toUpperCase()}?`;
  TABLE[identifier] = new PromotedBlockTypePredicate(type);
});

BackgroundSource.values().forEach(type => {
  const identifier = `background-source-${type.string}?`;
  TABLE[identifier] = new BackgroundSourcePredicate(type);
});

export default TABLE;
