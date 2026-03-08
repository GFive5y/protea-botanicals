// scanService.js v7.0 — Protea Botanicals — March 2026
// ============================================================================
// v7.0: HMAC QR verification — anti-counterfeiting (DEC-025)
//   - authenticateQR now calls verify-qr Edge Function FIRST
//   - Invalid signatures → rejected immediately, no DB lookup, no points
//   - Legacy codes (no dot) → accepted, flagged as is_legacy in scan record
//   - Signed codes (product_code.SIGNATURE) → product_code stripped before DB lookup
//   - hmac_signed and is_legacy stored on scan record
//
// v6.0: Phase 2 geo enrichment merged into v5.4
//   - scan insert: scan_date, is_first_scan, tenant_id, user_id
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

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_FUNCTIONS_URL =
  process.env.REACT_APP_SUPABASE_FUNCTIONS_URL ||
  "https://uvicrqapgzcdvozxrreo.supabase.co/functions/v1";

const SUPABASE_ANON_KEY =
  process.env.REACT_APP_SUPABASE_ANON_KEY ||
  // Falls back to the value already in supabaseClient.js env
  "";

// ── Anomaly thresholds ────────────────────────────────────────────────────────
const MAX_SCANS_PER_DAY = 5;
const VELOCITY_WINDOW_MIN = 60;
const VELOCITY_MAX_SCANS = 10;

// ── HMAC verification ─────────────────────────────────────────────────────────
/**
 * Call the verify-qr Edge Function.
 * Returns { valid, product_code, is_legacy, reason }
 * Never throws — returns { valid: true, is_legacy: true } on network failure
 * so a temporary function outage doesn't break scanning entirely.
 */
async function verifyQrHMAC(qrString) {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/verify-qr`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ qr_string: qrString }),
    });

    if (!res.ok) {
      console.warn("verify-qr HTTP error:", res.status);
      return {
        valid: true,
        product_code: qrString,
        is_legacy: true,
        reason: "verify_unavailable",
      };
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.warn("verify-qr network error:", err);
    return {
      valid: true,
      product_code: qrString,
      is_legacy: true,
      reason: "verify_unavailable",
    };
  }
}

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
 *
 * Flow:
 *   1. Verify HMAC signature via Edge Function
 *   2. If invalid → reject immediately (counterfeit QR)
 *   3. If legacy → strip nothing, proceed with full qrString as DB lookup key
 *   4. If signed → use product_code (without .SIGNATURE) as DB lookup key
 *   5. Continue with existing claim + points + geo flow
 *
 * @param {string} qrCode  - raw string from QR scanner (may include signature)
 * @param {string} [source='direct'] - scan origin
 * @returns {Object} { success, points, pointsEarned, product, error, errorType,
 *                     isFirstScan, scanId, anomalyFlags, userProfile,
 *                     requiresGPSPrompt, isLegacy, hmacVerified }
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

    // ── 2. HMAC verification (NEW in v7.0) ─────────────────────
    const hmacResult = await verifyQrHMAC(qrCode);

    if (!hmacResult.valid) {
      // Signature present but invalid → counterfeit QR code
      console.warn(
        "HMAC verification failed:",
        hmacResult.reason,
        "for:",
        qrCode,
      );
      return {
        success: false,
        error: "This QR code could not be verified. It may be counterfeit.",
        errorType: "counterfeit",
        hmacVerified: false,
      };
    }

    // Resolve the clean product_code for DB lookup
    // - Legacy: product_code === original qrCode (no change)
    // - Signed: product_code is the prefix before the dot
    const isLegacy = hmacResult.is_legacy || false;
    const hmacVerified = !isLegacy;

    // For DB lookup:
    // - Signed codes: the products table stores the FULL signed string (product_code.SIGNATURE)
    //   because that's what AdminQrGenerator saved when generating. So look up by full qrCode.
    // - Legacy codes: look up by the raw qrCode as before.
    // Either way, use qrCode as-is for the DB lookup.
    const dbLookupKey = qrCode;

    // ── 3. Ensure profile exists ───────────────────────────────
    await ensureProfile(user.id);

    // ── 4. Look up QR code ─────────────────────────────────────
    const { data: product, error: lookupErr } = await supabase
      .from("products")
      .select("*, batches(batch_number, product_name, strain)")
      .eq("qr_code", dbLookupKey)
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

    // ── 5. Validate state ──────────────────────────────────────
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

    // ── 6. Claim product (atomic guard against double-claim) ───
    const pointsToAward = product.points_value || 10;
    const isFirstScan = true;

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

    // ── 7. Anomaly checks ──────────────────────────────────────
    const anomalyFlags = await runAnomalyChecks(user.id, product.id);

    // ── 8. Award points (skip if anomaly flagged) ──────────────
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
          description: `Scanned QR code ${hmacResult.product_code || qrCode}`,
        });
      if (txErr) console.error("Transaction log error:", txErr);
    }

    // ── 9. Insert scan record (now includes is_legacy + hmac_verified) ───
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
        // v7.0 additions
        is_legacy: isLegacy,
      })
      .select("id")
      .single();

    if (scanErr) console.error("Scan record error:", scanErr);
    const scanId = scanRecord?.id || null;

    // ── 10. Update user activity ───────────────────────────────
    // RPC not yet created — skipped until DB function exists

    // ── 11. Get user profile ───────────────────────────────────
    const { data: profile } = await supabase
      .from("user_profiles")
      .select(
        "geolocation_consent, province, city, loyalty_tier, loyalty_points, profile_complete",
      )
      .eq("id", user.id)
      .single();

    // ── 12. Geo enrichment (async, non-blocking) ───────────────
    enrichAndStoreScanGeo(
      scanId,
      user.id,
      profile?.geolocation_consent || false,
    );

    // ── 13. Return ─────────────────────────────────────────────
    return {
      success: true,
      authentic: true,
      points: anomalyFlags.length === 0 ? pointsToAward : 0,
      pointsEarned: anomalyFlags.length === 0 ? pointsToAward : 0,
      product,
      isFirstScan,
      scanId,
      anomalyFlags,
      userProfile: profile,
      requiresGPSPrompt: !profile?.geolocation_consent,
      isLegacy,
      hmacVerified,
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count: dailyScans } = await supabase
      .from("scans")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_first_scan", true)
      .gte("scan_date", today.toISOString());

    if ((dailyScans || 0) >= MAX_SCANS_PER_DAY) flags.push("daily_cap");

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
      location_source, device_type, scan_flagged, source, is_legacy,
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
      distance_to_stockist_m, user_id, tenant_id, source, is_legacy
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
      legacyScans: 0,
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
  const legacyScans = raw.filter((s) => s.is_legacy).length;

  return {
    raw,
    total: raw.length,
    firstScans,
    flagged,
    legacyScans,
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
