# Package discovery and README maintenance

Reviewed against primary documentation on **2026-11-09**. These decisions improve the information available to readers and search systems; no ranking, traffic or download increase has been measured.

## Three discovery surfaces

| Surface                  | Relevant content                                                       | Maintained here                                 |
| ------------------------ | ---------------------------------------------------------------------- | ----------------------------------------------- |
| npm                      | Package title, description, README and keywords                        | Root `README.md` and `package.json`             |
| GitHub repository search | Repository name, About description and topics; README with `in:readme` | GitHub repository settings and root `README.md` |
| Public playground        | Visible page content, title, description, links and canonical URL      | `docs/index.html` and `docs/sitemap.xml`        |

npm documents keyword matching across the package title, description, README and keywords. Keep terms such as “browser fingerprinting”, “JavaScript” and “TypeScript” where they explain the actual package. Do not turn the README into a repeated keyword list. [npm package search](https://docs.npmjs.com/searching-for-and-choosing-packages-to-download/)

The package description and keywords are discovery fields; `homepage`, `repository` and `bugs` direct users to the project and support. Keep them accurate and consistent with the README. [npm package metadata](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/)

GitHub's default repository search reads the name, description and topics. Searching README content requires the `in:readme` qualifier. A README edit alone therefore does not update all GitHub discovery fields. Choose topics that describe implemented capabilities, within GitHub's limit of 20. [GitHub repository search](https://docs.github.com/en/search-github/searching-on-github/searching-for-repositories), [GitHub topics](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics)

## Reader-facing README

The README provides a concrete package description, live playground, installation, examples, configuration, browser support, migration, support, contribution instructions and license. npm recommends a root README that helps users install, configure and use the package, rendered as GitHub Flavored Markdown. [npm README guidance](https://docs.npmjs.com/about-package-readme-files/)

Keep dynamic npm version and download badges, CI, CodeQL and license links. These are useful project facts; download counts do not establish identification accuracy. Preserve the animated pipeline's meaningful alternative text and a usable static rendering. Keep detailed contracts in the linked documentation so the entry page remains navigable.

The repository and published npm version can differ. Clearly label source-only APIs until release. **Updating GitHub does not update the README on npm: npm requires publication of a new package version.** Publishing should follow the [release process](RELEASING.md), not happen as a side effect of a documentation edit. [npm README updates](https://docs.npmjs.com/about-package-readme-files/#updating-an-existing-package-readmemd-file)

## Playground metadata

Use a concise, descriptive title and matching visible heading. Google recommends useful content, descriptive terms and crawlable links; it does not guarantee crawling or indexing. Titles and descriptions influence presentation, but Google may generate different title links and snippets. [Search Essentials](https://developers.google.com/search/docs/essentials), [title guidance](https://developers.google.com/search/docs/appearance/title-link), [description guidance](https://developers.google.com/search/docs/appearance/snippet)

Keep the canonical URL and sitemap on the same HTTPS project URL. Canonical annotations communicate a preference; sitemap submission is a discovery hint. Neither guarantees indexing. The sitemap currently lists the one public HTML page and avoids invented modification dates. It can be submitted through a verified Search Console property if indexing monitoring is wanted. [Canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), [sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)

`SoftwareSourceCode` JSON-LD describes the repository, languages, runtime and license using Schema.org properties. Keep it factual; it does not assert ratings or a promised search result treatment. [Schema.org SoftwareSourceCode](https://schema.org/SoftwareSourceCode)

A `robots.txt` file must live at the host root. A project-local `/fingerprinter-js/robots.txt` would not control this GitHub Pages host, so this repository does not add one there. [Google robots.txt placement](https://developers.google.com/crawling/docs/robots-txt/create-robots-txt)

## Maintenance checklist

- Keep examples aligned with the documented package major and retain the published/source distinction until release.
- Recheck README links, heading anchors and diagram rendering after structural edits.
- Confirm that every locally linked README document and asset is included in the npm archive when appropriate; run `npm run test:package` after package metadata changes.
- Verify that npm badges link to the real package and workflow badges refer to active workflow files on `main`.
- Keep repository About text, homepage and relevant topics aligned with implemented behavior.
- After a Pages deployment, check the canonical URL, sitemap, loaded SDK version and browser self-tests on the public project path.
- Review discovery metadata during releases. Use observed search/referral/download data for subsequent decisions; do not report unmeasured SEO gains.
