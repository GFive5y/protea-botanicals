// scanService.js v6.0 — Protea Botanicals — March 2026
// ============================================================================
// v6.0: Phase 2 geo enrichment merged into v5.4
//   - scan insert now includes: scan_date, is_first_scan, tenant_id, user_id
//   - geo enrichment runs async after scan (never blocks user)
//   - anomaly detection: daily cap (5/day) + velocity check (10/60min)
//   - getUserScanHistory() — for Loyalty page scan log
//   - getScanGeoAnalytics() — for HQ GeoAnalyticsDashboard
//
// v5.4: Source tracking (source column on scans)
// v5.3: Fixed transaction_date column + 'earned' transaction_type
// ============================================================================

import { supabase } from "./supabaseClient";
import {
  enrichScanGeo,
  updateScanWithGeo,
  enrichUserProfileGeo,
} from "./geoService";

// ── Anomaly thresholds ────────────────────────────────────────────────────────
const MAX_SCANS_PER_DAY = 5; // max unique products per user per day
const VELOCITY_WINDOW_MIN = 60; // minutes
const VELOCITY_MAX_SCANS = 10; // max scans of same product in window

// ── ensureProfile ─────────────────────────────────────────────────────────────
async function ensureProfile(userId) {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("id", userId)
    .single();

  if (error && error.code === "PGRST116") {
    const { error: insertErr } = await supabase.from("user_profiles").insert({
      id: userId,
      role: "customer",
      loyalty_points: 0,
    });
    if (insertErr) console.error("ensureProfile insert error:", insertErr);
  } else if (error) {
    console.error("ensureProfile select error:", error);
  }
}

// ── authenticateQR ────────────────────────────────────────────────────────────
/**
 * Authenticate (claim) a QR code.
 * @param {string} qrCode  - e.g. "PB-001-2026-0001"
 * @param {string} [source='direct'] - scan origin: 'promo'|'loyalty'|'verify'|'direct'
 * @returns {Object} { success, points, pointsEarned, product, error, errorType,
 *                     isFirstScan, scanId, anomalyFlags, userProfile, requiresGPSPrompt }
 */
export async function authenticateQR(qrCode, source = "direct") {
  try {
    // ── 1. Check auth ──────────────────────────────────────────
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return {
        success: false,
        error: "Please sign in to scan QR codes",
        errorType: "auth",
      };
    }

    // ── 2. Ensure profile exists ───────────────────────────────
    await ensureProfile(user.id);

    // ── 3. Look up QR code ─────────────────────────────────────
    const { data: product, error: lookupErr } = await supabase
      .from("products")
      .select("*, batches(batch_number, product_name, strain)")
      .eq("qr_code", qrCode)
      .single();

    if (lookupErr) {
      if (lookupErr.code === "PGRST116") {
        return {
          success: false,
          error: "Invalid or fake QR Code",
          errorType: "not_found",
        };
      }
      console.error("QR lookup error:", lookupErr);
      return {
        success: false,
        error: "Could not verify QR code. Please try again.",
        errorType: lookupErr.message?.includes("fetch")
          ? "network"
          : "permission",
      };
    }

    if (!product) {
      return {
        success: false,
        error: "Invalid or fake QR Code",
        errorType: "not_found",
      };
    }

    // ── 4. Validate state ──────────────────────────────────────
    if (product.claimed) {
      return {
        success: false,
        error: "This QR code has already been claimed",
        errorType: "already_claimed",
        product,
      };
    }
    if (product.is_active === false) {
      return {
        success: false,
        error: "This QR code has been revoked",
        errorType: "inactive",
        product,
      };
    }
    if (product.expires_at && new Date(product.expires_at) < new Date()) {
      return {
        success: false,
        error: "This QR code has expired",
        errorType: "expired",
        product,
      };
    }

    // ── 5. Claim product (atomic guard against double-claim) ───
    const pointsToAward = product.points_value || 10;
    const isFirstScan = true; // always true — validated above via claimed=false check

    const { error: claimErr } = await supabase
      .from("products")
      .update({
        claimed: true,
        claimed_by: user.id,
        claimed_at: new Date().toISOString(),
        status: "claimed",
      })
      .eq("id", product.id)
      .eq("claimed", false);

    if (claimErr) {
      console.error("Claim update error:", claimErr);
      return {
        success: false,
        error: "Failed to claim QR code. Please try again.",
        errorType: "permission",
      };
    }

    // ── 6. Anomaly checks ──────────────────────────────────────
    const anomalyFlags = await runAnomalyChecks(user.id, product.id);

    // ── 7. Award points (skip if anomaly flagged) ──────────────
    if (anomalyFlags.length === 0) {
      const { error: rpcErr } = await supabase.rpc("increment_loyalty_points", {
        p_user_id: user.id,
        p_points: pointsToAward,
      });
      if (rpcErr) console.error("RPC increment_loyalty_points error:", rpcErr);

      const { error: txErr } = await supabase
        .from("loyalty_transactions")
        .insert({
          user_id: user.id,
          points: pointsToAward,
          transaction_type: "earned",
          transaction_date: new Date().toISOString(),
          description: `Scanned QR code ${qrCode}`,
        });
      if (txErr) console.error("Transaction log error:", txErr);
    }

    // ── 8. Insert scan record ──────────────────────────────────
    // source (v5.4) + scan_date, is_first_scan, tenant_id, scan_flagged (v6.0)
    const { data: scanRecord, error: scanErr } = await supabase
      .from("scans")
      .insert({
        product_id: product.id,
        user_id: user.id,
        source: source || "direct",
        scan_date: new Date().toISOString(),
        is_first_scan: isFirstScan,
        scan_flagged: anomalyFlags.length > 0,
        flag_reason: anomalyFlags.length > 0 ? anomalyFlags.join(", ") : null,
        tenant_id: product.tenant_id || null,
      })
      .select("id")
      .single();

    if (scanErr) console.error("Scan record error:", scanErr);
    const scanId = scanRecord?.id || null;

    // ── 9. Update user activity (non-blocking) ─────────────────
    supabase
      .rpc("update_user_activity", { p_user_id: user.id })
      .catch(() => {});

    // ── 10. Get user profile (GPS consent + loyalty display) ───
    const { data: profile } = await supabase
      .from("user_profiles")
      .select(
        "geolocation_consent, province, city, loyalty_tier, loyalty_points, profile_complete",
      )
      .eq("id", user.id)
      .single();

    // ── 11. Geo enrichment — fully async, never blocks ─────────
    enrichAndStoreScanGeo(
      scanId,
      user.id,
      profile?.geolocation_consent || false,
    );

    // ── 12. Return ─────────────────────────────────────────────
    return {
      success: true,
      points: anomalyFlags.length === 0 ? pointsToAward : 0,
      pointsEarned: anomalyFlags.length === 0 ? pointsToAward : 0,
      product,
      isFirstScan,
      scanId,
      anomalyFlags,
      userProfile: profile,
      requiresGPSPrompt: !profile?.geolocation_consent,
    };
  } catch (err) {
    console.error("authenticateQR unexpected error:", err);
    return {
      success: false,
      error: "Network error. Please check your connection.",
      errorType: "network",
    };
  }
}

