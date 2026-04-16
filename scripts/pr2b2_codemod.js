#!/usr/bin/env node
// PR 2b.2 codemod — WP-TABLE-UNIFY Phase 1
// Applies the 3 new tokens from 2b.1 (502cb07) + existing-T hex replacements
// Usage:
//   node scripts/pr2b2_codemod.js          # dry-run (prints changes, no write)
//   node scripts/pr2b2_codemod.js --apply  # apply changes to disk

const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "src", "components", "hq", "HQFoodIngredients.js");
const apply = process.argv.includes("--apply");

const PROTECTED_RANGES = [
  [91, 199],
];
function isProtected(lineNum) {
  return PROTECTED_RANGES.some(([lo, hi]) => lineNum >= lo && lineNum <= hi);
}

function isComment(line) {
  const t = line.trim();
  return t.startsWith("//") || t.startsWith("/*") || t.startsWith("*");
}

const FONT_SIZE_MAP = { 13: "T.text.smPlus" };
const BORDER_RADIUS_MAP = { 6: "T.radius.smPlus", 10: "T.radius.mdPlus" };

function replaceProperty(line, prop, map) {
  const re = new RegExp(`(${prop}:\\s*)(\\d+)(\\s*[,}]|\\s*$)`, "g");
  return line.replace(re, (match, prefix, numStr, suffix) => {
    const n = parseInt(numStr, 10);
    if (map[n]) return `${prefix}${map[n]}${suffix}`;
    return match;
  });
}

const HEX_REPLACEMENTS = [
  { regex: /"(#FDE68A)"/gi, token: "T.warningBd" },
  { regex: /"(#FECACA)"/gi, token: "T.dangerBd" },
  { regex: /"(#BBF7D0)"/gi, token: "T.successBd" },
  { regex: /"(#7c3aed)"/gi, token: "T.purple" },
  { regex: /"(#5b21b6)"/gi, token: "T.purpleText" },
  { regex: /"(#2d6a4f)"/gi, token: "T.accent" },
  { regex: /"#fff"(?=[^"]|$)/gi, token: "T.surface" },
];

function replaceHexes(line) {
  let result = line;
  for (const { regex, token } of HEX_REPLACEMENTS) {
    result = result.replace(regex, token);
  }
  return result;
}

const lines = fs.readFileSync(FILE, "utf8").split("\n");
let changed = 0;
const output = [];

for (let i = 0; i < lines.length; i++) {
  const lineNum = i + 1;
  let line = lines[i];

  if (isComment(line)) {
    output.push(line);
    continue;
  }

  const original = line;

  line = replaceProperty(line, "fontSize", FONT_SIZE_MAP);
  line = replaceProperty(line, "borderRadius", BORDER_RADIUS_MAP);

  if (!isProtected(lineNum)) {
    line = replaceHexes(line);
  }

  if (line !== original) {
    changed++;
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
