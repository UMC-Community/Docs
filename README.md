# UMC Documentation

This repository contains the English and Simplified Chinese documentation site for UMC.

- Live site: <https://umc-community.github.io/Docs/>
- Source project: <https://github.com/UMC-Community/UMC>

## Local development

```sh
npm ci
npm run docs:dev
```

To refresh the API reference pages, keep the sibling UMC and UMC-Auth checkouts at
`~/UMC-Community/UMC` and `~/UMC-Community/UMC-Auth` next to this repository.

```sh
UMC_SOURCE_DIR=../UMC UMC_AUTH_SOURCE_DIR=../UMC-Auth npm run docs:build
```

English pages are under `en/`; Chinese translations and generated English fallback pages are under
`zh/`. Run `npm run docs:sync` after editing English pages. The `docs:build` workflow checks links
and builds the site before publishing it to GitHub Pages.
