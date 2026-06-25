#!/usr/bin/env node
/**
 * Shared helpers for generating 1200x630 Open Graph / Twitter Card images
 * across the books, article, and taammulat content collections.
 *
 * Fonts: Cairo (Arabic, matches the site's --font-arabic in global.css) and
 * Inter (Latin, matches the site's --font-sans), both variable fonts so a
 * single file covers regular + bold via the wght axis.
 *
 * Font rendering note: the bundled sharp/libvips on macOS renders SVG text
 * through CoreText, which silently ignores embedded @font-face fonts.
 * Custom fonts must be installed into ~/Library/Fonts and referenced by
 * family name — see ensureFontsInstalled(). CoreText correctly resolves
 * font-weight against a single installed variable font file.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const sharp = require("sharp");
const fontkit = require("fontkit");

const FONTS_DIR = path.join(__dirname, "og-fonts");
const FONT_FILES = ["Cairo-Variable.ttf", "Inter-Variable.ttf", "ArefRuqaaInk-Bold.ttf", "ArefRuqaa-Regular.ttf", "Tajawal-Regular.ttf"];

const ARABIC_FONT = "Cairo";
const ARABIC_TITLE_FONT = "Aref Ruqaa Ink";
const ARABIC_BYLINE_FONT = "Aref Ruqaa";
const LATIN_FONT = "Inter";

const W = 1200;
const H = 630;
const PAD = 60;

const BG = "#eeebe4";
const INK = "#1c1a16";
const MUTED = "#8a8478";
const RULE = "#d0cdc6";

function ensureFontsInstalled() {
  if (process.platform !== "darwin") {
    console.error(`Warning: font auto-install only implemented for macOS. Install ${FONT_FILES.join(", ")} from ${FONTS_DIR} manually.`);
    return false;
  }
  const targetDir = path.join(os.homedir(), "Library", "Fonts");
  let installedAny = false;
  for (const file of FONT_FILES) {
    const src = path.join(FONTS_DIR, file);
    const dest = path.join(targetDir, file);
    const srcSize = fs.statSync(src).size;
    const destExists = fs.existsSync(dest);
    const destSize = destExists ? fs.statSync(dest).size : -1;
    if (!destExists || destSize !== srcSize) {
      fs.copyFileSync(src, dest);
      installedAny = true;
    }
  }
  return installedAny;
}

async function loadFonts() {
  const installedAny = ensureFontsInstalled();
  if (installedAny) await new Promise((r) => setTimeout(r, 400));
  const arabic = fontkit.openSync(path.join(FONTS_DIR, "Cairo-Variable.ttf"));
  const latin = fontkit.openSync(path.join(FONTS_DIR, "Inter-Variable.ttf"));
  const arabicTitleFont = fontkit.openSync(path.join(FONTS_DIR, "ArefRuqaaInk-Bold.ttf"));
  return {
    arabicRegular: arabic,
    arabicBold: arabic.getVariation({ wght: 700 }),
    arabicTitle: arabicTitleFont,
    latinRegular: latin.getVariation({ wght: 400, opsz: 32 }),
    latinBold: latin.getVariation({ wght: 700, opsz: 32 }),
  };
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function measureWidth(font, text, fontSize) {
  if (!text) return 0;
  const run = font.layout(text);
  return (run.advanceWidth / font.unitsPerEm) * fontSize;
}

function wrapSegment(font, segment, fontSize, maxWidth) {
  const words = segment.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (measureWidth(font, candidate, fontSize) <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Fits text into a width/height budget by shrinking font size, measured with real glyph advances. */
function fitBlock(font, text, { maxWidth, maxHeight, startSize, minSize, lineHeightRatio = 1.45 }) {
  for (let fontSize = startSize; fontSize >= minSize; fontSize -= 1) {
    const lines = wrapSegment(font, text, fontSize, maxWidth);
    const lineHeight = fontSize * lineHeightRatio;
    if (lines.length * lineHeight <= maxHeight) {
      return { lines, fontSize, lineHeight };
    }
  }
  const fontSize = minSize;
  const lineHeight = fontSize * lineHeightRatio;
  const lines = wrapSegment(font, text, fontSize, maxWidth);
  return { lines, fontSize, lineHeight };
}

/** Fits text into a width + max line count by shrinking font size (no height budget). */
function fitBlockByLines(font, text, { maxWidth, startSize, minSize, maxLines, lineHeightRatio = 1.3 }) {
  for (let fontSize = startSize; fontSize >= minSize; fontSize -= 2) {
    const lines = wrapSegment(font, text, fontSize, maxWidth);
    if (lines.length <= maxLines) {
      return { lines, fontSize, lineHeight: fontSize * lineHeightRatio };
    }
  }
  const fontSize = minSize;
  const lines = wrapSegment(font, text, fontSize, maxWidth);
  return { lines, fontSize, lineHeight: fontSize * lineHeightRatio };
}

function firstNSentences(text, n) {
  const parts = (text || "")
    .split(/(?<=[.!؟])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.slice(0, n).join(" ");
}

function tickRule(cx, y, halfWidth, color) {
  const tick = 6;
  return `
    <line x1="${cx - halfWidth}" y1="${y}" x2="${cx + halfWidth}" y2="${y}" stroke="${color}" stroke-width="1.5" />
    <line x1="${cx - halfWidth}" y1="${y - tick}" x2="${cx - halfWidth}" y2="${y + tick}" stroke="${color}" stroke-width="1.5" />
    <line x1="${cx + halfWidth}" y1="${y - tick}" x2="${cx + halfWidth}" y2="${y + tick}" stroke="${color}" stroke-width="1.5" />`;
}

async function imageToDataUri(imagePath, boxW, boxH) {
  if (!imagePath || !fs.existsSync(imagePath)) return null;
  const buf = await sharp(imagePath).resize(boxW, boxH, { fit: "cover" }).png().toBuffer();
  return `data:image/png;base64,${buf.toString("base64")}`;
}

async function renderPng(svg, outPath) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: false }).toFile(outPath);
}

module.exports = {
  W, H, PAD, BG, INK, MUTED, RULE,
  ARABIC_FONT, ARABIC_TITLE_FONT, ARABIC_BYLINE_FONT, LATIN_FONT,
  loadFonts,
  escapeXml,
  measureWidth,
  wrapSegment,
  fitBlock,
  fitBlockByLines,
  firstNSentences,
  tickRule,
  imageToDataUri,
  renderPng,
};
