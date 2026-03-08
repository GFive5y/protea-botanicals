// supabase/functions/send-notification/index.ts
// WP9 — Notification Edge Function
// Handles SMS via BulkSMS + email framework (provider-agnostic stub)
//
// POST body:
// {
//   type:      "sms" | "email" | "both"
//   trigger:   "scan_confirmed" | "tier_upgrade" | "shipment_dispatched" |
//              "shipment_delivered" | "low_stock" | "churn_risk" | "new_customer"
//   recipient: { phone?: string, email?: string, name?: string }
//   data:      { points?, tier?, product?, shipment_number?, items?, score? }
//   tenant_id?: string
// }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Message templates ─────────────────────────────────────────────────────
function buildSMS(trigger: string, data: Record<string, any>): string {
  switch (trigger) {
    case "scan_confirmed":
      return `Protea Botanicals: Product verified ✓ You earned ${data.points || 0} pts! Total: ${data.total_points || 0} pts. Keep scanning to unlock rewards. Reply STOP to opt out.`;
    case "tier_upgrade":
      return `Protea Botanicals: Congratulations ${data.name || ""}! You've reached ${data.tier?.toUpperCase()} tier 🎉 Your loyalty is rewarded. Reply STOP to opt out.`;
    case "shipment_dispatched":
      return `Protea Botanicals: Shipment ${data.shipment_number} dispatched to ${data.destination}. Courier: ${data.courier || "TBC"}. Tracking: ${data.tracking || "—"}. ETA: ${data.eta || "TBC"}.`;
    case "shipment_delivered":
      return `Protea Botanicals: Shipment ${data.shipment_number} has been delivered to ${data.destination}. Please confirm receipt in your portal.`;
    case "low_stock":
      return `Protea Botanicals ALERT: ${data.item_name} is ${data.quantity === 0 ? "OUT OF STOCK" : `low (${data.quantity} ${data.unit} remaining)`}. Reorder level: ${data.reorder_level}. Action required.`;
    case "churn_risk":
      return `Protea Botanicals ALERT: Customer ${data.customer_name || data.customer_id} flagged as churn risk. Last active: ${data.last_active || "unknown"}. Engagement score: ${data.score || 0}/100.`;
    case "new_customer":
      return `Protea Botanicals: New customer registered — ${data.name || "Anonymous"} (${data.phone || data.email || "no contact"}). Acquisition: ${data.channel || "direct"}. Check admin dashboard.`;
    default:
      return data.message || "Notification from Protea Botanicals.";
  }
}

function buildEmailHTML(
  trigger: string,
  data: Record<string, any>,
): { subject: string; html: string } {
  const base = (content: string) => `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #faf9f6; padding: 40px 32px;">
      <div style="margin-bottom: 24px;">
        <div style="font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: #52b788;">Protea Botanicals</div>
        <div style="font-size: 28px; font-weight: 300; color: #1b4332; margin-top: 4px; font-family: Georgia, serif;">
          ${data.heading || "Notification"}
        </div>
      </div>
      <div style="background: #fff; border: 1px solid #e8e0d4; border-radius: 2px; padding: 24px; margin-bottom: 24px;">
        ${content}
      </div>
      <div style="font-size: 11px; color: #888; text-align: center;">
        Protea Botanicals · proteabotanicals.co.za<br>
        <a href="#" style="color: #888;">Unsubscribe</a> · <a href="#" style="color: #888;">Privacy Policy</a>
      </div>
    </div>
  `;

  switch (trigger) {
    case "scan_confirmed":
      return {
        subject: `You earned ${data.points} points — Protea Botanicals`,
        html: base(`
          <p style="color: #1a1a1a; font-size: 15px; line-height: 1.6;">Hi ${data.name || "there"},</p>
          <p style="color: #1a1a1a; font-size: 15px; line-height: 1.6;">Your product scan was verified and you earned <strong style="color: #52b788;">${data.points} points</strong>.</p>
          <div style="background: #eafaf1; border-radius: 2px; padding: 16px; text-align: center; margin: 16px 0;">
            <div style="font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.2em;">Your total</div>
            <div style="font-size: 42px; font-weight: 300; color: #1b4332; font-family: Georgia, serif;">${data.total_points}</div>
            <div style="font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.2em;">points</div>
          </div>
          <p style="color: #888; font-size: 13px;">Product: ${data.product || "—"} · Batch: ${data.batch || "—"}</p>
        `),
      };
    case "tier_upgrade":
      return {
        subject: `You've reached ${data.tier} tier — Protea Botanicals`,
        html: base(`
          <p style="color: #1a1a1a; font-size: 15px; line-height: 1.6;">Congratulations ${data.name || ""}! 🎉</p>
          <p style="color: #1a1a1a; font-size: 15px; line-height: 1.6;">You've reached <strong>${data.tier?.toUpperCase()}</strong> tier with ${data.points} points.</p>
          <p style="color: #888; font-size: 13px;">Keep scanning to maintain your tier and unlock exclusive rewards.</p>
        `),
      };
    case "shipment_dispatched":
      return {
        subject: `Shipment ${data.shipment_number} dispatched`,
        html: base(`
          <p style="color: #1a1a1a; font-size: 15px; line-height: 1.6;">Shipment <strong>${data.shipment_number}</strong> has been dispatched to <strong>${data.destination}</strong>.</p>
          <table style="width: 100%; font-size: 13px; color: #888; margin: 16px 0;">
            <tr><td style="padding: 6px 0;">Courier</td><td style="font-weight: 600; color: #1a1a1a;">${data.courier || "—"}</td></tr>
            <tr><td style="padding: 6px 0;">Tracking</td><td style="font-weight: 600; color: #1a1a1a;">${data.tracking || "—"}</td></tr>
            <tr><td style="padding: 6px 0;">ETA</td><td style="font-weight: 600; color: #1a1a1a;">${data.eta || "—"}</td></tr>
          </table>
        `),
      };
    case "low_stock":
      return {
        subject: `⚠ Low stock alert — ${data.item_name}`,
        html: base(`
          <p style="color: #c0392b; font-size: 15px; font-weight: 600;">${data.quantity === 0 ? "OUT OF STOCK" : "LOW STOCK ALERT"}</p>
          <p style="color: #1a1a1a; font-size: 15px; line-height: 1.6;"><strong>${data.item_name}</strong> has ${data.quantity} ${data.unit} remaining (reorder level: ${data.reorder_level}).</p>
          <p style="color: #888; font-size: 13px;">Log in to the admin portal to manage stock.</p>
        `),
      };
    default:
      return {
        subject: "Notification — Protea Botanicals",
        html: base(
          `<p style="color: #1a1a1a; font-size: 15px;">${data.message || "You have a new notification."}</p>`,
        ),
      };
  }
}

