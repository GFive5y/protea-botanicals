// src/services/notificationService.js
// WP9 — Notification Service
// Thin wrapper around the send-notification Edge Function.
// Import and call from anywhere in the app to fire notifications.
//
// Usage:
//   import { notify } from "../services/notificationService";
//   await notify.scanConfirmed({ phone: "+27...", name: "Steve" }, { points: 10, total_points: 820, product: "Distillate", batch: "PB-001-2026" });
//   await notify.tierUpgrade({ phone: "+27...", name: "Steve" }, { tier: "gold", points: 820 });
//   await notify.shipmentDispatched({ phone: "+27...", name: "Shop Name" }, { shipment_number: "SHP-...", destination: "...", courier: "...", tracking: "...", eta: "..." });
//   await notify.lowStock({ phone: ADMIN_PHONE, email: ADMIN_EMAIL }, { item_name: "...", quantity: 3, unit: "kg", reorder_level: 10 });
//   await notify.churnRisk({ phone: ADMIN_PHONE }, { customer_name: "...", last_active: "...", score: 30 });
//   await notify.newCustomer({ phone: ADMIN_PHONE }, { name: "...", phone: "...", channel: "direct" });

import { supabase } from "./supabaseClient";

const FUNCTION_URL = `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-notification`;

// Admin contact — set in .env or override here
const ADMIN_PHONE = process.env.REACT_APP_ADMIN_PHONE || "";
const ADMIN_EMAIL = process.env.REACT_APP_ADMIN_EMAIL || "";

async function send(type, trigger, recipient, data, tenant_id) {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const res = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {}),
      },
      body: JSON.stringify({ type, trigger, recipient, data, tenant_id }),
    });
    const json = await res.json();
    if (!res.ok) console.error(`notify.${trigger} failed:`, json);
    return json;
  } catch (err) {
    console.error(`notify.${trigger} error:`, err);
    return { ok: false, error: err.message };
  }
}

export const notify = {
  // ── Customer notifications ──────────────────────────────────────────────
  scanConfirmed: (recipient, data, tenant_id) =>
    send("sms", "scan_confirmed", recipient, data, tenant_id),

  tierUpgrade: (recipient, data, tenant_id) =>
    send("both", "tier_upgrade", recipient, data, tenant_id),

  // ── Retailer notifications ──────────────────────────────────────────────
  shipmentDispatched: (recipient, data, tenant_id) =>
    send("both", "shipment_dispatched", recipient, data, tenant_id),

  shipmentDelivered: (recipient, data, tenant_id) =>
    send("both", "shipment_delivered", recipient, data, tenant_id),

  // ── Admin notifications (fire + forget, don't await in critical paths) ──
  lowStock: (data, tenant_id) =>
    send(
      "both",
      "low_stock",
      { phone: ADMIN_PHONE, email: ADMIN_EMAIL, name: "Admin" },
      data,
      tenant_id,
    ),

  churnRisk: (data, tenant_id) =>
    send(
      "sms",
      "churn_risk",
      { phone: ADMIN_PHONE, name: "Admin" },
      data,
      tenant_id,
    ),

  newCustomer: (data, tenant_id) =>
    send(
      "sms",
      "new_customer",
      { phone: ADMIN_PHONE, name: "Admin" },
      data,
      tenant_id,
    ),

  // ── Raw send (custom) ───────────────────────────────────────────────────
  custom: (type, trigger, recipient, data, tenant_id) =>
    send(type, trigger, recipient, data, tenant_id),
};

export default notify;
