import { GregorianDate } from '../calendars';

import { Context } from '../context';
import { Node } from '../node';
import { Formatter, FormatterTable } from '../plugin';
import { executeTemplate } from '../exec';
import { RootCode } from '../instructions';
import { Variable } from '../variable';
import { formatDate } from './util.date';

// Template imports
import commentLinkTemplate from './templates/comment-link.json';
import commentsTemplate from './templates/comments.json';
import likeButtonTemplate from './templates/like-button.json';
import { makeSocialButton } from './util.social';

const TWITTER_LINKS_REGEX = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\\/%=~_|])/gi;
const TWITTER_LINKS_REPLACEMENT = '<a target="new" href="$1">$1</a>';
const TWITTER_TWEETS_REGEX = /(^| )@([a-z0-9_]+)/gi;
const TWITTER_TWEETS_REPLACEMENT = '$1<a target="new" href="https://twitter.com/$2/">@$2</a>';
const TWITTER_HASHTAG_REGEX = /(^| )#([a-z0-9_]+)/gi;

export class ActivateTwitterLinksFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    let text = first.node.asString();
    text = text.replace(TWITTER_LINKS_REGEX, TWITTER_LINKS_REPLACEMENT);
    text = text.replace(TWITTER_TWEETS_REGEX, TWITTER_TWEETS_REPLACEMENT);
    text = text.replace(TWITTER_HASHTAG_REGEX, (match, prefix, hashtag) => {
      const escaped = escape(hashtag);
      // TODO: fix Java code to match new url for hashtags, and include '#' prefix.
      return prefix + `<a target="new" href="https://twitter.com/hashtag/${escaped}?src=hash">#${hashtag}</a>`;
    });
    first.set(text);
  }
}

const getCommentCount = (item: Node) => {
  let res = '';
  const count = item.get('publicCommentCount').asNumber();
  if (count === 0) {
    res += 'No';
  } else {
    res += count;
  }
  res += ' Comment';
  if (count !== 1) {
    res += 's';
  }
  return res;
};

export class CommentCountFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    first.set(getCommentCount(first.node));
  }
}

export class CommentLinkFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const text = executeTemplate(ctx, commentLinkTemplate as unknown as RootCode, first.node, false);
    first.set(text);
  }
}

export class CommentsFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const text = executeTemplate(ctx, commentsTemplate as unknown as RootCode, first.node, false);
    first.set(text);
  }
}

// const CALENDAR_DATE_FORMAT = 'YYYYMMDD[T]HHmmss[Z]';
const CALENDAR_DATE_FORMAT = '%Y%m%dT%H%M%SZ';

const getLocationString = (node: Node) => {
  const address1 = node.get('addressLine1').asString().trim();
  const address2 = node.get('addressLine2').asString().trim();
  const country = node.get('addressCountry').asString().trim();

  return [address1, address2, country].filter((s) => s.length > 0).join(', ');
};

export class GoogleCalendarUrlFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const node = first.node;

    const startInstant = node.get('startDate').asNumber();
    const endInstant = node.get('endDate').asNumber();
    const title = escape(node.get('title').asString());

    const d1 = GregorianDate.fromUnixEpoch(startInstant, 'UTC');
    const d2 = GregorianDate.fromUnixEpoch(endInstant, 'UTC');

    const start = formatDate(d1, CALENDAR_DATE_FORMAT);
    const end = formatDate(d2, CALENDAR_DATE_FORMAT);

    let buf = `http://www.google.com/calendar/event?action=TEMPLATE&text=${title}`;
    buf += `&dates=${start}/${end}`;

    const location = node.get('location');
    if (!location.isMissing()) {
      const text = getLocationString(location);
      if (text !== '') {
        buf += `&location=${encodeURIComponent(text)}`;
      }
    }
    first.set(buf);
  }
}

export class LikeButtonFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const text = executeTemplate(ctx, likeButtonTemplate as unknown as RootCode, first.node, false);
    first.set(text);
  }
}

export class SocialButtonFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const website = ctx.resolve(['website']);
    const text = makeSocialButton(website, first.node, false);
    first.set(text);
  }
}

export class SocialButtonInlineFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const website = ctx.resolve(['website']);
    const text = makeSocialButton(website, first.node, true);
    first.set(text);
  }
}

export class TwitterFollowButtonFormatter extends Formatter {
  apply(args: string[], vars: Variable[], ctx: Context): void {
    const first = vars[0];
    const account = first.node;
    let userName = account.get('userName').asString();
    if (userName === '') {
      const profileUrl = account.get('profileUrl').asString();
      const parts = profileUrl.split('/');
      userName = parts[parts.length - 1];
    }

    let res = "<script>Y.use('squarespace-follow-buttons', function(Y) { ";
    res += "Y.on('domready', function() { Y.Squarespace.FollowButtonUtils.renderAll(); }); });";
    res += `</script><div class="squarespace-follow-button" data-username="${userName}"></div>`;
    first.set(res);
  }
}

export const SOCIAL_FORMATTERS: FormatterTable = {
  'activate-twitter-links': new ActivateTwitterLinksFormatter(),
  'comment-count': new CommentCountFormatter(),
  'comment-link': new CommentLinkFormatter(),
  comments: new CommentsFormatter(),
  'google-calendar-url': new GoogleCalendarUrlFormatter(),
  'like-button': new LikeButtonFormatter(),
  'social-button': new SocialButtonFormatter(),
  'social-button-inline': new SocialButtonInlineFormatter(),
  'twitter-follow-button': new TwitterFollowButtonFormatter(),
};
