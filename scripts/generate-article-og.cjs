#!/usr/bin/env node
/**
 * Generates a 1200x630 Open Graph / Twitter Card image for every post in
 * src/content/article/, written to public/og/articles/<slug>.png.
 *
 * Layout: remote thumb photo on the left (if the post has one and it
 * fetches successfully), category label + title + author/date + a
 * 3-sentence description excerpt on the right. Posts without a usable
 * thumb get a centered text-only layout, same as books without a cover.
 *
 * Usage:
 *   node scripts/generate-article-og.cjs                       # all posts
 *   node scripts/generate-article-og.cjs al-jahl-al-wathiq      # one post
 */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const lib = require("./og-lib.cjs");

const ROOT = path.join(__dirname, "..");
const ARTICLES_DIR = path.join(ROOT, "src", "content", "article");
const OUT_DIR = path.join(ROOT, "public", "og", "articles");

const PHOTO_W = 460;
const PHOTO_H = 510;

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

async function remoteImageToDataUri(url, boxW, boxH) {
  if (!url || !/^https?:\/\//.test(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const resized = await sharp(buf).resize(boxW, boxH, { fit: "cover" }).png().toBuffer();
    return `data:image/png;base64,${resized.toString("base64")}`;
  } catch {
    return null;
  }
}

function buildSvg(post, fonts) {
  const { title, category, author, dateStr, description, photoDataUrl, isEnglish } = post;
  const { W, H, PAD, BG, INK, MUTED, RULE, ARABIC_FONT, LATIN_FONT, escapeXml, fitBlock, fitBlockByLines, tickRule } = lib;

  const titleFont = isEnglish ? fonts.latinBold : fonts.arabicBold;
  const bodyFont = isEnglish ? fonts.latinRegular : fonts.arabicRegular;
  const titleFontFamily = isEnglish ? LATIN_FONT : ARABIC_FONT;
  const bodyFontFamily = isEnglish ? LATIN_FONT : ARABIC_FONT;
  const dir = isEnglish ? "ltr" : "rtl";

  const hasPhoto = Boolean(photoDataUrl);
  const textColX = hasPhoto ? PAD + PHOTO_W + 56 : PAD;
  const textColWidth = hasPhoto ? W - textColX - PAD : W - PAD * 2;
  const textCenterX = textColX + textColWidth / 2;

  const categoryBlockHeight = category ? 46 : 0;
  const titleFit = fitBlockByLines(titleFont, title, { maxWidth: textColWidth, startSize: hasPhoto ? 38 : 42, minSize: 24, maxLines: 3, lineHeightRatio: 1.35 });
  const titleBlockHeight = titleFit.lines.length * titleFit.lineHeight + 18;
  const metaBlockHeight = 40;
  const ruleBlockHeight = 38;
  const descFit = fitBlock(bodyFont, description, { maxWidth: textColWidth, maxHeight: 300, startSize: 25, minSize: 16 });
  const descBlockHeight = descFit.lines.length * descFit.lineHeight;

  const totalHeight = categoryBlockHeight + titleBlockHeight + metaBlockHeight + ruleBlockHeight + descBlockHeight;
  const top = hasPhoto ? PAD + 40 : Math.max(70, (H - totalHeight) / 2);

  let y = top;

  const categoryY = category ? y + 14 : y;
  if (category) y += categoryBlockHeight;

  const titleStartY = y + titleFit.fontSize / 2;
  y += titleBlockHeight;

  const metaY = y + 6;
  y += metaBlockHeight;

  const ruleY = y;
  y += ruleBlockHeight;

  const descStartY = y;

  const categoryBlock = category
    ? `<text x="${textCenterX}" y="${categoryY}" class="category">${escapeXml(category)}</text>`
    : "";

  const titleBlock = titleFit.lines
    .map((line, i) => `<text x="${textCenterX}" y="${titleStartY + i * titleFit.lineHeight}" class="title" font-family="${titleFontFamily}" font-size="${titleFit.fontSize}" direction="${dir}">${escapeXml(line)}</text>`)
    .join("\n      ");

  const metaText = [author, dateStr].filter(Boolean).join(" · ");

  const descBlock = descFit.lines
    .map((line, i) => `<text x="${textCenterX}" y="${descStartY + i * descFit.lineHeight}" class="desc" font-family="${bodyFontFamily}" font-size="${descFit.fontSize}" direction="${dir}">${escapeXml(line)}</text>`)
    .join("\n      ");

  const photoBlock = hasPhoto
    ? `<image x="${PAD}" y="${PAD + 10}" width="${PHOTO_W}" height="${PHOTO_H}" href="${photoDataUrl}" preserveAspectRatio="xMidYMid slice" />
       <rect x="${PAD}" y="${PAD + 10}" width="${PHOTO_W}" height="${PHOTO_H}" fill="none" stroke="${RULE}" stroke-width="2" />`
    : "";

  return `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      text { dominant-baseline: middle; }
      .category { font-family: "${ARABIC_FONT}"; font-weight: 600; font-size: 20px; fill: ${MUTED}; text-anchor: middle; letter-spacing: 0.5px; }
      .title { fill: ${INK}; font-weight: 700; text-anchor: middle; }
      .meta { font-family: "${ARABIC_FONT}"; font-weight: 400; font-size: 21px; fill: ${MUTED}; text-anchor: middle; }
      .desc { fill: ${INK}; text-anchor: middle; }
      .footer { font-family: "${ARABIC_FONT}"; font-weight: 500; font-size: 22px; fill: ${MUTED}; }
    </style>
  </defs>

  <rect x="0" y="0" width="${W}" height="${H}" fill="${BG}" />
  <rect x="14" y="14" width="${W - 28}" height="${H - 28}" fill="none" stroke="${RULE}" stroke-width="2" />

  ${photoBlock}

  ${categoryBlock}
  ${titleBlock}
  <text x="${textCenterX}" y="${metaY}" class="meta">${escapeXml(metaText)}</text>
  ${tickRule(textCenterX, ruleY, 60, RULE)}
  ${descBlock}

  <text x="${PAD}" y="${H - 36}" class="footer">abderahmane.elhellal.com</text>
</svg>
`.trim();
}

async function main() {
  const onlySlug = process.argv[2];
  const fonts = await lib.loadFonts();

  const files = fs
    .readdirSync(ARTICLES_DIR)
    .filter((f) => f.endsWith(".md"))
    .filter((f) => !onlySlug || f === `${onlySlug}.md`)
    .sort();

  for (const file of files) {
    const slug = file.replace(/\.md$/, "");
    const raw = fs.readFileSync(path.join(ARTICLES_DIR, file), "utf8");
    const fm = parseFrontmatter(raw);

    const photoDataUrl = await remoteImageToDataUri(fm.thumb, PHOTO_W, PHOTO_H);

    const post = {
      title: fm.title || slug,
      category: fm.category || "",
      author: fm.author || "",
      dateStr: fm.pubDate
        ? new Intl.DateTimeFormat("ar", { year: "numeric", month: "long", day: "numeric" }).format(new Date(fm.pubDate))
        : "",
      description: lib.firstNSentences(fm.description || "", 3),
      photoDataUrl,
      isEnglish: (fm.lang || "en") === "en" && /[a-zA-Z]/.test((fm.title || "")[0] || ""),
    };

    const svg = buildSvg(post, fonts);
    await lib.renderPng(svg, path.join(OUT_DIR, `${slug}.png`));
    console.log(slug, photoDataUrl ? "(with photo)" : "(text only)");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
