import { Formatter } from '../../src/plugin';
import { executeTemplate } from '../util';

// Template imports
import commentLinkTemplate from './templates/comment-link.json';
import commentsTemplate from './templates/comments.json';
import likeButtonTemplate from './templates/like-button.json';


const TWITTER_LINKS_REGEX = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\\/%=~_|])/ig;
const TWITTER_LINKS_REPLACEMENT = '<a target="new" href="$1">$1</a>';
const TWITTER_TWEETS_REGEX = /(^| )@([a-zA-Z0-9_]+)/ig;
const TWITTER_TWEETS_REPLACEMENT = '$1<a target="new" href="http://www.twitter.com/$2/">@$2</a>';
const TWITTER_HASHTAG_REGEX = /(^| )#([a-zA-Z0-9_]+)/ig;


class ActivateTwitterLinksFormatter extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    let text = first.node.asString();
    text = text.replace(TWITTER_LINKS_REGEX).replace(TWITTER_LINKS_REPLACEMENT);
    text = text.replace(TWITTER_TWEETS_REGEX).replace(TWITTER_TWEETS_REPLACEMENT);
    text = text.replace(TWITTER_HASHTAG_REGEX, (match, prefix, hashtag) => {
      const escaped = escape(hashtag);
      // TODO: fix Java code to match new url for hashtags, and include '#' prefix.
      return prefix + `<a target="new" href="https://twitter.com/hashtag/${escaped}?src=hash">#${hashtag}</a>`;
    });
    first.set(text);
  }
}

const getCommentCount = item => {
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

class CommentCountFormatter extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    first.set(getCommentCount(first.node));
  }
}

class CommentLinkFormatter extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const text = executeTemplate(ctx, commentLinkTemplate, first.node, false);
    first.set(text);
  }
}

class CommentsFormatter extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const text = executeTemplate(ctx, commentsTemplate, first.node, false);
    first.set(text);
  }
}

class GoogleCalendarUrlFormatter extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const node = first.node;

    const start = node.get('startDate').asNumber();
    const end = node.get('endDate').asNumber();
    const title = escape(node.get('title').asString());

    // let res = `http://www.google.com/calendar/event?action=TEMPLATE&text=${title}&dates=`
    // TODO: complete when date formatting ready
  }
}

class LikeButtonFormatter extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const text = executeTemplate(ctx, likeButtonTemplate, first.node, false);
    first.set(text);
  }
}

class SocialButtonFormatter extends Formatter {
  apply(args, vars, ctx) {
    // TODO: implement
  }
}

class SocialButtonInlineFormatter extends Formatter {
  apply(args, vars, ctx) {
    // TODO: implement
  }
}

class TwitterFollowButtonFormatter extends Formatter {
  apply(args, vars, ctx) {
    const first = vars[0];
    const account = first.node;
    let userName = account.get('userName').asString();
    if (userName !== '') {
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

export default {
  'activate-twitter-links': new ActivateTwitterLinksFormatter(),
  'comment-count': new CommentCountFormatter(),
  'comment-link': new CommentLinkFormatter(),
  'comments': new CommentsFormatter(),
  'google-calendar-url': new GoogleCalendarUrlFormatter(),
  'like-button': new LikeButtonFormatter(),
  'social-button': new SocialButtonFormatter(),
  'social-button-inline': new SocialButtonInlineFormatter(),
  'twitter-follow-button': new TwitterFollowButtonFormatter(),
};
