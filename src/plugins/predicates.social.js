import { Predicate } from '../plugin';
import { isTruthy } from '../util';


class CommentsPredicate extends Predicate {
  apply(args, ctx) {
    const settings = ctx.resolve(['websiteSettings']);
    const node = ctx.node();
    let commentsOn = node.get('commentState').asNumber() === 1;
    if (!commentsOn && node.get('publicCommentCount').asNumber() > 0) {
      commentsOn = true;
    }
    if (!settings.isMissing() && !isTruthy(settings.get('commentsEnabled'))) {
      commentsOn = false;
    }
    return commentsOn;
  }
}

class DisqusPredicate extends Predicate {
  apply(args, ctx) {
    return isTruthy(ctx.resolve(['websiteSettings', 'disqusShortName']));
  }
}

export default {
  'comments?': new CommentsPredicate(),
  'disqus?': new DisqusPredicate(),
};
