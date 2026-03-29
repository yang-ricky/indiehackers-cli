import Parser from 'rss-parser';
import { ParseError } from '../errors.js';
import type { Post } from '../models/index.js';
import {
  buildPostUrl,
  compactObject,
  extractPostId,
  toIsoStringFromTimestamp,
  toNullableString,
} from '../utils.js';

interface FeedItem {
  categories?: string[];
  creator?: string;
  guid?: string;
  isoDate?: string;
  link?: string;
  pubDate?: string;
  title?: string;
}

const parser = new Parser<Record<string, never>, FeedItem>({
  customFields: {
    item: [['dc:creator', 'creator']],
  },
});

export async function parseRssFeed(xml: string): Promise<Post[]> {
  const feed = await parser.parseString(xml);

  return feed.items.flatMap((item) => {
    const title = toNullableString(item.title);
    const link = toNullableString(item.link || item.guid);

    if (!title || !link) {
      return [];
    }

    const id = extractPostId(link);
    if (!id) {
      throw new ParseError('RSS item is missing a usable post identifier.');
    }

    return [
      compactObject({
        author: toNullableString(item.creator) ?? undefined,
        date: toNullableString(item.isoDate || item.pubDate) ?? undefined,
        id,
        tags: item.categories?.length ? item.categories : undefined,
        title,
        url: buildRssBackedPostUrl(link),
      }),
    ];
  });
}

export function buildRssBackedPostUrl(link: string): string {
  return buildPostUrl(extractPostId(link));
}

export function postFromFirebaseSummary(
  id: string,
  value: {
    createdTimestamp?: number;
    numReplies?: number;
    title?: string;
    username?: string;
  },
): Post {
  if (!value.title) {
    throw new ParseError(`Post ${id} is missing a title.`);
  }

  return compactObject({
    author: value.username,
    commentCount: value.numReplies,
    date: toIsoStringFromTimestamp(value.createdTimestamp),
    id,
    title: value.title,
    url: buildPostUrl(id),
  });
}
