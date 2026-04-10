// supabase/functions/send-email/index.ts
// v1.0 — GAP-C02: Email infrastructure via Resend
// Mirrors structure of send-notification (v37).
//
// Secrets (Supabase vault):
//   RESEND_API_KEY
//   RESEND_FROM_ADDRESS  default: onboarding@resend.dev
//   APP_URL              default: https://nuai-gfive5ys-projects.vercel.app
//
// Request body:
// {
//   type: "invoice_delivery" | "vat_reminder" | "year_end_notification"
//       | "user_invitation"  | "overdue_payment_alert" | "statement_email",
//   tenant_id:           uuid,
//   recipient:           { email: string, name?: string },
//   tenantContactEmail?: string,   // required for CLIENT_FACING types (reply-to)
//   subject?:            string,   // override default
//   data?:               Record<string, any>,
//   pdfUrl?:             string,   // EF will fetch + base64 + attach (<=5MB)
//   pdfName?:            string,
// }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const JSON_HEADERS = { ...CORS, "Content-Type": "application/json" };

// -----------------------------------------------------------------------------
// CONFIG
// -----------------------------------------------------------------------------

const CLIENT_FACING = new Set([
  "invoice_delivery",
  "overdue_payment_alert",
  "statement_email",
]);
const INTERNAL = new Set([
  "vat_reminder",
  "year_end_notification",
  "user_invitation",
]);
const INTERNAL_REPLY_TO = "admin@protea.dev";

// Cooldown in HOURS per (tenant_id, type, recipient).
const COOLDOWN_HOURS: Record<string, number> = {
  invoice_delivery:      24,
  vat_reminder:          168,
  year_end_notification: 168,
  user_invitation:       24,
  overdue_payment_alert: 48,
  statement_email:       24,
};

const MAX_PDF_BYTES = 5 * 1024 * 1024; // 5 MB

// -----------------------------------------------------------------------------
// TEMPLATES
// -----------------------------------------------------------------------------

function brandHeader(): string {
  return `
    <div style="font-family: Inter, system-ui, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
      <div style="border-bottom: 2px solid #4338ca; padding-bottom: 12px; margin-bottom: 24px;">
        <div style="font-size: 22px; font-weight: 700; color: #4338ca;">Nu Ai</div>
        <div style="font-size: 12px; color: #666;">Multi-tenant SaaS ERP</div>
      </div>
  `;
}

function brandFooter(appUrl: string): string {
  return `
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; font-size: 11px; color: #888;">
        <div>Nu Ai (Pty) Ltd.</div>
        <div><a href="${appUrl}" style="color: #4338ca; text-decoration: none;">${appUrl}</a></div>
        <div style="margin-top: 8px;">Automated message — do not reply to this address.</div>
      </div>
    </div>
  `;
}

function defaultSubject(type: string, data: Record<string, any>): string {
  switch (type) {
    case "invoice_delivery":
      return `Invoice ${data.invoice_number || ""} from ${data.tenant_name || "Nu Ai"}`;
    case "vat_reminder":
      return `VAT period reminder — ${data.period || ""}`;
    case "year_end_notification":
      return `Year-end close notification — ${data.financial_year || ""}`;
    case "user_invitation":
      return `You have been invited to ${data.tenant_name || "Nu Ai"}`;
    case "overdue_payment_alert":
      return `Overdue payment alert — ${data.invoice_number || ""}`;
    case "statement_email":
      return `Account statement — ${data.period || ""}`;
    default:
      return "Nu Ai notification";
  }
}

