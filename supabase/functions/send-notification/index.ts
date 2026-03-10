// supabase/functions/send-notification/index.ts
// v2.0 — WP9: WhatsApp via Twilio (replaces BulkSMS stub)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function toWhatsAppNumber(phone: string): string {
  let clean = phone.replace(/\s+/g, "").replace(/-/g, "");
  if (clean.startsWith("whatsapp:")) return clean;
  if (clean.startsWith("0")) clean = `27${clean.slice(1)}`;
  if (!clean.startsWith("+")) clean = `+${clean}`;
  return `whatsapp:${clean}`;
}

function buildWhatsApp(trigger: string, data: Record<string, any>): string {
  switch (trigger) {
    case "scan_confirmed":
      return `✅ *Protea Botanicals*\nProduct verified! You earned *${data.points || 0} pts*.\nTotal: *${data.total_points || 0} pts*\n\nKeep scanning to unlock rewards.`;
    case "tier_upgrade":
      return `🎉 *Protea Botanicals*\nCongratulations ${data.name || ""}! You've reached *${(data.tier || "").toUpperCase()}* tier.`;
    case "shipment_dispatched":
      return `📦 *Protea Botanicals*\nShipment *${data.shipment_number}* dispatched to ${data.destination}.\n\nCourier: ${data.courier || "TBC"}\nTracking: ${data.tracking || "—"}\nETA: ${data.eta || "TBC"}`;
    case "shipment_delivered":
      return `✅ *Protea Botanicals*\nShipment *${data.shipment_number}* delivered to ${data.destination}.`;
    case "low_stock":
      return `⚠️ *Protea Botanicals — Stock Alert*\n${data.item_name} is ${data.quantity === 0 ? "*OUT OF STOCK*" : `low (*${data.quantity} ${data.unit}* remaining)`}.\nReorder level: ${data.reorder_level}\n\nAction required.`;
    case "churn_risk":
      return `🔔 *Protea Botanicals — Churn Alert*\nCustomer *${data.customer_name || data.customer_id}* flagged as churn risk.\nScore: ${data.score || 0}/100`;
    case "new_customer":
      return `👤 *Protea Botanicals — New Customer*\n${data.name || "Anonymous"}\n📞 ${data.phone || "—"}\nChannel: ${data.channel || "direct"}`;
    default:
      return data.message || "Notification from Protea Botanicals.";
  }
}

async function sendTwilioWhatsApp(
  toPhone: string, message: string, accountSid: string, authToken: string, fromNumber: string,
): Promise<{ success: boolean; sid?: string; error?: string }> {
  try {
    const to = toWhatsAppNumber(toPhone);
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const credentials = btoa(`${accountSid}:${authToken}`);
    const params = new URLSearchParams();
    params.append("From", fromNumber);
    params.append("To", to);
    params.append("Body", message);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${credentials}` },
      body: params.toString(),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: `Twilio ${res.status}: ${json.message || JSON.stringify(json)}` };
    return { success: true, sid: json.sid };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function sendEmail(to: string, subject: string, _html: string, _apiKey: string): Promise<{ success: boolean; error?: string }> {
  console.log(`[EMAIL STUB] To: ${to} | Subject: ${subject}`);
  return { success: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const twilioSid   = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
    const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
    const twilioFrom  = Deno.env.get("TWILIO_WHATSAPP_FROM") || "";
    const adminTo     = Deno.env.get("ADMIN_WHATSAPP_TO") || "";
    const emailKey    = Deno.env.get("EMAIL_API_KEY") || "";
    const sb = createClient(supabaseUrl, supabaseKey);
    const body = await req.json();
    const { type = "whatsapp", trigger, recipient, data = {}, tenant_id } = body;
    if (!trigger || !recipient) {
      return new Response(JSON.stringify({ error: "trigger and recipient required" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
    }
    const results: Record<string, any> = {};
    const ADMIN_TRIGGERS = ["low_stock", "churn_risk", "new_customer"];
    const isAdminTrigger = ADMIN_TRIGGERS.includes(trigger);
    const isWhatsApp = type === "whatsapp" || type === "sms" || type === "both";
    const targetPhone = isAdminTrigger ? adminTo : (recipient.phone ? toWhatsAppNumber(recipient.phone) : null);
    if (isWhatsApp && targetPhone && twilioSid && twilioToken && twilioFrom) {
      const message = buildWhatsApp(trigger, { ...data, name: recipient.name });
      const result = await sendTwilioWhatsApp(targetPhone, message, twilioSid, twilioToken, twilioFrom);
      results.whatsapp = result;
      await sb.from("notification_log").insert({ type: "whatsapp", trigger, recipient: targetPhone, message, status: result.success ? "sent" : "failed", error: result.error || null, metadata: { recipient, data, sid: result.sid }, tenant_id: tenant_id || null });
    } else if (isWhatsApp) {
      results.whatsapp = { success: false, error: `Missing: ${!twilioSid?"TWILIO_ACCOUNT_SID ":""}${!twilioToken?"TWILIO_AUTH_TOKEN ":""}${!twilioFrom?"TWILIO_WHATSAPP_FROM ":""}${!targetPhone?"no target phone":""}` };
    }
    if ((type === "email" || type === "both") && recipient.email) {
      const { subject, html } = { subject: "Notification — Protea Botanicals", html: "" };
      const result = await sendEmail(recipient.email, subject, html, emailKey);
      results.email = result;
    }
    return new Response(JSON.stringify({ ok: true, results }), { headers: { ...CORS, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[send-notification] error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});
