import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const writing = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/writing',
    // `foo.draft.md` and `foo.md` both resolve to the slug `foo`, so a draft
    // previews at its real URL and publishing never changes the link.
    generateId: ({ entry }) => entry.replace(/\.draft\.md$/, '').replace(/\.md$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    /** Drafts are visible in `astro dev` and excluded from the build. */
    draft: z.boolean().default(true),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { writing };
