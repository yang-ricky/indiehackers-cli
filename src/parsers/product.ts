import { load } from 'cheerio';
import { ParseError } from '../errors.js';
import type { Milestone, Product } from '../models/index.js';
import { PRODUCT_SELECTORS } from '../selectors.js';
import {
  buildProductUrl,
  compactObject,
  normalizeMultilineText,
  toNullableString,
} from '../utils.js';

export function parseProductFromHtml(html: string, sourceUrl: string): Product {
  const $ = load(html);
  const name =
    toNullableString($(PRODUCT_SELECTORS.name).first().text()) ??
    toNullableString($(PRODUCT_SELECTORS.detailName).first().text()) ??
    toNullableString($('meta[property="og:title"]').attr('content'));

  if (!name) {
    throw new ParseError(`Failed to parse product name from ${sourceUrl}`);
  }

  const product: Product = compactObject({
    description:
      toNullableString($(PRODUCT_SELECTORS.updateTitle).first().text()) ??
      toNullableString($(PRODUCT_SELECTORS.detailRevenue).first().text()) ??
      undefined,
    maker:
      toNullableString($(PRODUCT_SELECTORS.detailMaker).first().text()) ??
      undefined,
    milestones: parseMilestones($),
    name,
    revenue:
      toNullableString($(PRODUCT_SELECTORS.detailRevenue).first().text()) ??
      undefined,
    tagline:
      toNullableString(
        $(PRODUCT_SELECTORS.name).first().text() === name
          ? $(PRODUCT_SELECTORS.tagline).first().text()
          : '',
      ) ??
      toNullableString($(PRODUCT_SELECTORS.detailTagline).first().text()) ??
      toNullableString($('meta[property="og:description"]').attr('content')) ??
      undefined,
    url: buildProductUrl(sourceUrl),
  });

  return product;
}

export function productFromFirebaseRecord(
  slug: string,
  value: {
    description?: string;
    name?: string;
    tagline?: string;
  },
): Product {
  if (!value.name) {
    throw new ParseError(`Product ${slug} is missing a name.`);
  }

  return compactObject({
    description: toNullableString(value.description) ?? undefined,
    name: value.name,
    tagline: toNullableString(value.tagline) ?? undefined,
    url: buildProductUrl(slug),
  });
}

function parseMilestones($: ReturnType<typeof load>): Milestone[] | undefined {
  const milestones: Milestone[] = [];

  $(PRODUCT_SELECTORS.detailMilestones).each((_, element) => {
    const item = normalizeMultilineText($(element).text());
    if (!item) {
      return;
    }

    milestones.push({ description: item });
  });

  return milestones.length ? milestones : undefined;
}
