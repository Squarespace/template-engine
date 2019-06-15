import { Context } from '../context';
import { Predicate, PredicateTable } from '../plugin';
import { isTruthy } from '../util';


export class CommentsPredicate extends Predicate {
  apply(args: string[], ctx: Context) {
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

export class DisqusPredicate extends Predicate {
  apply(args: string[], ctx: Context) {
    return isTruthy(ctx.resolve(['websiteSettings', 'disqusShortName']));
  }
}

export const TABLE: PredicateTable = {
  'comments?': new CommentsPredicate(),
  'disqus?': new DisqusPredicate(),
};
