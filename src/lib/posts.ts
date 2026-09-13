import { getCollection, type CollectionEntry } from 'astro:content';

/**
 * Published posts, newest first.
 *
 * Drafts stay visible in `astro dev` so the site can be reviewed with real
 * content, and are excluded from every production build — nothing reaches the
 * public site until its front matter says `draft: false`.
 */
export async function getPosts(): Promise<CollectionEntry<'writing'>[]> {
  const posts = await getCollection('writing', ({ data }) =>
    import.meta.env.DEV ? true : data.draft === false,
  );
  return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

/**
 * Front matter dates are bare `YYYY-MM-DD`, which parse as UTC midnight. Format
 * in UTC too, or every post reads a day early west of Greenwich.
 */
export const formatDate = (d: Date) =>
  d.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  });

/** Rough reading time from the raw markdown, at 220 wpm. */
export function readingTime(body: string | undefined): number {
  if (!body) return 1;
  const words = body
    .replace(/```[\s\S]*?```/g, ' ')   // fenced code
    .replace(/<!--[\s\S]*?-->/g, ' ')  // comments
    .replace(/[#>*_`\[\]()|-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

/** The chronological neighbours of a post, for footer navigation. */
export function neighbours(
  all: CollectionEntry<'writing'>[],
  id: string,
): { newer?: CollectionEntry<'writing'>; older?: CollectionEntry<'writing'> } {
  const i = all.findIndex((p) => p.id === id);
  if (i === -1) return {};
  return { newer: all[i - 1], older: all[i + 1] };
}