function buildHtml(type: string, data: Record<string, any>, appUrl: string): string {
  const head = brandHeader();
  const foot = brandFooter(appUrl);
  const r = (n: any) => `R ${Number(n || 0).toFixed(2)}`;
  switch (type) {
    case "invoice_delivery":
      return `${head}
        <h2 style="font-size: 18px; margin: 0 0 16px;">Invoice ${data.invoice_number || ""}</h2>
        <p>Hi ${data.customer_name || "there"},</p>
        <p>Please find attached invoice <strong>${data.invoice_number || ""}</strong> dated ${data.invoice_date || ""}.</p>
        <p><strong>Amount due:</strong> ${r(data.total)}<br/>
           <strong>Due date:</strong> ${data.due_date || ""}</p>
        <p>Thank you for your business.</p>
        <p style="margin-top: 24px;">Regards,<br/>${data.tenant_name || "Nu Ai"}</p>
      ${foot}`;
    case "vat_reminder":
      return `${head}
        <h2 style="font-size: 18px; margin: 0 0 16px;">VAT Period Reminder</h2>
        <p>The VAT period <strong>${data.period || ""}</strong> closes on <strong>${data.close_date || ""}</strong>.</p>
        <p>Output VAT: ${r(data.output_vat)}<br/>
           Input VAT:  ${r(data.input_vat)}<br/>
           Net payable: ${r(data.net_vat)}</p>
        <p><a href="${appUrl}/hq" style="background: #4338ca; color: #fff; padding: 10px 16px; text-decoration: none; border-radius: 6px; display: inline-block;">Open VAT201 in HQ</a></p>
      ${foot}`;
    case "year_end_notification":
      return `${head}
        <h2 style="font-size: 18px; margin: 0 0 16px;">Year-End Close — ${data.financial_year || ""}</h2>
        <p>${data.message || "The financial year has been closed."}</p>
        <p>Closing retained earnings: ${r(data.closing_retained_earnings)}</p>
      ${foot}`;
    case "user_invitation":
      return `${head}
        <h2 style="font-size: 18px; margin: 0 0 16px;">You're invited to ${data.tenant_name || "Nu Ai"}</h2>
        <p>Hi ${data.invited_name || "there"},</p>
        <p>${data.inviter_name || "The team"} has invited you to join <strong>${data.tenant_name || "Nu Ai"}</strong> as <strong>${data.role || "a team member"}</strong>.</p>
        <p><a href="${data.accept_url || appUrl}" style="background: #4338ca; color: #fff; padding: 10px 16px; text-decoration: none; border-radius: 6px; display: inline-block;">Accept invitation</a></p>
        <p style="font-size: 12px; color: #666;">If the button does not work, copy this link into your browser:<br/>${data.accept_url || appUrl}</p>
      ${foot}`;
    case "overdue_payment_alert":
      return `${head}
        <h2 style="font-size: 18px; margin: 0 0 16px; color: #dc2626;">Overdue Payment Alert</h2>
        <p>Invoice <strong>${data.invoice_number || ""}</strong> is <strong>${data.days_overdue || 0} days overdue</strong>.</p>
        <p>Customer: ${data.customer_name || ""}<br/>
           Outstanding: ${r(data.amount_outstanding)}</p>
      ${foot}`;
    case "statement_email":
      return `${head}
        <h2 style="font-size: 18px; margin: 0 0 16px;">Account Statement</h2>
        <p>Hi ${data.customer_name || "there"},</p>
        <p>Please find attached your account statement for <strong>${data.period || ""}</strong>.</p>
        <p>Opening balance: ${r(data.opening_balance)}<br/>
           Closing balance: ${r(data.closing_balance)}</p>
      ${foot}`;
    default:
      return `${head}<p>${data.message || "Notification from Nu Ai."}</p>${foot}`;
  }
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

async function fetchPdfBase64(
  url: string,
): Promise<{ ok: true; base64: string } | { ok: false; error: string }> {
  try {
    const res = await fetch(url);
    if (!res.ok) return { ok: false, error: `pdf fetch failed: HTTP ${res.status}` };
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_PDF_BYTES) {
      return { ok: false, error: `pdf exceeds 5MB limit (${buf.byteLength} bytes)` };
    }
    const bytes = new Uint8Array(buf);
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any);
    }
    return { ok: true, base64: btoa(binary) };
  } catch (e: any) {
    return { ok: false, error: `pdf fetch error: ${e.message}` };
  }
}

