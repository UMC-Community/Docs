# UMC Documentation

This repository contains the English and Simplified Chinese documentation site for UMC.

- Live site: <https://umc-community.github.io/Docs/>
- Source project: <https://github.com/UMC-Community/UMC>

## Local development

```sh
npm ci
npm run docs:dev
```

To refresh the API reference pages from the sibling UMC checkout, set `UMC_SOURCE_DIR` to the UMC
repository path. The standard local layout is `~/UMC-Community/UMC` next to this repository.

```sh
UMC_SOURCE_DIR=../UMC npm run docs:build
```

English pages are under `en/`; Chinese translations and generated English fallback pages are under
`zh/`. Run `npm run docs:sync` after editing English pages. The `docs:build` workflow checks links
and builds the site before publishing it to GitHub Pages.
