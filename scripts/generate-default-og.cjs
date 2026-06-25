#!/usr/bin/env node
/**
 * Generates the site-wide default Open Graph image at public/og.png, used
 * by any page that doesn't pass its own `image` prop to BlogLayout
 * (homepage, category/tag/author index pages, etc). Referenced by
 * SiteOptions.defaultOgImage in src/site.config.mjs.
 */

const path = require("path");
const lib = require("./og-lib.cjs");

const ROOT = path.join(__dirname, "..");

async function main() {
  const { default: SiteOptions } = await import("../src/site.config.mjs");
  await lib.loadFonts();
  const { W, H, BG, INK, MUTED, RULE, LATIN_FONT, escapeXml, tickRule } = lib;

  const title = SiteOptions.siteTitle;
  const subtitle = SiteOptions.siteSubTitle;

  const svg = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      text { dominant-baseline: middle; text-anchor: middle; }
      .title { font-family: "${LATIN_FONT}"; font-weight: 700; font-size: 64px; fill: ${INK}; }
      .subtitle { font-family: "${LATIN_FONT}"; font-weight: 400; font-size: 28px; fill: ${MUTED}; letter-spacing: 1px; }
    </style>
  </defs>
  <rect x="0" y="0" width="${W}" height="${H}" fill="${BG}" />
  <rect x="14" y="14" width="${W - 28}" height="${H - 28}" fill="none" stroke="${RULE}" stroke-width="2" />
  <text x="${W / 2}" y="${H / 2 - 30}" class="title">${escapeXml(title)}</text>
  ${tickRule(W / 2, H / 2 + 30, 50, RULE)}
  <text x="${W / 2}" y="${H / 2 + 80}" class="subtitle">${escapeXml(subtitle)}</text>
</svg>
`.trim();

  await lib.renderPng(svg, path.join(ROOT, "public", "og.png"));
  console.log("public/og.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
