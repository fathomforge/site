// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://fathomforge.dev',
  integrations: [sitemap()],
  // 'never' keeps every stylesheet external, which is what lets the generated
  // CSP use a bare `style-src 'self'` with no hashes. Do not relax this without
  // updating tools/make-headers.mjs.
  build: { inlineStylesheets: 'never' },
  vite: {
    // Vite inlines small assets as data: URIs; that would force `data:` into
    // font-src. Keeping every asset a real file lets the CSP stay tight (and
    // the files stay cacheable).
    build: { assetsInlineLimit: 0 },
  },
  markdown: {
    // Shiki writes `style="..."` onto <pre> and onto every token span. Style
    // ATTRIBUTES cannot be covered by CSP hashes, so highlighting would require
    // loosening style-src — and `style-src-attr` is not supported everywhere, so
    // the loosening would work in some browsers and silently fail in others.
    // Code blocks here are short and few; plain <pre><code> styled by our own
    // stylesheet keeps "no inline styles anywhere" true in every browser.
    syntaxHighlight: false,
    // Off, so posts use the same straight quotes as the hand-written pages.
    // With it on, only markdown got curly quotes and the site disagreed with
    // itself — most visibly on a post page, between its excerpt and its body.
    smartypants: false,
  },
});
