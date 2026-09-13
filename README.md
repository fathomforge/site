# fathomforge.dev

The fathomforge website: writing, open-source projects, and a contact page.

Static [Astro](https://astro.build) site. No third-party resource is requested at runtime —
fonts are self-hosted, there are no analytics and no cookies. That is a deliberate
constraint, not an accident: the tools published here claim zero telemetry, and the site has
to hold to the same standard.

Total JavaScript shipped is **971 bytes**: a 379-byte inline theme-restore (inline so the
theme applies before first paint, with no flash) and a 592-byte external theme toggle. Plus
JSON-LD structured data, which is inert.

## Develop

```
npm install
npm run dev      # http://localhost:4321
npm run build    # → dist/
npm run preview
npm run check    # type + template diagnostics
npm run og       # regenerate Open Graph share images
```

## Writing

Posts live in `src/content/writing/`.

```yaml
---
title: "Post title"
description: "One sentence, used on the index, in RSS and on the share image."
date: 2026-09-10
draft: true
tags: ["agents"]
---
```

**Drafts are local only.** This repo is public, so unfinished arguments and their working
notes stay out of it: a draft is named `<slug>.draft.md` and `.gitignore` excludes that
pattern. Drafts still render in `npm run dev` — with a red banner, at their real URL, since
the loader strips `.draft` when deriving the slug — and never reach a production build.

The trade-off is that **drafts are not backed up by this repo.** They exist only on the
machine that wrote them. Back them up separately if that matters to you.

### Publishing a post

1. `git mv src/content/writing/<slug>.draft.md src/content/writing/<slug>.md`
2. Set `draft: false` in its front matter
3. `npm run og` — share images are generated for published posts only
4. Commit all three together and push; Cloudflare rebuilds

Steps 1 and 2 must agree. `tools/check-drafts.mjs` runs before every build and **fails** if
they don't — a `*.draft.md` marked `draft: false` would publish while staying out of the
repo, and a `*.md` marked `draft: true` would be committed publicly but stay invisible on
the site. Both are silent failures otherwise.

The URL does not change when you publish, so a link shared from a local preview keeps working.

## Share images

`npm run og` renders `tools/og-template.html` once per page and per post into
`public/og/*.png` at 1200×630, driving headless Chrome directly.

This avoids a `satori`/`resvg` toolchain — Fontsource ships `woff2` only, which satori
cannot read. The tradeoff is that generation requires Google Chrome at
`/Applications/Google Chrome.app`, so it is a local authoring step, not part of `build`.
The generated PNGs are committed, so deploys never need Chrome.

## Security headers

`npm run build` runs `tools/make-headers.mjs`, which writes `dist/_headers` (Cloudflare
Pages / Netlify format) with HSTS, `X-Content-Type-Options`, `Referrer-Policy`,
`X-Frame-Options`, `Permissions-Policy`, COOP/CORP, and a per-route CSP.

The CSP is **generated, not hand-written**, because it pins each inline script by sha256:

```
default-src 'none'; script-src 'self' 'sha256-…'; style-src 'self'; img-src 'self' data:;
font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none';
frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests
```

Two build settings exist purely to keep that policy tight, so don't undo them casually:

- `vite.build.assetsInlineLimit: 0` in `astro.config.mjs` — otherwise Vite inlines small
  fonts as `data:` URIs, which would force `data:` into `font-src`.
- No `style="…"` attributes anywhere in components — CSP hashes do not cover style
  attributes, so even one would require `'unsafe-inline'` in `style-src`. The hero figure
  uses `nth-child` for its animation stagger for this reason.

Verified in a real browser against a server sending these headers: zero CSP violations.
Re-verify after adding any component that uses inline styles or loads a new asset type.

## Accessibility & conventions

- All text meets WCAG AA contrast in both themes (`--fg-faint` is the tightest, ~4.6:1).
- Motion respects `prefers-reduced-motion`; the hero figure renders its final state with
  animation disabled.
- Heading levels never skip; section labels are real headings styled as mono kickers.
- The hero chart carries an `aria-label` describing the finding, and its legend and event
  log are real text, not SVG.
- With motion reduced the hero figure renders its finished state — every hidden-then-revealed
  style lives inside a `prefers-reduced-motion: no-preference` block. Checked by screenshotting
  with `--force-prefers-reduced-motion`.

## Deploying

`npm run build` emits a fully static `dist/`. Point Cloudflare Pages (or any static host) at
the repo with build command `npm run build` and output directory `dist`.

`.nvmrc` pins the build to Node 22. Cloudflare Pages otherwise picks a default that may be
older than this project's `engines: >=20`, which fails the build in a way the error message
does not make obvious.

Set the production domain in `astro.config.mjs` (`site:`) — it drives canonical URLs, the
sitemap, RSS links and absolute share-image URLs.

`public/.well-known/security.txt` carries the security contact; its `Expires` field needs
refreshing before 2027-09-10.

## If you later want to signal availability

The site currently says nothing about taking on work. That is deliberate: the only thing
keeping the door open is being reachable, plus one soft line on `/contact/` ("If you're
working on something in this area, I'm always glad to hear about it").

If that changes, the previous, more explicit version is recorded here so it can go back in
without rewriting it from scratch. Both pieces were removed on 2026-09-10.

**A homepage section, placed last, after Open Source:**

```astro
<section class="shell" aria-labelledby="h-avail">
  <div class="avail">
    <h2 class="mono-label avail__title" id="h-avail">Availability</h2>
    <p>
      I take on a small number of engagements each year, usually around agent security,
      runaway-cost controls, and reviewing autonomous systems before they reach
      production. <a href="/contact/">Get in touch</a> if that's useful to you.
    </p>
  </div>
</section>
```

**An "On consulting work" section on `/contact/`**, with two columns — *Where I'm useful*
(reviewing an agent deployment before production; runaway-cost and rate-limiting design;
threat modelling for systems that call tools and spend money; second opinion on a guardrail
design you already have) and *Where I'm not* (anything I'd have to learn on your budget;
staff augmentation or long-term retainers; general-purpose penetration testing) — introduced
with:

> I take on a small number of engagements each year, alongside the open-source work. I'm
> keeping this deliberately short because I'd rather set expectations than sell: there's no
> pricing page, no packages, and no discovery-call funnel. If the work looks like a fit,
> we'll figure out scope in a conversation.

The "where I'm not" half is the part that does the work — it reads as a practitioner setting
boundaries rather than a vendor, which is what keeps the page from tripping community
self-promotion rules. Don't restore the first half without it.

Note that opening this up has consequences beyond the site: `docs/PLAN.md` in the Belay repo
assumes no customers in phase 1, and therefore no LLC or E&O insurance yet.
