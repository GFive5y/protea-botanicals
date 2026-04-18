// src/services/auditPlacemarker.js
// WTU 2A.5 — placemarker for platform audit trail. See WP-AUDIT-UNIFY.
//
// This is NOT the real audit trail. It writes nothing to the database.
// It exists so every mutation site has a single function to call.
// When WP-AUDIT-UNIFY lands, this file is rewritten with real INSERT.
// The interface signature MUST NOT change.

/**
 * Log a mutation for eventual unified audit.
 * @param {Object} entry
 * @param {string} entry.action       — e.g. "ingredient.create", "ingredient.edit"
 * @param {string} entry.targetType   — e.g. "food_ingredient"
 * @param {string} entry.targetId     — UUID of the mutated row
 * @param {string} [entry.tenantId]   — tenant scope
 * @param {Object} [entry.diff]       — { before, after } or { deleted }
 */
export function logAuditPlacemarker(entry) {
  // eslint-disable-next-line no-console
  console.info("[AUDIT-PLACEMARKER]", {
    ...entry,
    at: new Date().toISOString(),
    note: "Not yet written to audit_log. See WP-AUDIT-UNIFY.",
  });
}

export const logAudit = logAuditPlacemarker;
