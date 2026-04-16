#!/usr/bin/env node
// PR 2d codemod — WP-TABLE-UNIFY Phase 1
// Mechanical DS6 token replacement for HQFoodIngredients.js
// Usage:
//   node scripts/pr2d_codemod.js          # dry-run (prints changes, no write)
//   node scripts/pr2d_codemod.js --apply  # apply changes to disk

const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "src", "components", "hq", "HQFoodIngredients.js");
const apply = process.argv.includes("--apply");

const lines = fs.readFileSync(FILE, "utf8").split("\n");

// ── Replacement maps ──────────────────────────────────────────────────────
// Only values with unambiguous T token mappings. Design-call values skipped.

const FONT_SIZE = {
  10: "T.text.xxs",
  11: "T.text.xs",
  12: "T.text.sm",
  14: "T.text.base",
  15: "T.text.md",
  16: "T.text.lg",
  18: "T.text.xl",
  22: 'T.text["2xl"]',
  28: 'T.text["3xl"]',
  36: 'T.text["4xl"]',
};
// Skip: 9, 13, 24, 26, 32

const FONT_WEIGHT = {
  400: "T.weight.normal",
  500: "T.weight.medium",
  600: "T.weight.semibold",
  700: "T.weight.bold",
  800: "T.weight.extrabold",
};

const BORDER_RADIUS = {
  4: "T.radius.sm",
  8: "T.radius.md",
  12: "T.radius.lg",
  16: "T.radius.xl",
};
// Skip: 3, 5, 6, 10

const GAP = {
  4: "T.gap.xs",
  8: "T.gap.sm",
  12: "T.gap.md",
  16: "T.gap.lg",
  24: "T.gap.xl",
};
// Skip: 3, 6, 10, 20

const PADDING_MAP = {
  4: "T.pad.xs",
};
// Skip: 28, 60 (custom intentional values)

// ── Replacement engine ────────────────────────────────────────────────────

function isComment(line) {
  const t = line.trim();
  return t.startsWith("//") || t.startsWith("/*") || t.startsWith("*");
}

function replaceProperty(line, prop, map) {
  // Match: prop: <number>, or prop: <number> } or prop: <number>\n
  // But NOT inside a string (no quotes around the number)
  const re = new RegExp(`(${prop}:\\s*)(\\d+)(\\s*[,}]|\\s*$)`, "g");
  return line.replace(re, (match, prefix, numStr, suffix) => {
    const n = parseInt(numStr, 10);
    if (map[n]) return `${prefix}${map[n]}${suffix}`;
    return match;
  });
}

let changed = 0;
const output = [];

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];

  // Skip comment lines
  if (isComment(line)) {
    output.push(line);
    continue;
  }

  const original = line;

  // Apply replacements in order
  line = replaceProperty(line, "fontSize", FONT_SIZE);
  line = replaceProperty(line, "fontWeight", FONT_WEIGHT);
  line = replaceProperty(line, "borderRadius", BORDER_RADIUS);
  line = replaceProperty(line, "gap", GAP);

  // Padding: only standalone `padding: 4,` not compound strings like "8px 16px"
  // Check it's not a string value (no quotes)
  if (/padding:\s*\d+\s*[,}]/.test(line) && !/"/.test(line.split("padding")[1] || "")) {
    line = replaceProperty(line, "padding", PADDING_MAP);
  }

  if (line !== original) {
    changed++;
    if (!apply) {
      console.log(`L${i + 1}:`);
      console.log(`  - ${original.trim()}`);
      console.log(`  + ${line.trim()}`);
    }
  }

  output.push(line);
}

console.log(`\nPR 2d codemod — src/components/hq/HQFoodIngredients.js`);
console.log(`  Lines scanned: ${lines.length}`);
console.log(`  Lines changed: ${changed}`);
console.log(`  Mode: ${apply ? "APPLIED" : "DRY RUN"}`);

if (apply) {
  fs.writeFileSync(FILE, output.join("\n"), "utf8");
  console.log("  File written.");
}
