#!/usr/bin/env node
/**
 * Generates a 1200x630 Open Graph / Twitter Card image for every book in
 * src/content/books/, written to public/og/books/<slug>.png.
 *
 * Layout: book cover on the left (if present), title + Arabic title + author
 * + a 3-sentence summary excerpt on the right, on the site's cream paper
 * background. Books without a cover get a centered text-only layout.
 *
 * Usage:
 *   node scripts/generate-book-og.cjs            # regenerate all books
 *   node scripts/generate-book-og.cjs 45-sapiens  # regenerate one book
 */

const fs = require("fs");
const path = require("path");
const lib = require("./og-lib.cjs");

const ROOT = path.join(__dirname, "..");
const BOOKS_DIR = path.join(ROOT, "src", "content", "books");
const OUT_DIR = path.join(ROOT, "public", "og", "books");

const COVER_W = 330;
const COVER_H = 500;

function parseFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const data = {};
  for (const line of m[1].split("\n")) {
    const lm = line.match(/^(\w+):\s*"(.*)"\s*$/) || line.match(/^(\w+):\s*(.+?)\s*$/);
    if (lm) data[lm[1]] = lm[2];
  }
  return data;
}

function buildSvg(book, fonts) {
  const { title, arabicTitle, author, summary, coverDataUrl } = book;
  const { W, H, PAD, BG, INK, MUTED, RULE, ARABIC_FONT, ARABIC_TITLE_FONT, LATIN_FONT, escapeXml, fitBlock, fitBlockByLines, tickRule } = lib;

  const hasCover = Boolean(coverDataUrl);
  const textColX = hasCover ? PAD + COVER_W + 56 : PAD;
  const textColWidth = hasCover ? W - textColX - PAD : W - PAD * 2;
  const textCenterX = textColX + textColWidth / 2;

  const top = hasCover ? PAD + 50 : 90;
  const bottomLimit = H - 100;

  const titleFit = fitBlockByLines(fonts.latinBold, title, { maxWidth: textColWidth, startSize: hasCover ? 44 : 50, minSize: 26, maxLines: 2 });
  const arabicTitleFit = arabicTitle
    ? lib.fitBlock(fonts.arabicTitle, arabicTitle, { maxWidth: textColWidth, maxHeight: 80, startSize: 30, minSize: 20 })
    : { lines: [], fontSize: 30, lineHeight: 0 };

  let y = top;
  const titleY = y;
  y += titleFit.lines.length * titleFit.lineHeight + 16;

  const arabicTitleStartY = y;
  y += arabicTitleFit.lines.length * arabicTitleFit.lineHeight + (arabicTitleFit.lines.length ? 14 : 0);

  const authorY = y + 6;
  y = authorY + 34;

  const ruleY = y;
  y += 38;

  const summaryStartY = y;
  const summaryAvailableHeight = bottomLimit - summaryStartY;
  const summaryFit = fitBlock(fonts.arabicRegular, summary, { maxWidth: textColWidth, maxHeight: summaryAvailableHeight, startSize: 26, minSize: 17 });

  const titleBlock = titleFit.lines
    .map((line, i) => `<text x="${textCenterX}" y="${titleY + i * titleFit.lineHeight}" class="title" font-size="${titleFit.fontSize}">${escapeXml(line)}</text>`)
    .join("\n      ");

  const arabicTitleBlock = arabicTitleFit.lines
    .map((line, i) => `<text x="${textCenterX}" y="${arabicTitleStartY + i * arabicTitleFit.lineHeight}" class="arabicTitle" font-size="${arabicTitleFit.fontSize}">${escapeXml(line)}</text>`)
    .join("\n      ");

  const summaryBlock = summaryFit.lines
    .map((line, i) => `<text x="${textCenterX}" y="${summaryStartY + i * summaryFit.lineHeight}" class="summary" font-size="${summaryFit.fontSize}">${escapeXml(line)}</text>`)
    .join("\n      ");

  const coverBlock = hasCover
    ? `<image x="${PAD}" y="${PAD + 15}" width="${COVER_W}" height="${COVER_H}" href="${coverDataUrl}" preserveAspectRatio="xMidYMid slice" />
       <rect x="${PAD}" y="${PAD + 15}" width="${COVER_W}" height="${COVER_H}" fill="none" stroke="${RULE}" stroke-width="2" />`
    : "";

  return `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      text { dominant-baseline: middle; }
      .title { font-family: "${LATIN_FONT}"; font-weight: 700; fill: ${INK}; text-anchor: middle; direction: ltr; }
      .arabicTitle { font-family: "${ARABIC_TITLE_FONT}"; font-weight: bold; fill: ${MUTED}; text-anchor: middle; direction: rtl; }
      .author { font-family: "${LATIN_FONT}"; font-weight: 400; font-size: 22px; fill: ${MUTED}; text-anchor: middle; letter-spacing: 0.5px; }
      .summary { font-family: "${ARABIC_FONT}"; font-weight: 400; fill: ${INK}; text-anchor: middle; direction: rtl; }
      .footer { font-family: "${ARABIC_FONT}"; font-weight: 500; font-size: 22px; fill: ${MUTED}; }
    </style>
  </defs>

  <rect x="0" y="0" width="${W}" height="${H}" fill="${BG}" />
  <rect x="14" y="14" width="${W - 28}" height="${H - 28}" fill="none" stroke="${RULE}" stroke-width="2" />

  ${coverBlock}

  ${titleBlock}
  ${arabicTitleBlock}
  <text x="${textCenterX}" y="${authorY}" class="author">${escapeXml(author)}</text>
  ${tickRule(textCenterX, ruleY, 60, RULE)}
  ${summaryBlock}

  <text x="${PAD}" y="${H - 36}" class="footer">ملخصات الكتب · abderahmane.elhellal.com</text>
</svg>
`.trim();
}

async function main() {
  const onlySlug = process.argv[2];
  const fonts = await lib.loadFonts();

  const files = fs
    .readdirSync(BOOKS_DIR)
    .filter((f) => f.endsWith(".md"))
    .filter((f) => !onlySlug || f === `${onlySlug}.md`)
    .sort();

  for (const file of files) {
    const slug = file.replace(/\.md$/, "");
    const raw = fs.readFileSync(path.join(BOOKS_DIR, file), "utf8");
    const fm = parseFrontmatter(raw);
    const coverPath = fm.cover ? path.join(BOOKS_DIR, fm.cover.replace(/^\.\//, "")) : null;
    const coverDataUrl = await lib.imageToDataUri(coverPath, COVER_W, COVER_H);

    const book = {
      title: fm.title || slug,
      arabicTitle: fm.arabicTitle || "",
      author: fm.author || "",
      summary: lib.firstNSentences(fm.feedSummary || "", 3),
      coverDataUrl,
    };

    const svg = buildSvg(book, fonts);
    await lib.renderPng(svg, path.join(OUT_DIR, `${slug}.png`));
    console.log(slug);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
