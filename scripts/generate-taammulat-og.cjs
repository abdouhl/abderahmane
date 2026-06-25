#!/usr/bin/env node
/**
 * Generates a 1200x630 Open Graph / Twitter Card image for every reflection
 * in src/content/taammulat/, written to public/og/taammulat/<number>.png.
 *
 * Layout: the existing 1080x1350 quote-card art cropped into a portrait
 * thumbnail on the left, "تأملات #N" label + title + a 3-sentence excerpt
 * from the body on the right, on the site's cream paper background.
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

const CARD_W = 330;
const CARD_H = 500;

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

function firstParagraphExcerpt(body) {
  const withoutHeading = body.replace(/^\s*#.*\n+/, "");
  const paragraphs = withoutHeading.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return lib.firstNSentences(paragraphs[0] || "", 3);
}

function buildSvg(post, fonts) {
  const { number, title, excerpt, cardDataUrl } = post;
  const { W, H, PAD, BG, INK, MUTED, RULE, ARABIC_FONT, escapeXml, fitBlock, tickRule } = lib;

  const hasCard = Boolean(cardDataUrl);
  const textColX = hasCard ? PAD + CARD_W + 56 : PAD;
  const textColWidth = hasCard ? W - textColX - PAD : W - PAD * 2;
  const textCenterX = textColX + textColWidth / 2;

  const labelBlockHeight = 46;
  const titleFit = fitBlock(fonts.arabicBold, title, { maxWidth: textColWidth, maxHeight: 220, startSize: 38, minSize: 24, lineHeightRatio: 1.35 });
  const titleBlockHeight = titleFit.lines.length * titleFit.lineHeight + 18;
  const ruleBlockHeight = 38;
  const excerptFit = fitBlock(fonts.arabicRegular, excerpt, { maxWidth: textColWidth, maxHeight: 260, startSize: 25, minSize: 16 });
  const excerptBlockHeight = excerptFit.lines.length * excerptFit.lineHeight;

  const totalHeight = labelBlockHeight + titleBlockHeight + ruleBlockHeight + excerptBlockHeight;
  const top = hasCard ? PAD + 40 : Math.max(70, (H - totalHeight) / 2);

  let y = top;
  const labelY = y + 14;
  y += labelBlockHeight;

  const titleStartY = y + titleFit.fontSize / 2;
  y += titleBlockHeight;

  const ruleY = y;
  y += ruleBlockHeight;

  const excerptStartY = y;

  const titleBlock = titleFit.lines
    .map((line, i) => `<text x="${textCenterX}" y="${titleStartY + i * titleFit.lineHeight}" class="title" font-size="${titleFit.fontSize}">${escapeXml(line)}</text>`)
    .join("\n      ");

  const excerptBlock = excerptFit.lines
    .map((line, i) => `<text x="${textCenterX}" y="${excerptStartY + i * excerptFit.lineHeight}" class="excerpt" font-size="${excerptFit.fontSize}">${escapeXml(line)}</text>`)
    .join("\n      ");

  const cardBlock = hasCard
    ? `<image x="${PAD}" y="${PAD + 15}" width="${CARD_W}" height="${CARD_H}" href="${cardDataUrl}" preserveAspectRatio="xMidYMid slice" />
       <rect x="${PAD}" y="${PAD + 15}" width="${CARD_W}" height="${CARD_H}" fill="none" stroke="${RULE}" stroke-width="2" />`
    : "";

  return `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      text { dominant-baseline: middle; }
      .label { font-family: "${ARABIC_FONT}"; font-weight: 600; font-size: 22px; fill: ${MUTED}; text-anchor: middle; letter-spacing: 0.5px; }
      .title { font-family: "${ARABIC_FONT}"; font-weight: 700; fill: ${INK}; text-anchor: middle; direction: rtl; }
      .excerpt { font-family: "${ARABIC_FONT}"; font-weight: 400; fill: ${INK}; text-anchor: middle; direction: rtl; }
      .footer { font-family: "${ARABIC_FONT}"; font-weight: 500; font-size: 22px; fill: ${MUTED}; }
    </style>
  </defs>

  <rect x="0" y="0" width="${W}" height="${H}" fill="${BG}" />
  <rect x="14" y="14" width="${W - 28}" height="${H - 28}" fill="none" stroke="${RULE}" stroke-width="2" />

  ${cardBlock}

  <text x="${textCenterX}" y="${labelY}" class="label">تأملات #${number}</text>
  ${titleBlock}
  ${tickRule(textCenterX, ruleY, 60, RULE)}
  ${excerptBlock}

  <text x="${PAD}" y="${H - 36}" class="footer">تأملات · abderahmane.elhellal.com</text>
</svg>
`.trim();
}

async function main() {
  const onlyNumber = process.argv[2];
  const fonts = await lib.loadFonts();

  const files = fs
    .readdirSync(TAAMMULAT_DIR)
    .filter((f) => /^taammulat-\d+\.md$/.test(f))
    .filter((f) => !onlyNumber || f === `taammulat-${onlyNumber}.md`)
    .sort();

  for (const file of files) {
    const raw = fs.readFileSync(path.join(TAAMMULAT_DIR, file), "utf8");
    const { data, body } = parseFrontmatter(raw);
    const number = data.number || file.match(/\d+/)[0];

    const imagePath = data.image ? path.join(TAAMMULAT_DIR, data.image.replace(/^\.\//, "")) : null;
    const cardDataUrl = await lib.imageToDataUri(imagePath, CARD_W, CARD_H);

    const post = {
      number,
      title: data.title || "",
      excerpt: firstParagraphExcerpt(body),
      cardDataUrl,
    };

    const svg = buildSvg(post, fonts);
    await lib.renderPng(svg, path.join(OUT_DIR, `${number}.png`));
    console.log(number);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
