#!/usr/bin/env node
/**
 * Generates a 1080x1350 Arabic quote-card image (circular portrait, quote
 * marks, tick-rule dividers, author name, domain footer) from a JSON config
 * file. Used by the tweet-quote-image skill to turn a tweet into a
 * shareable Arabic quote graphic.
 *
 * Design: warm cream paper background (same palette as the taammulat
 * content cards), Aref Ruqaa Ink calligraphic font for the quote, Aref
 * Ruqaa for the author name, Tajawal for the domain footer.
 *
 * Usage:
 *   node scripts/generate-quote-card.cjs config.json
 *
 * config.json shape:
 *   {
 *     "quote": "...",          // Arabic quote text (required)
 *     "author": "...",         // Arabic or Latin author name (required)
 *     "image": "https://... or /local/path.jpg",  // portrait (optional)
 *     "out": "/absolute/path/to/output.png"        // required
 *   }
 */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const lib = require("./og-lib.cjs");

const W = 1080;
const H = 1350;
const CX = W / 2;
const MAX_TEXT_WIDTH = W - 200;
const PORTRAIT_D = 300;

const PAPER_BG = "#f3ead9";
const INK_PRIMARY = "#2a2018";
const INK_SECONDARY = "#8a7458";

async function imageToCircleDataUri(src, size) {
  let buf;
  try {
    if (/^https?:\/\//.test(src)) {
      const res = await fetch(src, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) return null;
      buf = Buffer.from(await res.arrayBuffer());
    } else if (fs.existsSync(src)) {
      buf = fs.readFileSync(src);
    } else {
      return null;
    }
    const resized = await sharp(buf).resize(size, size, { fit: "cover" }).png().toBuffer();
    return `data:image/png;base64,${resized.toString("base64")}`;
  } catch {
    return null;
  }
}

function buildSvg({ quote, author, imageDataUrl }, fonts) {
  const { escapeXml, fitBlockByLines, tickRule, ARABIC_TITLE_FONT, ARABIC_BYLINE_FONT } = lib;
  const titleFont = fonts.arabicTitle;

  const hasPortrait = Boolean(imageDataUrl);
  const portraitCy = 250;

  const fit = fitBlockByLines(titleFont, quote, {
    maxWidth: MAX_TEXT_WIDTH,
    startSize: 52,
    minSize: 30,
    maxLines: 5,
    lineHeightRatio: 1.55,
  });
  const blockHeight = fit.lines.length * fit.lineHeight;

  const GAP_RULE_TO_MARK = 55;
  const GAP_MARK_TO_QUOTE = 100;
  const GAP_QUOTE_TO_RULE = 65;
  const GAP_MARK_TO_AUTHOR = 70;
  const AUTHOR_BLOCK = 40;
  const totalContentHeight =
    GAP_RULE_TO_MARK + GAP_MARK_TO_QUOTE + blockHeight + GAP_QUOTE_TO_RULE + GAP_RULE_TO_MARK + GAP_MARK_TO_AUTHOR + AUTHOR_BLOCK;

  const topRuleY = hasPortrait ? 445 : Math.max(150, (H - 150 - totalContentHeight) / 2);
  const markTopY = topRuleY + GAP_RULE_TO_MARK;
  const quoteStartY = markTopY + GAP_MARK_TO_QUOTE;

  const quoteBlock = fit.lines
    .map((line, i) => `<text x="${CX}" y="${quoteStartY + i * fit.lineHeight}" class="quote" font-size="${fit.fontSize}">${escapeXml(line)}</text>`)
    .join("\n      ");

  const bottomRuleY = quoteStartY + blockHeight - fit.lineHeight / 2 + GAP_QUOTE_TO_RULE;
  const bottomMarkY = bottomRuleY + GAP_RULE_TO_MARK;
  const authorY = bottomMarkY + GAP_MARK_TO_AUTHOR;

  const portraitBlock = hasPortrait
    ? `<image x="${CX - PORTRAIT_D / 2}" y="${portraitCy - PORTRAIT_D / 2}" width="${PORTRAIT_D}" height="${PORTRAIT_D}" href="${imageDataUrl}" clip-path="url(#portraitClip)" preserveAspectRatio="xMidYMid slice" />
       <circle cx="${CX}" cy="${portraitCy}" r="${PORTRAIT_D / 2}" fill="none" stroke="${INK_SECONDARY}" stroke-width="3" />`
    : "";

  return `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="portraitClip"><circle cx="${CX}" cy="${portraitCy}" r="${PORTRAIT_D / 2}" /></clipPath>
    <style>
      text { text-anchor: middle; dominant-baseline: middle; }
      .quote { font-family: "${ARABIC_TITLE_FONT}"; font-weight: bold; fill: ${INK_PRIMARY}; direction: rtl; }
      .mark { font-family: Georgia, "Times New Roman", serif; font-size: 92px; fill: ${INK_SECONDARY}; }
      .author { font-family: "${ARABIC_BYLINE_FONT}"; font-size: 34px; fill: ${INK_PRIMARY}; direction: rtl; }
      .domain { font-family: "Tajawal"; font-size: 24px; fill: ${INK_SECONDARY}; direction: ltr; letter-spacing: 1px; }
    </style>
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" result="noise" />
      <feColorMatrix in="noise" type="matrix"
        values="0 0 0 0 0
                0 0 0 0 0
                0 0 0 0 0
                0 0 0.05 0 0" />
    </filter>
    <radialGradient id="vignette" cx="50%" cy="50%" r="75%">
      <stop offset="60%" stop-color="#000000" stop-opacity="0" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.08" />
    </radialGradient>
  </defs>

  <rect x="0" y="0" width="${W}" height="${H}" fill="${PAPER_BG}" />
  <rect x="0" y="0" width="${W}" height="${H}" filter="url(#grain)" />
  <rect x="0" y="0" width="${W}" height="${H}" fill="url(#vignette)" />

  ${portraitBlock}

  ${tickRule(CX, topRuleY, 90, INK_SECONDARY)}
  <text x="${CX}" y="${markTopY}" class="mark">&#8221;</text>

  ${quoteBlock}

  ${tickRule(CX, bottomRuleY, 90, INK_SECONDARY)}
  <text x="${CX}" y="${bottomMarkY}" class="mark">&#8220;</text>

  <text x="${CX}" y="${authorY}" class="author">${escapeXml(author)}</text>

  <text x="${CX}" y="${H - 60}" class="domain">quotes.elhellal.com</text>
</svg>
`.trim();
}

async function main() {
  const configPath = process.argv[2];
  if (!configPath) {
    console.error("Usage: node generate-quote-card.cjs <config.json>");
    process.exit(1);
  }
  const cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
  if (!cfg.quote || !cfg.author || !cfg.out) {
    console.error("config.json requires quote, author, and out");
    process.exit(1);
  }

  const fonts = await lib.loadFonts();
  const imageDataUrl = cfg.image ? await imageToCircleDataUri(cfg.image, PORTRAIT_D * 2) : null;
  const svg = buildSvg({ quote: cfg.quote, author: cfg.author, imageDataUrl }, fonts);
  await lib.renderPng(svg, path.resolve(cfg.out));
  console.log(path.resolve(cfg.out), imageDataUrl ? "(with portrait)" : "(no portrait)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
