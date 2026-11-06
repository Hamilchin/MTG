# MTG
A set of tools for creating, sorting, and filtering MTG card lists to make deck lists, order lists, and more.

Live at **https://hamilchin.github.io/MTG/**.

| Tool | | |
|---|---|---|
| [Limited Grades](limited-grades/) | 17Lands win rates as letter grades for every draft set (a clone of limitedgrades.com), plus tier lists you can drag, share as text, and compare | [Open](https://hamilchin.github.io/MTG/limited-grades/) |

## Layout

Each tool lives in its own folder with its own `package.json`. `site/` is the hub page at the root of the GitHub
Pages site, and `.github/workflows/pages.yml` builds every tool into `/<tool>/` beside it. `site/404.html` sends deep
links (like `/MTG/limited-grades/trk/lists/…`) back to the right app, since GitHub Pages only serves a 404 page from
the site root.

To add a tool, give it a folder, build it with its base path set to `/<repo>/<folder>/`, copy its output to
`_site/<folder>` in the workflow, and add a card for it in `site/index.html`.

## Repository settings

- **Pages**: Settings → Pages → Source: GitHub Actions.
- **INCLUDE_17LANDS** (Settings → Secrets and variables → Actions → Variables): `true` to include 17Lands grades in
  the hosted Limited Grades. 17Lands' API says its data is only for use on 17lands.com without their permission.