// ── Background geo enrichment ─────────────────────────────────────────────────
async function enrichAndStoreScanGeo(scanId, userId, hasGPSConsent) {
  try {
    const geoData = await enrichScanGeo({ hasGPSConsent });
    if (scanId) await updateScanWithGeo(scanId, geoData);
    if (userId) await enrichUserProfileGeo(userId, geoData);
  } catch {
    // Non-blocking — geo failure never surfaces to user
  }
}

// ── Anomaly detection ─────────────────────────────────────────────────────────
async function runAnomalyChecks(userId, productId) {
  const flags = [];
  try {
    // Check 1: daily cap
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count: dailyScans } = await supabase
      .from("scans")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_first_scan", true)
      .gte("scan_date", today.toISOString());

    if ((dailyScans || 0) >= MAX_SCANS_PER_DAY) flags.push("daily_cap");

    // Check 2: velocity
    const windowStart = new Date(Date.now() - VELOCITY_WINDOW_MIN * 60 * 1000);

    const { count: velocityCount } = await supabase
      .from("scans")
      .select("id", { count: "exact", head: true })
      .eq("product_id", productId)
      .gte("scan_date", windowStart.toISOString());

    if ((velocityCount || 0) >= VELOCITY_MAX_SCANS) flags.push("velocity");
  } catch {
    // Non-critical
  }
  return flags;
}

// ── getUserScanHistory ────────────────────────────────────────────────────────
export async function getUserScanHistory(userId, limit = 20) {
  const { data, error } = await supabase
    .from("scans")
    .select(
      `
      id, scan_date, is_first_scan, ip_city, ip_province,
      location_source, device_type, scan_flagged, source,
      nearest_stockist_id,
      products ( id, qr_code, batches ( batch_number, product_name ) )
    `,
    )
    .eq("user_id", userId)
    .order("scan_date", { ascending: false })
    .limit(limit);

  return error ? [] : data || [];
}

// ── getScanGeoAnalytics ───────────────────────────────────────────────────────
export async function getScanGeoAnalytics(days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("scans")
    .select(
      `
      id, scan_date, ip_city, ip_province, location_source,
      device_type, is_first_scan, scan_flagged, nearest_stockist_id,
      distance_to_stockist_m, user_id, tenant_id, source
    `,
    )
    .gte("scan_date", since)
    .order("scan_date", { ascending: false });

  if (error)
    return {
      raw: [],
      total: 0,
      firstScans: 0,
      flagged: 0,
      gpsConsent: 0,
      byProvince: {},
      byCity: {},
      byDevice: {},
      byStockist: {},
      bySource: {},
      topProvince: "—",
      topCity: "—",
    };

  const raw = data || [];

  const byProvince = raw.reduce((acc, s) => {
    const p = s.ip_province || "Unknown";
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {});
  const byCity = raw.reduce((acc, s) => {
    const c = s.ip_city || "Unknown";
    acc[c] = (acc[c] || 0) + 1;
    return acc;
  }, {});
  const byDevice = raw.reduce((acc, s) => {
    const d = s.device_type || "unknown";
    acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {});
  const byStockist = raw.reduce((acc, s) => {
    if (s.nearest_stockist_id) {
      acc[s.nearest_stockist_id] = (acc[s.nearest_stockist_id] || 0) + 1;
    }
    return acc;
  }, {});
  const bySource = raw.reduce((acc, s) => {
    const src = s.source || "direct";
    acc[src] = (acc[src] || 0) + 1;
    return acc;
  }, {});

  const gpsCount = raw.filter((s) => s.location_source === "gps").length;
  const flagged = raw.filter((s) => s.scan_flagged).length;
  const firstScans = raw.filter((s) => s.is_first_scan).length;

  return {
    raw,
    total: raw.length,
    firstScans,
    flagged,
    gpsConsent: raw.length ? Math.round((gpsCount / raw.length) * 100) : 0,
    byProvince,
    byCity,
    byDevice,
    byStockist,
    bySource,
    topProvince:
      Object.entries(byProvince).sort((a, b) => b[1] - a[1])[0]?.[0] || "—",
    topCity: Object.entries(byCity).sort((a, b) => b[1] - a[1])[0]?.[0] || "—",
  };
}
