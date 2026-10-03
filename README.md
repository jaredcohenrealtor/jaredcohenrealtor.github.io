# jaredcohenrealtor.com

Live at **https://jaredcohenrealtor.com** (served by GitHub Pages from this repo, `jaredcohenrealtor.github.io`).

Website for **Jared Cohen | MA REALTOR®**, Castles Unlimited team, brokered by eXp Realty.
It's a plain static site (HTML, CSS and vanilla JS) hosted on GitHub Pages. There's no framework and no build step: every file is served exactly as it is.

## Preview while you edit

```
npm install        # first time only
npm run serve      # http://localhost:5500 — reloads on every save
```

View it in VS Code with `Ctrl+Shift+P` → **Simple Browser: Show** → `http://localhost:5500`, or open that address in Chrome.
Always use the server rather than double-clicking an `.html` file, because the shared header and footer only load over HTTP.

## How to edit common things

| I want to… | Edit this |
|---|---|
| Change the menu or footer (every page) | `partials/header.html` / `partials/footer.html`. If you add or remove a menu link, also update the `<noscript>` links on each page. |
| Change colors, fonts, spacing | The tokens at the top of `assets/css/styles.css` (section 1) |
| Change a page's text | That page's `.html` file |
| Add a new guide (PDF) | Ask Claude: `/add-guide path/to/file.pdf` |
| Change a guide's title, date or description | `assets/js/guides-data.js` **and** that guide's page in `guides/` |
| Add a new page | Ask Claude: `/new-page <name>` |
| Swap or add a photo | Put the original in `assets/_source/` (photos of me: `imagesOfMe/`, homes and places: `imagesOfProperties/`), list it in `scripts/optimize-images.mjs`, run `npm run images`. Stock (Pexels) photos are for mood only: never label one as a listing, a sale, or a town. |
| Turn the scroll-in animation on or off for a block | Add or remove `data-reveal` on it (or `data-reveal-stagger` on a list). Visitors who turn on "reduce motion" never see animation. |
| Change the domain (e.g. to a custom domain) | Edit `domain` in `site.config.json`, run `npm run set-domain`, then add the domain to the Cloudflare Worker's allowed origins |
| Check everything before publishing | `npm run validate`, or ask Claude: `/check-site` |

## Folders

- `partials/`: the shared header and footer, loaded onto every page
- `guides/`: one page per guide, each with a download form
- `assets/css`, `assets/js`: the single stylesheet and the scripts
- `assets/images/`: optimized WebP images (generated, don't hand-edit)
- `assets/guides/`: optimized guide PDFs
- `assets/_source/`: original full-size files. Not committed or published.
- `internal/`: the style guide (http://localhost:5500/internal/styleguide.html), the guide template and the favicon/share-image sources. Local only: not committed or published.
- `scripts/`: dev-only helpers (image/PDF optimization, validation, domain switch)

## Publishing

Work happens on the `dev` branch. GitHub Pages publishes only `main`, so merging `dev` into `main` is what makes changes live.
Merge into `main` only when you're ready to publish.

## Lead forms

The contact form and the guide-download forms post to a Cloudflare Worker, which creates the contact in BoldTrail.
The BoldTrail API token lives only in the Worker's secret settings. **Never put a token or password in this repo**, because everything here is public.
