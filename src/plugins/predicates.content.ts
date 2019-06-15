import { Context } from '../context';
import { Predicate, PredicateTable } from '../plugin';
import { BackgroundSource, CollectionType, FolderBehavior, RecordType } from './enums';
import { removeTags } from './util.string';
import { Type } from '../types';
import { isTruthy } from '../util';

import * as moment from 'moment-timezone';


export class BackgroundSourcePredicate extends Predicate {
  private code: number;
  constructor(type: BackgroundSource) {
    super();
    this.code = type.code;
  }

  apply(args: string[], ctx: Context) {
    return ctx.node().get('backgroundSource').asNumber() === this.code;
  }
}

export class CalendarViewPredicate extends Predicate {
  apply(args: string[], ctx: Context) {
    return ctx.resolve(['calendarView']).asBoolean();
  }
}

export class ChildImagesPredicate extends Predicate {
  apply(args: string[], ctx: Context) {
    const items = ctx.node().get('items');
    if (items.type === Type.ARRAY && items.size() > 0) {
      const first = items.get(0);
      return isTruthy(first.get('mainImageId')) || isTruthy(first.get('systemDataId'));
    }
    return false;
  }
}

export class ClickablePredicate extends Predicate {
  apply(args: string[], ctx: Context) {
    const node = ctx.resolve(['folderBehavior']);
    if (node.isMissing()) {
      return true;
    }
    const type = node.asNumber();
    return type === FolderBehavior.INDEX.code || type === FolderBehavior.REDIRECT.code;
  }
}

export class CollectionPredicate extends Predicate {
  apply(args: string[], ctx: Context) {
    return isTruthy(ctx.node().get('collection'));
  }
}

export class CollectionPagePredicate extends Predicate {
  apply(args: string[], ctx: Context) {
    const type = ctx.node().path(['collection', 'type']);
    if (!type.isMissing()) {
      return CollectionType.COLLECTION_TYPE_PAGE.code === type.asNumber();
    }
    return false;
  }
}

export class CollectionTemplatePagePredicate extends Predicate {
  apply(args: string[], ctx: Context) {
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

export class CollectionTypeNameEqualsPredicate extends Predicate {
  apply(args: string[], ctx: Context) {
    return args.length === 0 ? false : ctx.resolve(['typeName']).asString() === args[0];
  }
}

const WHITESPACE_NBSP = /[\s\u200b\u00a0]+/g;

export class ExcerptPredicate extends Predicate {
  apply(args: string[], ctx: Context) {
    const excerpt = ctx.node().get('excerpt');
    const html = excerpt.get('html');
    let text = '';
    if (html.type === Type.STRING) {
      text = html.asString();
    } else if (excerpt.type === Type.STRING) {
      text = excerpt.asString();
    }
    text = removeTags(text);
    text = text.replace(WHITESPACE_NBSP, '');
    return text.length > 0;
  }
}

export class ExternalLinkPredicate extends Predicate {
  apply(args: string[], ctx: Context) {
    return isTruthy(ctx.node().get('externalLink'));
  }
}

export class FolderPredicate extends Predicate {
  apply(args: string[], ctx: Context) {
    return isTruthy(ctx.node().path(['collection', 'folder']));
  }
}

export class GalleryBooleanPredicate extends Predicate {
  constructor(private option: string) {
    super();
  }

  apply(args: string[], ctx: Context) {
    const node = ctx.resolve(['options']).get(this.option);
    return node.isMissing() ? false : node.asBoolean();
  }
}

export class GalleryMetaPredicate extends Predicate {
  apply(args: string[], ctx: Context) {
    const options = ctx.resolve(['options']);
    return isTruthy(options.get('controls')) || isTruthy(options.get('indicators'));
  }
}

export class GallerySelectPredicate extends Predicate {
  constructor(private option: string, private name: string) {
    super();
  }

  apply(args: string[], ctx: Context) {
    const node = ctx.resolve(['options']).get(this.option);
    return node.isMissing() ? false : this.name === node.asString();
  }
}

export class HasMultiplePredicate extends Predicate {
  apply(args: string[], ctx: Context) {
    return ctx.node().size() > 1;
  }
}

export class IndexPredicate extends Predicate {
  apply(args: string[], ctx: Context) {
    const collection = ctx.node().get('collection');
    if (collection.type !== Type.OBJECT) {
      return false;
    }
    const folder = collection.get('folder');
    const behavior = collection.get('folderBehavior');
    return isTruthy(folder) &&
      behavior.type === Type.NUMBER &&
      behavior.asNumber() === FolderBehavior.INDEX.code;
  }
}

export class LocationPredicate extends Predicate {
  apply(args: string[], ctx: Context) {
    const location = ctx.node().get('location');
    if (location.get('mapLat').isMissing() || location.get('mapLng').isMissing()) {
      return false;
    }
    return true;
  }
}

export class MainImagePredicate extends Predicate {
  apply(args: string[], ctx: Context) {
    const node = ctx.node();
    return isTruthy(node.get('mainImageId')) || isTruthy(node.get('systemDataId'));
  }
}

export class PassThroughPredicate extends Predicate {
  apply(args: string[], ctx: Context) {
    const pass = ctx.node().get('passthrough');
    const url = ctx.node().get('sourceUrl').asString();
    return isTruthy(pass) && url !== '';
  }
}

export class PromotedBlockTypePredicate extends Predicate {
  constructor(private promotedBlockType: string) {
    super();
  }

  apply(args: string[], ctx: Context) {
    return ctx.node().get('promotedBlockType').asString() === this.promotedBlockType;
  }
}

export class PromotedRecordTypePredicate extends Predicate {
  private code: number;
  constructor(recordType: RecordType, private promotedBlockType: string) {
    super();
    this.code = recordType.code;
  }

  apply(args: string[], ctx: Context) {
    const node = ctx.node();
    return node.get('recordType').asNumber() === this.code ||
      node.get('promotedBlockType').asString() === this.promotedBlockType;
  }
}

export class RecordTypePredicate extends Predicate {
  private code: number;
  constructor(recordType: RecordType) {
    super();
    this.code = recordType.code;
  }

  apply(args: string[], ctx: Context) {
    return ctx.node().get('recordType').asNumber() === this.code;
  }
}

export class RedirectPredicate extends Predicate {
  apply(args: string[], ctx: Context) {
    return ctx.node().get('folderBehavior').asNumber() === FolderBehavior.REDIRECT.code;
  }
}

export class SameDayPredicate extends Predicate {
  apply(args: string[], ctx: Context) {
    const node = ctx.node();
    const startDate = node.get('startDate').asNumber();
    const endDate = node.get('endDate').asNumber();
    const m1 = moment.tz(startDate, 'UTC');
    const m2 = moment.tz(endDate, 'UTC');
    return m1.year() === m2.year() && m1.month() === m2.month() && m1.date() === m2.date();
  }
}

export class ServiceNameEmailPredicate extends Predicate {
  apply(args: string[], ctx: Context) {
    return ctx.node().get('serviceName').asString() === 'email';
  }
}

export class ShowPastEventsPredicate extends Predicate {
  apply(args: string[], ctx: Context) {
    return ctx.node().get('showPastOrUpcomingEvents').asString() === 'past';
  }
}

// BUILD TABLE AND EXPORT

export const TABLE: PredicateTable = {
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
  const identifier = `${type.name}?`;
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
  const identifier = `background-source-${type.name}?`;
  TABLE[identifier] = new BackgroundSourcePredicate(type);
});
