import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getPosts } from '../lib/posts';

export async function GET(context: APIContext) {
  const posts = await getPosts();
  return rss({
    title: 'fathomforge — writing',
    description:
      'Notes on autonomous agents, runaway cost, and the security of systems that act on their own.',
    site: context.site!,
    trailingSlash: true,
    // Renders the feed as a readable page when a human opens it in a browser.
    stylesheet: '/rss.xsl',
    xmlns: { atom: 'http://www.w3.org/2005/Atom' },
    customData: [
      '<language>en-us</language>',
      '<copyright>© fathomforge</copyright>',
      '<managingEditor>carlos@fathomforge.dev (Carlos M.)</managingEditor>',
      '<atom:link href="https://fathomforge.dev/rss.xml" rel="self" type="application/rss+xml"/>',
    ].join(''),
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: p.data.date,
      categories: p.data.tags,
      link: `/writing/${p.id}/`,
    })),
  });
}
