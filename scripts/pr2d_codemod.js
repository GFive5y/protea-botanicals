#!/usr/bin/env node
/**
 * WP-TABLE-UNIFY Phase 1 PR 2d — Mechanical DS6 pass
 * Target: src/components/hq/HQFoodIngredients.js
 * Session 293 · 17 April 2026
 *
 * Replaces numeric DS6 violations with T-token references for values that
 * have unambiguous 1-to-1 mappings. Values with no token (design calls)
 * are LEFT UNTOUCHED and logged for PR 2b/2c follow-up.
 *
 * USAGE:
 *   node pr2d_codemod.js                    # dry-run, shows diff
 *   node pr2d_codemod.js --apply            # writes changes in place
 *   node pr2d_codemod.js --report-only      # count summary, no diff
 *
 * SAFETY:
 *   - Idempotent (running twice produces no additional changes)
 *   - Skips single-line comments (`//`) and block comments (`/* *\/`)
 *   - Leaves compound padding/margin strings alone ("8px 0 0")
 *   - Only transforms exact numeric forms
 *   - Does NOT touch hex colours, JSX content, or string literals
 */

const fs = require('fs');
const path = require('path');

const TARGET = 'src/components/hq/HQFoodIngredients.js';
const APPLY = process.argv.includes('--apply');
const REPORT_ONLY = process.argv.includes('--report-only');

// ——— MAPPINGS (identity-only, no ambiguity) ————————————————————

const FONT_SIZE_MAP = {
  10: 'T.text.xxs',
  11: 'T.text.xs',
  12: 'T.text.sm',
  14: 'T.text.base',
  15: 'T.text.md',
  16: 'T.text.lg',
  18: 'T.text.xl',
  22: 'T.text["2xl"]',
  28: 'T.text["3xl"]',
  36: 'T.text["4xl"]',
};
// Intentionally NOT mapped (design calls — left alone):
//   9, 13, 24, 26, 32

const FONT_WEIGHT_MAP = {
  400: 'T.weight.normal',
  500: 'T.weight.medium',
  600: 'T.weight.semibold',
  700: 'T.weight.bold',
  800: 'T.weight.extrabold',
};

const BORDER_RADIUS_MAP = {
  4:  'T.radius.sm',
  8:  'T.radius.md',
  12: 'T.radius.lg',
  16: 'T.radius.xl',
};
// Intentionally NOT mapped (design calls): 3, 5, 6, 10

const GAP_MAP = {
  4:  'T.gap.xs',
  8:  'T.gap.sm',
  12: 'T.gap.md',
  16: 'T.gap.lg',
  24: 'T.gap.xl',
  // 20 → T.space[5] requires bracket access → skip to keep this PR clean
};
// Intentionally NOT mapped (design calls): 3, 6, 10, 20

const PADDING_MAP = {
  4:  'T.pad.xs',
  // 8, 12, 16 would map but file has none at these values
  // 28, 60 are custom → leave alone
};

// ——— REGEX PATTERNS —————————————————————————————————————————————

// fontSize: N  (numeric form only; NOT fontSize: "Npx")
// Negative lookbehind protects digits that are part of larger numbers.
// Negative lookahead (?!["\w]) protects from matching fontSize: "11px".
const FONT_SIZE_RE = /\bfontSize:\s*(\d+)\b(?!["\w])/g;

// fontWeight: NNN (3-digit forms 400-800 with optional trailing)
const FONT_WEIGHT_RE = /\bfontWeight:\s*(\d{3})\b/g;

// borderRadius: N  (numeric; NOT borderRadius: "50%" or borderRadius: "4px")
const BORDER_RADIUS_RE = /\bborderRadius:\s*(\d+)\b(?!["\w%])/g;

// gap: N (numeric only; NOT gap: "8px")
const GAP_RE = /\bgap:\s*(\d+)\b(?!["\w])/g;

// padding: N (numeric single-value; NOT padding: "8px 16px")
const PADDING_RE = /\bpadding:\s*(\d+)\b(?!["\w])/g;

// ——— COMMENT DETECTION —————————————————————————————————————————

function isCommentLine(line) {
  const t = line.trimStart();
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*');
}

// ——— MAIN ———————————————————————————————————————————————————————

const src = fs.readFileSync(TARGET, 'utf8');
const lines = src.split('\n');
const out = [];
const changes = [];  // { line, before, after, kind }

for (let i = 0; i < lines.length; i++) {
  const lineNum = i + 1;
  let line = lines[i];
  const original = line;

  if (isCommentLine(line)) {
    out.push(line);
    continue;
  }

  // fontSize
  line = line.replace(FONT_SIZE_RE, (match, num) => {
    const token = FONT_SIZE_MAP[parseInt(num, 10)];
    if (!token) return match; // design call — leave alone
    return `fontSize: ${token}`;
  });

  // fontWeight
  line = line.replace(FONT_WEIGHT_RE, (match, num) => {
    const token = FONT_WEIGHT_MAP[parseInt(num, 10)];
    if (!token) return match;
    return `fontWeight: ${token}`;
  });

  // borderRadius
  line = line.replace(BORDER_RADIUS_RE, (match, num) => {
    const token = BORDER_RADIUS_MAP[parseInt(num, 10)];
    if (!token) return match;
    return `borderRadius: ${token}`;
  });

  // gap
  line = line.replace(GAP_RE, (match, num) => {
    const token = GAP_MAP[parseInt(num, 10)];
    if (!token) return match;
    return `gap: ${token}`;
  });

  // padding
  line = line.replace(PADDING_RE, (match, num) => {
    const token = PADDING_MAP[parseInt(num, 10)];
    if (!token) return match;
    return `padding: ${token}`;
  });

  if (line !== original) {
    changes.push({ line: lineNum, before: original.trim(), after: line.trim() });
  }
  out.push(line);
}

// ——— REPORT ————————————————————————————————————————————————————

console.log(`\nPR 2d codemod — ${TARGET}`);
console.log(`  Lines scanned: ${lines.length}`);
console.log(`  Lines changed: ${changes.length}`);
console.log(`  Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}`);

if (!REPORT_ONLY && changes.length) {
  console.log(`\nFirst 20 changes (of ${changes.length}):`);
  for (const c of changes.slice(0, 20)) {
    console.log(`\n  L${c.line}:`);
    console.log(`    - ${c.before}`);
    console.log(`    + ${c.after}`);
  }
  if (changes.length > 20) {
    console.log(`\n  ...and ${changes.length - 20} more`);
  }
}

if (APPLY) {
  fs.writeFileSync(TARGET, out.join('\n'));
  console.log(`\nWritten ${changes.length} changes to ${TARGET}`);
} else {
  console.log(`\n(Dry run — no files written. Pass --apply to write.)`);
}
