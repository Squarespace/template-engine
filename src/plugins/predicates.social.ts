import { Context } from '../context';
import { PredicatePlugin, PredicateTable } from '../plugin';
import { isTruthy } from '../node';

export class CommentsPredicate extends PredicatePlugin {
  apply(args: string[], ctx: Context): boolean {
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

export class DisqusPredicate extends PredicatePlugin {
  apply(args: string[], ctx: Context): boolean {
    return isTruthy(ctx.resolve(['websiteSettings', 'disqusShortName']));
  }
}

export const SOCIAL_PREDICATES: PredicateTable = {
  'comments?': new CommentsPredicate(),
  'disqus?': new DisqusPredicate(),
};