// ── BulkSMS sender ────────────────────────────────────────────────────────
async function sendBulkSMS(
  phone: string,
  message: string,
  apiKey: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // BulkSMS API v1
    const credentials = btoa(apiKey); // apiKey format: "username:password" base64 encoded
    const res = await fetch("https://api.bulksms.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify([
        {
          to: phone.startsWith("+") ? phone : `+27${phone.replace(/^0/, "")}`,
          body: message,
        },
      ]),
    });
    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: `BulkSMS error ${res.status}: ${err}` };
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Email sender stub (swap in Resend/SendGrid when ready) ────────────────
async function sendEmail(
  to: string,
  subject: string,
  html: string,
  _apiKey: string,
): Promise<{ success: boolean; error?: string }> {
  // ── RESEND (uncomment when ready) ────────────────────────────────────
  // const res = await fetch("https://api.resend.com/emails", {
  //   method: "POST",
  //   headers: { "Authorization": `Bearer ${_apiKey}`, "Content-Type": "application/json" },
  //   body: JSON.stringify({ from: "hello@proteabotanicals.co.za", to, subject, html }),
  // });
  // return res.ok ? { success: true } : { success: false, error: await res.text() };

  // ── SENDGRID (uncomment when ready) ──────────────────────────────────
  // const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
  //   method: "POST",
  //   headers: { "Authorization": `Bearer ${_apiKey}`, "Content-Type": "application/json" },
  //   body: JSON.stringify({ personalizations: [{ to: [{ email: to }] }], from: { email: "hello@proteabotanicals.co.za" }, subject, content: [{ type: "text/html", value: html }] }),
  // });
  // return res.ok ? { success: true } : { success: false, error: await res.text() };

  // ── STUB: log and return success (remove when provider connected) ─────
  console.log(`[EMAIL STUB] To: ${to} | Subject: ${subject}`);
  return { success: true };
}

// ── Main handler ──────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const bulkSmsKey = Deno.env.get("BULKSMS_API_KEY") || "";
    const emailKey = Deno.env.get("EMAIL_API_KEY") || "";

    const sb = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { type = "sms", trigger, recipient, data = {}, tenant_id } = body;

    if (!trigger || !recipient) {
      return new Response(
        JSON.stringify({ error: "trigger and recipient required" }),
        {
          status: 400,
          headers: { ...CORS, "Content-Type": "application/json" },
        },
      );
    }

    const results: Record<string, any> = {};

    // ── SMS ──────────────────────────────────────────────────────────────
    if ((type === "sms" || type === "both") && recipient.phone) {
      const message = buildSMS(trigger, { ...data, name: recipient.name });
      const result = await sendBulkSMS(recipient.phone, message, bulkSmsKey);
      results.sms = result;

      // Log to notification_log
      await sb.from("notification_log").insert({
        type: "sms",
        trigger,
        recipient: recipient.phone,
        message,
        status: result.success ? "sent" : "failed",
        error: result.error || null,
        metadata: { recipient, data },
        tenant_id: tenant_id || null,
      });
    }

    // ── Email ────────────────────────────────────────────────────────────
    if ((type === "email" || type === "both") && recipient.email) {
      const { subject, html } = buildEmailHTML(trigger, {
        ...data,
        heading: data.heading,
        name: recipient.name,
      });
      const result = await sendEmail(recipient.email, subject, html, emailKey);
      results.email = result;

      await sb.from("notification_log").insert({
        type: "email",
        trigger,
        recipient: recipient.email,
        message: subject,
        status: result.success ? "sent" : "failed",
        error: result.error || null,
        metadata: { recipient, data },
        tenant_id: tenant_id || null,
      });
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("send-notification error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
