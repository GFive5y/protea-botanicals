#!/usr/bin/env node
// PR 2b.2 codemod — WP-TABLE-UNIFY Phase 1
// Applies the 3 new tokens from 2b.1 (502cb07) + existing-T hex replacements
// Usage:
//   node scripts/pr2b2_codemod.js          # dry-run (prints changes, no write)
//   node scripts/pr2b2_codemod.js --apply  # apply changes to disk
//
// Scope:
//   Numeric → token (uses 2b.1 tokens):
//     fontSize: 13    → T.text.smPlus    (23 uses expected)
//     borderRadius: 6 → T.radius.smPlus  (20 uses expected)
//     borderRadius:10 → T.radius.mdPlus  (8 uses expected)
//
//   Hex → existing T token (render-body only, SKIPS lines 91-199
//   which contain CATEGORIES/HACCP_COLORS/TEMP_COLORS arrays):
//     "#FDE68A" → T.warningBd   (7 uses)
//     "#FECACA" → T.dangerBd    (4 uses)
//     "#BBF7D0" → T.successBd   (1 use)
//     "#fff"    → T.surface     (6 uses; short-form only, NOT part of longer hex)
//     "#7c3aed" → T.purple      (1 render use)
//     "#5b21b6" → T.purpleText  (1 render use)
//     "#2d6a4f" → T.accent      (1 render use)
//
// Expected total: 72 line changes, 156 → 84 violations remaining.

const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "src", "components", "hq", "HQFoodIngredients.js");
const apply = process.argv.includes("--apply");

// Lines 91-199 are protected data arrays (CATEGORIES, HACCP_COLORS, TEMP_COLORS).
// Hex replacements MUST skip these — they're data decisions, not style.
// Numeric replacements don't occur in these ranges anyway.
const PROTECTED_RANGES = [
  [91, 199], // CATEGORIES + HACCP_COLORS + TEMP_COLORS
];
function isProtected(lineNum) {
  return PROTECTED_RANGES.some(([lo, hi]) => lineNum >= lo && lineNum <= hi);
}

function isComment(line) {
  const t = line.trim();
  return t.startsWith("//") || t.startsWith("/*") || t.startsWith("*");
}

// —— Numeric property replacements ———————————————————————————————

const FONT_SIZE_MAP = {
  13: "T.text.smPlus",
};
const BORDER_RADIUS_MAP = {
  6:  "T.radius.smPlus",
  10: "T.radius.mdPlus",
};

function replaceProperty(line, prop, map) {
  const re = new RegExp(`(${prop}:\\s*)(\\d+)(\\s*[,}]|\\s*$)`, "g");
  return line.replace(re, (match, prefix, numStr, suffix) => {
    const n = parseInt(numStr, 10);
    if (map[n]) return `${prefix}${map[n]}${suffix}`;
    return match;
  });
}

// —— Hex replacements ————————————————————————————————————————————
// Each entry: [canonical match, regex, replacement token]
// Regex uses negative lookaround to prevent matching prefixes of longer hex
// (e.g., "#fff" must not match inside "#FFF7ED").

const HEX_REPLACEMENTS = [
  // 6-digit hexes — match case-insensitive, replace the quoted form
  { regex: /"(#FDE68A)"/gi, token: "T.warningBd" },
  { regex: /"(#FECACA)"/gi, token: "T.dangerBd" },
  { regex: /"(#BBF7D0)"/gi, token: "T.successBd" },
  { regex: /"(#7c3aed)"/gi, token: "T.purple" },
  { regex: /"(#5b21b6)"/gi, token: "T.purpleText" },
  { regex: /"(#2d6a4f)"/gi, token: "T.accent" },

  // 3-digit #fff — protect against matching within #fff7ed
  // Match only: "#fff" not followed by another hex digit
  { regex: /"#fff"(?=[^"]|$)/gi, token: "T.surface" },
];

function replaceHexes(line) {
  let result = line;
  for (const { regex, token } of HEX_REPLACEMENTS) {
    result = result.replace(regex, token);
  }
  return result;
}

// —— Main ————————————————————————————————————————————————————————

const lines = fs.readFileSync(FILE, "utf8").split("\n");
let changed = 0;
const output = [];
const changeLog = [];

for (let i = 0; i < lines.length; i++) {
  const lineNum = i + 1;
  let line = lines[i];

  if (isComment(line)) {
    output.push(line);
    continue;
  }

  const original = line;

  // Numeric replacements — apply everywhere (comments already skipped above)
  line = replaceProperty(line, "fontSize", FONT_SIZE_MAP);
  line = replaceProperty(line, "borderRadius", BORDER_RADIUS_MAP);

  // Hex replacements — skip protected data arrays
  if (!isProtected(lineNum)) {
    line = replaceHexes(line);
  }

  if (line !== original) {
    changed++;
    changeLog.push({ lineNum, before: original.trim(), after: line.trim() });
    if (!apply) {
      console.log(`L${lineNum}:`);
      console.log(`  - ${original.trim()}`);
      console.log(`  + ${line.trim()}`);
    }
  }

  output.push(line);
}

console.log(`\nPR 2b.2 codemod — src/components/hq/HQFoodIngredients.js`);
console.log(`  Lines scanned: ${lines.length}`);
console.log(`  Lines changed: ${changed}`);
console.log(`  Mode: ${apply ? "APPLIED" : "DRY RUN"}`);

if (apply) {
  fs.writeFileSync(FILE, output.join("\n"), "utf8");
  console.log("  File written.");
}