async function sendViaResend(params: {
  apiKey: string;
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  html: string;
  attachment?: { filename: string; content: string } | null;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const body: Record<string, any> = {
      from: params.from,
      to: [params.to],
      reply_to: params.replyTo,
      subject: params.subject,
      html: params.html,
    };
    if (params.attachment) {
      body.attachments = [{
        filename: params.attachment.filename,
        content: params.attachment.content,
      }];
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.apiKey}`,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch { /* not JSON */ }
    if (!res.ok) {
      return { success: false, error: `Resend ${res.status}: ${json?.message || text}` };
    }
    return { success: true, id: json?.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// -----------------------------------------------------------------------------
// HANDLER
// -----------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // --- Auth: validate bearer token before anything else --------------------
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return new Response(
      JSON.stringify({ error: "missing bearer token" }),
      { status: 401, headers: JSON_HEADERS },
    );
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    return new Response(
      JSON.stringify({ error: "empty bearer token" }),
      { status: 401, headers: JSON_HEADERS },
    );
  }

  try {
    const supabaseUrl  = Deno.env.get("SUPABASE_URL")!;
    const serviceKey   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey    = Deno.env.get("RESEND_API_KEY") || "";
    const fromAddress  = Deno.env.get("RESEND_FROM_ADDRESS") || "onboarding@resend.dev";
    const appUrl       = Deno.env.get("APP_URL") || "https://nuai-gfive5ys-projects.vercel.app";

    // Verify the caller's token against Supabase auth.
    const sbAuth = createClient(supabaseUrl, serviceKey);
    const { data: userData, error: userErr } = await sbAuth.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "invalid bearer token" }),
        { status: 401, headers: JSON_HEADERS },
      );
    }

    // Service-role client for all DB writes (email_logs) — bypasses RLS.
    const sb = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const {
      type,
      tenant_id,
      recipient,
      tenantContactEmail,
      subject: subjectOverride,
      data = {},
      pdfUrl,
      pdfName,
    } = body;

    if (!type || !recipient?.email) {
      return new Response(
        JSON.stringify({ error: "type and recipient.email are required" }),
        { status: 400, headers: JSON_HEADERS },
      );
    }

    const isClient = CLIENT_FACING.has(type);
    const isInternal = INTERNAL.has(type);
    if (!isClient && !isInternal) {
      return new Response(
        JSON.stringify({ error: `unknown email type: ${type}` }),
        { status: 400, headers: JSON_HEADERS },
      );
    }

    // --- Cooldown check (tenant_id + type + recipient) ----------------------
    const hours = COOLDOWN_HOURS[type] ?? 0;
    if (hours > 0) {
      const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
      let q = sb
        .from("email_logs")
        .select("id, sent_at")
        .eq("type", type)
        .eq("recipient", recipient.email)
        .eq("status", "sent")
        .gte("sent_at", since)
        .limit(1);
      q = tenant_id ? q.eq("tenant_id", tenant_id) : q.is("tenant_id", null);
      const { data: recent, error: cdErr } = await q;
      if (cdErr) {
        console.error("[send-email] cooldown query error:", cdErr.message);
      } else if (recent && recent.length > 0) {
        return new Response(
          JSON.stringify({
            ok: true,
            skipped: true,
            reason: "cooldown",
            cooldown_hours: hours,
            last_sent_at: recent[0].sent_at,
          }),
          { headers: JSON_HEADERS },
        );
      }
    }

    // --- Reply-to resolution ------------------------------------------------
    let replyTo = INTERNAL_REPLY_TO;
    if (isClient) {
      if (!tenantContactEmail) {
        return new Response(
          JSON.stringify({ error: "tenantContactEmail required for client-facing types" }),
          { status: 400, headers: JSON_HEADERS },
        );
      }
      replyTo = tenantContactEmail;
    }

    // --- PDF attachment -----------------------------------------------------
    let attachment: { filename: string; content: string } | null = null;
    if (pdfUrl) {
      const pdfRes = await fetchPdfBase64(pdfUrl);
      if (!pdfRes.ok) {
        return new Response(
          JSON.stringify({ error: pdfRes.error }),
          { status: 400, headers: JSON_HEADERS },
        );
      }
      attachment = { filename: pdfName || "document.pdf", content: pdfRes.base64 };
    }

    // --- Build + send -------------------------------------------------------
    const subject = subjectOverride || defaultSubject(type, data);
    const html = buildHtml(type, data, appUrl);

    let result: { success: boolean; id?: string; error?: string };
    if (!resendKey) {
      result = { success: false, error: "RESEND_API_KEY not configured" };
    } else {
      result = await sendViaResend({
        apiKey: resendKey,
        from: fromAddress,
        to: recipient.email,
        replyTo,
        subject,
        html,
        attachment,
      });
    }

    // --- Log (always, success or fail) --------------------------------------
    const { error: logErr } = await sb.from("email_logs").insert({
      tenant_id: tenant_id || null,
      type,
      recipient: recipient.email,
      subject,
      status: result.success ? "sent" : "failed",
      resend_id: result.id || null,
      error: result.error || null,
      metadata: {
        recipient_name: recipient.name || null,
        data,
        had_attachment: !!attachment,
        reply_to: replyTo,
        sent_by_user_id: userData.user.id,
      },
    });
    if (logErr) console.error("[send-email] log insert error:", logErr.message);

    if (!result.success) {
      return new Response(
        JSON.stringify({ ok: false, error: result.error }),
        { status: 502, headers: JSON_HEADERS },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, resend_id: result.id || null }),
      { headers: JSON_HEADERS },
    );
  } catch (e: any) {
    console.error("[send-email] error:", e);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: JSON_HEADERS },
    );
  }
});
