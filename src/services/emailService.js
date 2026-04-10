// src/services/emailService.js
// GAP-C02 — thin wrapper around the send-email Edge Function.
// All email send paths in the app go through this single service.

import { supabase } from "./supabaseClient";

export const EMAIL_TYPES = {
  INVOICE_DELIVERY:      "invoice_delivery",
  VAT_REMINDER:          "vat_reminder",
  YEAR_END_NOTIFICATION: "year_end_notification",
  USER_INVITATION:       "user_invitation",
  OVERDUE_PAYMENT_ALERT: "overdue_payment_alert",
  STATEMENT_EMAIL:       "statement_email",
};

const CLIENT_FACING = new Set([
  EMAIL_TYPES.INVOICE_DELIVERY,
  EMAIL_TYPES.OVERDUE_PAYMENT_ALERT,
  EMAIL_TYPES.STATEMENT_EMAIL,
]);

/**
 * Send an email via the send-email Edge Function.
 *
 * @param {object} params
 * @param {string} params.type                one of EMAIL_TYPES
 * @param {string} params.tenantId            tenant uuid (rule 0F)
 * @param {{email: string, name?: string}} params.recipient
 * @param {string} [params.tenantContactEmail] required for client-facing types
 * @param {object} [params.data]              template variables
 * @param {string} [params.subject]           override default subject
 * @param {string} [params.pdfUrl]            signed URL to fetch + attach
 * @param {string} [params.pdfName]           attachment filename
 * @returns {Promise<{ok: boolean, skipped?: boolean, reason?: string, resend_id?: string|null, error?: string}>}
 */
export async function sendEmail({
  type,
  tenantId,
  recipient,
  tenantContactEmail,
  data = {},
  subject,
  pdfUrl,
  pdfName,
}) {
  if (!type)                 return { ok: false, error: "type required" };
  if (!recipient?.email)     return { ok: false, error: "recipient.email required" };
  if (CLIENT_FACING.has(type) && !tenantContactEmail) {
    return { ok: false, error: "tenantContactEmail required for client-facing email" };
  }

  const payload = {
    type,
    tenant_id: tenantId || null,
    recipient,
    tenantContactEmail: tenantContactEmail || undefined,
    subject,
    data,
    pdfUrl,
    pdfName,
  };

  try {
    const { data: res, error } = await supabase.functions.invoke("send-email", {
      body: payload,
    });
    if (error) {
      return { ok: false, error: error.message || String(error) };
    }
    if (res?.skipped) {
      return {
        ok: true,
        skipped: true,
        reason: res.reason,
        cooldown_hours: res.cooldown_hours,
        last_sent_at: res.last_sent_at,
      };
    }
    if (res?.ok === false) {
      return { ok: false, error: res.error || "send-email returned ok: false" };
    }
    return { ok: true, resend_id: res?.resend_id || null };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
}

// Convenience wrappers ---------------------------------------------------------

export const sendInvoiceEmail = (p) =>
  sendEmail({ ...p, type: EMAIL_TYPES.INVOICE_DELIVERY });

export const sendStatementEmail = (p) =>
  sendEmail({ ...p, type: EMAIL_TYPES.STATEMENT_EMAIL });

export const sendVatReminderEmail = (p) =>
  sendEmail({ ...p, type: EMAIL_TYPES.VAT_REMINDER });

export const sendYearEndEmail = (p) =>
  sendEmail({ ...p, type: EMAIL_TYPES.YEAR_END_NOTIFICATION });

export const sendUserInvitationEmail = (p) =>
  sendEmail({ ...p, type: EMAIL_TYPES.USER_INVITATION });

export const sendOverduePaymentEmail = (p) =>
  sendEmail({ ...p, type: EMAIL_TYPES.OVERDUE_PAYMENT_ALERT });
