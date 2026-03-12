// scanService.js v7.3 — Protea Botanicals — March 2026
// ============================================================================
// v7.3: getScanGeoAnalytics rewritten to query scan_logs (not legacy scans table)
//   - queries scan_logs with scanned_at, scan_outcome, qr_type, ip_province,
//     ip_city, gps_lat, gps_lng, location_source, device_type, browser
//   - flagged scans derived from scan_outcome (limit_reached/cooldown/already_claimed)
//   - firstScans = scan_outcome === 'points_awarded'
//   - byQrType breakdown added (powers GeoAnalyticsDashboard)
//   - returns null on error (callers must handle null)
//
// v7.2: First-scan-only enforcement UI (DEC-026)
//   - already_claimed check now returns { success:true, authentic:true, rescan:true }
//   - batch data fetched BEFORE returning so ScanResult has product details
//   - userProfile fetched for rescan path so tier/points display correctly
//   - Red counterfeit page reserved for HMAC failures only
//
// v7.1: update_user_activity RPC call removed (404 — RPC not in DB)
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
 *   3. DB lookup to find the product + batch
 *   4. If claimed=true → return SUCCESSFUL rescan result (v7.2 change)
 *      Red page is reserved for HMAC failures only (DEC-026)
 *   5. Claim product, award points, record scan, geo enrich
 *
 * @param {string} qrCode  - raw string from QR scanner (may include signature)
 * @param {string} [source='direct'] - scan origin
 * @returns {Object} { success, authentic, rescan?, points, pointsEarned,
 *                     product, batch, error, errorType, isFirstScan, scanId,
 *                     anomalyFlags, userProfile, requiresGPSPrompt,
 *                     isLegacy, hmacVerified }
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

    // ── 2. HMAC verification ───────────────────────────────────
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

    const isLegacy = hmacResult.is_legacy || false;
    const hmacVerified = !isLegacy;

    // For DB lookup: use full qrCode as-is
    // (products table stores the full signed string)
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

    // v7.2: already_claimed → return SUCCESSFUL rescan result (DEC-026)
    // The product IS authentic (HMAC passed). Returning red/error here was wrong.
    if (product.claimed) {
      // Fetch user profile so the rescan page can show tier / points
      const { data: rescanProfile } = await supabase
        .from("user_profiles")
        .select(
          "geolocation_consent, province, city, loyalty_tier, loyalty_points, profile_complete",
        )
        .eq("id", user.id)
        .single();

      return {
        success: true,
        authentic: true,
        rescan: true,
        isFirstScan: false,
        pointsEarned: 0,
        product,
        batch: product.batches,
        userProfile: rescanProfile || null,
        anomalyFlags: [],
        isLegacy,
        hmacVerified,
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

    // ── 9. Insert scan record ──────────────────────────────────
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
        is_legacy: isLegacy,
      })
      .select("id")
      .single();

    if (scanErr) console.error("Scan record error:", scanErr);
    const scanId = scanRecord?.id || null;

    // ── 10. Get user profile ───────────────────────────────────
    const { data: profile } = await supabase
      .from("user_profiles")
      .select(
        "geolocation_consent, province, city, loyalty_tier, loyalty_points, profile_complete",
      )
      .eq("id", user.id)
      .single();

    // ── 11. Geo enrichment (async, non-blocking) ───────────────
    enrichAndStoreScanGeo(
      scanId,
      user.id,
      profile?.geolocation_consent || false,
    );

    // ── 12. Return ─────────────────────────────────────────────
    return {
      success: true,
      authentic: true,
      rescan: false,
      points: anomalyFlags.length === 0 ? pointsToAward : 0,
      pointsEarned: anomalyFlags.length === 0 ? pointsToAward : 0,
      product,
      batch: product.batches,
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
// NOTE: intentionally still queries legacy `scans` table — this is for the
// customer-facing Loyalty page scan history (pre-WP-M scans).
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
// v2.0 — Queries scan_logs (not legacy scans table)
// Powers GeoAnalyticsDashboard: province/city heatmap, device split,
// GPS consent rate, QR type breakdown, demand gap analysis.
export async function getScanGeoAnalytics(days = 30) {
  try {
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const { data: rows, error } = await supabase
      .from("scan_logs")
      .select(
        "id, scanned_at, scan_outcome, qr_type, campaign_name, " +
          "ip_province, ip_city, ip_country, ip_lat, ip_lng, " +
          "gps_lat, gps_lng, location_source, " +
          "device_type, browser, user_id, points_awarded, qr_code_id",
      )
      .gte("scanned_at", since)
      .order("scanned_at", { ascending: false });

    if (error) {
      console.error("[scanService] getScanGeoAnalytics error:", error);
      return null;
    }

    const all = rows || [];
    const total = all.length;

    // ── First scans (points actually awarded) ──────────────────────────────
    const firstScans = all.filter(
      (r) => r.scan_outcome === "points_awarded",
    ).length;

    // ── GPS consent rate ────────────────────────────────────────────────────
    const gpsRows = all.filter((r) => r.location_source === "gps");
    const gpsConsent =
      total > 0 ? Math.round((gpsRows.length / total) * 100) : 0;

    // ── Flagged / anomaly scans ─────────────────────────────────────────────
    const flaggedOutcomes = ["limit_reached", "cooldown", "already_claimed"];
    const flagged = all.filter((r) =>
      flaggedOutcomes.includes(r.scan_outcome),
    ).length;

    // ── By Province ─────────────────────────────────────────────────────────
    const byProvince = {};
    all.forEach((r) => {
      if (r.ip_province) {
        byProvince[r.ip_province] = (byProvince[r.ip_province] || 0) + 1;
      }
    });

    // ── By City ─────────────────────────────────────────────────────────────
    const byCity = {};
    all.forEach((r) => {
      if (r.ip_city) {
        byCity[r.ip_city] = (byCity[r.ip_city] || 0) + 1;
      }
    });

    // ── By Device ───────────────────────────────────────────────────────────
    const byDevice = { mobile: 0, desktop: 0, tablet: 0 };
    all.forEach((r) => {
      const dt = (r.device_type || "").toLowerCase();
      if (dt === "mobile") byDevice.mobile++;
      else if (dt === "tablet") byDevice.tablet++;
      else if (dt === "desktop") byDevice.desktop++;
      else byDevice.mobile++; // fallback: mobile
    });

    // ── By QR Type ──────────────────────────────────────────────────────────
    const byQrType = {};
    all.forEach((r) => {
      const t = r.qr_type || "unknown";
      byQrType[t] = (byQrType[t] || 0) + 1;
    });

    // ── Top Province / City ─────────────────────────────────────────────────
    const topProvince =
      Object.entries(byProvince).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const topCity =
      Object.entries(byCity).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    return {
      total,
      firstScans,
      gpsConsent,
      flagged,
      byProvince,
      byCity,
      byDevice,
      byQrType,
      topProvince,
      topCity,
      raw: all, // full rows — used for location_source quality chart
    };
  } catch (err) {
    console.error("[scanService] getScanGeoAnalytics exception:", err);
    return null;
  }
}
