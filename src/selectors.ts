// The site currently mixes server-rendered post pages with client-rendered product pages.
// Product selectors below are real selectors for server-rendered build-board snippets; detail-page
// selectors remain placeholders until IH exposes server-rendered product detail markup again.

export const HOME_SELECTORS = {
  latestCards: '.organic .story.homepage-post, .newest .story.homepage-post',
  title: '.story__title',
  titleLink: '.story__text-link',
  author: '.story__byline .user-link__name',
  commentCount: '.story__count--comments .story__count-number',
  score: '.story__count--likes .story__count-number',
} as const;

export const POST_SELECTORS = {
  title: 'h1.post-page__title',
  author: '.post-page__byline-author span',
  body: '.post-page__body',
  date: '.post-page__date',
  score: '.post-liker__count',
  commentCount: '.post-page__stat--comments',
  commentItem: '.comment-tree > li > .comment, .comment-tree li > .comment',
  commentBody: '.comment__content',
  commentAuthor: '.footer__user-link .user-link__name',
  commentDate: '.footer__date',
  relatedPostLinks: '.post-page__recommended-posts .story__text-link',
} as const;

export const PRODUCT_SELECTORS = {
  buildBoardCard: '.build-board__content .story.homepage-post',
  name: '.entry__product-name span',
  tagline: '.entry__product-tagline span',
  updateTitle: '.story__title',
  rank: '.entry__rank span:last-child',
  score: '.entry__voter-number',
  // Placeholder selectors for a future SSR product detail page.
  detailName: '[data-product-name]',
  detailTagline: '[data-product-tagline]',
  detailMaker: '[data-product-maker]',
  detailRevenue: '[data-product-revenue]',
  detailMilestones: '[data-product-milestones] li',
} as const;
