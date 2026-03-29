import { load } from 'cheerio';
import { ParseError } from '../errors.js';
import type { Comment, Post, PostDetail } from '../models/index.js';
import { HOME_SELECTORS, POST_SELECTORS } from '../selectors.js';
import {
  buildPostUrl,
  compactObject,
  extractPostId,
  normalizeMultilineText,
  normalizeWhitespace,
  numericTextToNumber,
  toNullableString,
} from '../utils.js';

export function parseLatestPostsFromHtml(html: string): Post[] {
  const $ = load(html);
  const posts: Post[] = [];

  $(HOME_SELECTORS.latestCards).each((_, element) => {
    const card = $(element);
    const href = card.find(HOME_SELECTORS.titleLink).attr('href');

    if (!href?.startsWith('/post/')) {
      return;
    }

    const title = toNullableString(card.find(HOME_SELECTORS.title).text());
    if (!title) {
      return;
    }

    posts.push(
      compactObject({
        author:
          toNullableString(card.find(HOME_SELECTORS.author).text()) ??
          undefined,
        commentCount: numericTextToNumber(
          card.find(HOME_SELECTORS.commentCount).text(),
        ),
        id: extractPostId(href),
        score: numericTextToNumber(card.find(HOME_SELECTORS.score).text()),
        title,
        url: buildPostUrl(href),
      }),
    );
  });

  return dedupePosts(posts);
}

export function parsePostDetailFromHtml(
  html: string,
  sourceUrl: string,
): PostDetail {
  const $ = load(html);
  const title = toNullableString($(POST_SELECTORS.title).first().text());
  const bodyHtml = $(POST_SELECTORS.body).first().html();

  if (!title || !bodyHtml) {
    throw new ParseError(
      `Failed to parse required post fields from ${sourceUrl}`,
    );
  }

  const bodyText = extractRichText($, $(POST_SELECTORS.body).first());
  if (!bodyText) {
    throw new ParseError(`Parsed an empty post body from ${sourceUrl}`);
  }

  const comments = parseCommentsFromHtml(html);

  return compactObject({
    author:
      toNullableString($(POST_SELECTORS.author).first().text()) ?? undefined,
    body: bodyText,
    commentCount: parseCommentCount(
      $(POST_SELECTORS.commentCount).first().text(),
    ),
    comments: comments.length ? comments : undefined,
    date:
      $(POST_SELECTORS.date).first().find('span').text().trim() ||
      $(POST_SELECTORS.date).first().attr('title') ||
      undefined,
    id: extractPostId(sourceUrl),
    score: numericTextToNumber($(POST_SELECTORS.score).first().text()),
    title,
    url: buildPostUrl(sourceUrl),
  });
}

export function parseCommentsFromHtml(html: string): Comment[] {
  const $ = load(html);
  const comments: Comment[] = [];

  $(POST_SELECTORS.commentItem).each((_, element) => {
    const comment = $(element);
    const body = extractRichText(
      $,
      comment.find(POST_SELECTORS.commentBody).first(),
    );

    if (!body) {
      return;
    }

    comments.push(
      compactObject({
        author:
          toNullableString(
            comment.find(POST_SELECTORS.commentAuthor).first().text(),
          ) ?? undefined,
        body,
        date:
          comment.find(POST_SELECTORS.commentDate).first().attr('title') ||
          toNullableString(
            comment.find(POST_SELECTORS.commentDate).first().text(),
          ) ||
          undefined,
      }),
    );
  });

  return comments;
}

function parseCommentCount(value: string): number | undefined {
  return numericTextToNumber(normalizeWhitespace(value));
}

function extractRichText(
  $: ReturnType<typeof load>,
  container: ReturnType<ReturnType<typeof load>>,
): string {
  const blocks = container
    .children('blockquote, h1, h2, h3, h4, h5, h6, li, ol, p, pre, ul')
    .toArray()
    .map((node) => normalizeMultilineText($(node).text()))
    .filter(Boolean);

  if (blocks.length) {
    return blocks.join('\n\n');
  }

  return normalizeMultilineText(container.text());
}

function dedupePosts(posts: Post[]): Post[] {
  const seen = new Set<string>();
  return posts.filter((post) => {
    if (seen.has(post.id)) {
      return false;
    }

    seen.add(post.id);
    return true;
  });
}
