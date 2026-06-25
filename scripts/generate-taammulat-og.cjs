#!/usr/bin/env node
/**
 * Generates a 1200x630 Open Graph / Twitter Card image for every reflection
 * in src/content/taammulat/, written to public/og/taammulat/<number>.png.
 *
 * Design: same aesthetic as the 1080x1350 taammulat content card —
 * warm cream paper background, Aref Ruqaa Ink calligraphic font, diamond
 * ornament, tick rules — adapted to the 1200x630 OG ratio.
 *
 * Usage:
 *   node scripts/generate-taammulat-og.cjs       # regenerate all
 *   node scripts/generate-taammulat-og.cjs 7     # regenerate one (by number)
 */

const fs = require("fs");
const path = require("path");
const lib = require("./og-lib.cjs");

const ROOT = path.join(__dirname, "..");
const TAAMMULAT_DIR = path.join(ROOT, "src", "content", "taammulat");
const OUT_DIR = path.join(ROOT, "public", "og", "taammulat");

const W = 1200;
const H = 630;
const MARGIN_X = 110;
const MAX_TEXT_WIDTH = W - MARGIN_X * 2;

const PAPER_BG = "#f3ead9";
const INK_PRIMARY = "#2a2018";
const INK_SECONDARY = "#8a7458";

function parseFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return { data: {}, body: raw };
  const data = {};
  for (const line of m[1].split("\n")) {
    const lm = line.match(/^(\w+):\s*"(.*)"\s*$/) || line.match(/^(\w+):\s*(.+?)\s*$/);
    if (lm) data[lm[1]] = lm[2];
  }
  return { data, body: raw.slice(m[0].length) };
}

function diamondOrnament(cx, cy, size, color) {
  return `<rect x="${cx - size / 2}" y="${cy - size / 2}" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="2" transform="rotate(45 ${cx} ${cy})" />`;
}

function tickRule(cx, y, halfWidth, color) {
  const tick = 7;
  return `
    <line x1="${cx - halfWidth}" y1="${y}" x2="${cx + halfWidth}" y2="${y}" stroke="${color}" stroke-width="1.5" />
    <line x1="${cx - halfWidth}" y1="${y - tick}" x2="${cx - halfWidth}" y2="${y + tick}" stroke="${color}" stroke-width="1.5" />
    <line x1="${cx + halfWidth}" y1="${y - tick}" x2="${cx + halfWidth}" y2="${y + tick}" stroke="${color}" stroke-width="1.5" />`;
}

function buildSvg(post, titleFont) {
  const { number, title } = post;
  const { escapeXml, fitBlock, ARABIC_TITLE_FONT, ARABIC_BYLINE_FONT } = lib;

  const cx = W / 2;

  // Fit title into the available vertical space
  const titleAreaTop = 190;
  const titleAreaBottom = 460;
  const titleFit = fitBlock(titleFont, title, {
    maxWidth: MAX_TEXT_WIDTH,
    maxHeight: titleAreaBottom - titleAreaTop,
    startSize: 62,
    minSize: 36,
    lineHeightRatio: 1.55,
  });

  const titleBlockHeight = titleFit.lines.length * titleFit.lineHeight;
  const titleStartY = (titleAreaTop + titleAreaBottom) / 2 - titleBlockHeight / 2 + titleFit.lineHeight / 2;

  const titleBlock = titleFit.lines
    .map((line, i) =>
      `<text x="${cx}" y="${titleStartY + i * titleFit.lineHeight}" class="title" font-size="${titleFit.fontSize}">${escapeXml(line)}</text>`
    )
    .join("\n      ");

  return `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      text {
        text-anchor: middle;
        dominant-baseline: middle;
      }
      .label {
        font-family: "${ARABIC_TITLE_FONT}";
        font-weight: bold;
        font-size: 30px;
        fill: ${INK_PRIMARY};
        direction: rtl;
      }
      .title {
        font-family: "${ARABIC_TITLE_FONT}";
        font-weight: bold;
        fill: ${INK_PRIMARY};
        direction: rtl;
      }
      .byline {
        font-family: "${ARABIC_BYLINE_FONT}";
        font-size: 26px;
        fill: ${INK_SECONDARY};
        direction: rtl;
      }
      .handle {
        font-family: "Tajawal";
        font-size: 22px;
        fill: ${INK_SECONDARY};
        letter-spacing: 0.5px;
        direction: ltr;
      }
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
      <stop offset="100%" stop-color="#000000" stop-opacity="0.06" />
    </radialGradient>
  </defs>

  <rect x="0" y="0" width="${W}" height="${H}" fill="${PAPER_BG}" />
  <rect x="0" y="0" width="${W}" height="${H}" filter="url(#grain)" />
  <rect x="0" y="0" width="${W}" height="${H}" fill="url(#vignette)" />

  ${diamondOrnament(cx, 55, 12, INK_SECONDARY)}
  <text x="${cx}" y="100" class="label">تأملات #${number}</text>
  ${tickRule(cx, 132, 70, INK_SECONDARY)}

  ${titleBlock}

  <text x="${cx}" y="504" class="byline">عبد الرحمان</text>

  ${tickRule(cx, 546, 70, INK_SECONDARY)}
  <text x="${cx}" y="582" class="handle">@abdou_hll</text>
</svg>
`.trim();
}

async function main() {
  const onlyNumber = process.argv[2];
  const fonts = await lib.loadFonts();
  const titleFont = fonts.arabicTitle;

  const files = fs
    .readdirSync(TAAMMULAT_DIR)
    .filter((f) => /^taammulat-\d+\.md$/.test(f))
    .filter((f) => !onlyNumber || f === `taammulat-${onlyNumber}.md`)
    .sort();

  for (const file of files) {
    const raw = fs.readFileSync(path.join(TAAMMULAT_DIR, file), "utf8");
    const { data } = parseFrontmatter(raw);
    const number = data.number || file.match(/\d+/)[0];

    const post = { number, title: data.title || "" };
    const svg = buildSvg(post, titleFont);
    await lib.renderPng(svg, path.join(OUT_DIR, `${number}.png`));
    console.log(number);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
