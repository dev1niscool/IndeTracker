# Inde — The news tracker

A liquid-glass PWA for credible coverage of Inde Navarrette's career. The public Sources tab documents what qualifies, what is excluded, and the limits of automated discovery.

**Website:** https://dev1niscool.github.io/IndeTracker/

## Features

- Dated, source-linked news archive with film, television and interview filters, search and date sorting.
- Fourteen individually reviewed starting articles covering 2020–2026, plus conservatively filtered RSS discoveries.
- Publisher-owned Inde tag feeds and recent news feeds from Variety, Deadline and The Hollywood Reporter, checked every six hours with GitHub Actions.
- Clear separation between reviewed source types and automatic **Feed discovery** entries. Automated entries use publisher headlines without generated summaries.
- Dedicated source standards, publisher directory, current check status and a corrections link.
- Responsive layout, keyboard navigation, reduced-motion support, standalone installation, generated icons and a network-first offline archive.

## Run locally

Requires Python 3.12+. No npm dependencies or build step.

```sh
python3 -m http.server 4173 --directory public
```

Open http://localhost:4173. The deployable site is entirely inside `public/`. All site URLs are relative, including PWA scope and service-worker registration, so GitHub Pages project paths work.

```sh
python3 -m unittest discover -s tests -v
python3 scripts/update_news.py
```

## Publishing and maintenance

The `Refresh news and publish` workflow deploys `public/` on pushes to `main`, manual dispatch, and at 00:17, 06:17, 12:17 and 18:17 UTC daily. GitHub may delay scheduled runs. In public repositories GitHub can disable schedules after 60 days without repository activity; inspect the Actions tab if the site's last-check time goes stale. Scheduled archive commits ordinarily keep this repository active.

Pages must use **GitHub Actions** as its source. The workflow needs `contents: write`, `pages: write`, and `id-token: write`; no external API keys are required. It commits refreshed data with GitHub's built-in token and deploys that same archive. If all feeds fail, it publishes the retained archive with the failure status, then fails the run visibly.

`public/data/sources.json` is the source allowlist. `public/data/news.json` holds the archive. Reviewed entries have `review: "curated"`; automatic entries have `review: "feed"`. Review a source's full article before changing its status or adding an original summary. Keep article publication dates (UTC when a timestamp exists), attribution and exact source links. Do not copy article text or publisher photography.

The filter requires her name in the headline, an approved HTTPS publisher domain, a valid non-future date, career-related wording, and no blocked rumor/gossip wording in the headline or RSS description. It intentionally favors fewer false positives over maximum recall. Keyword rules cannot replace full editorial review. Feed history is finite, and this archive does not promise every article on the web. Source failures and checks older than twelve hours are surfaced in the UI.

Research provenance is retained in `scripts/research.json` and `scripts/research-additions.json`. The additions file supersedes earlier access failures and corrects the two syndicated Variety entries to their original URLs and dates.

## Home-screen icon

Created with the built-in ImageGen tool. Original: `public/icons/icon-1024.png`; packaged 512px, 192px, 180px Apple touch and 32px favicon variants live alongside it. A full-bleed opaque navy canvas and centered mark support operating-system masking. The icon uses no person likeness or third-party brand mark.

**Generation prompt:** Original square PWA home-screen icon for Inde: a single bold lowercase “i” made from thick translucent liquid glass, with luminous ice-blue/cyan rim refraction and subtle silver reflections. Circular dot above a thick upright rounded stem, highly legible at small sizes. Full-bleed midnight navy background. Refined iOS aesthetic, straight-on orthographic view, centered within the central 60% safe area. Only the lowercase i; no other text, device mockup, watermark, border, surrounding objects, or outer rounded container.

**Targeted edit:** Preserve the original glass lowercase i, upright shape, ice-blue/cyan refraction and silver reflections. Add a fully opaque midnight navy #081528 background covering every square pixel. Scale the i so its top is at 22% and bottom at 78%, centered. Final 1024×1024 icon; only the i, no outer rounded container, border, device mockup, watermark, or transparent pixels.

The fonts are DM Sans and Instrument Serif from Google Fonts, with local fallbacks when offline. This is an independent fan project, unaffiliated with Inde Navarrette or the publications linked.
