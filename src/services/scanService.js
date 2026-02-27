// scanService.js v5.4 FINAL — Protea Botanicals — February 27 2026
// ============================================================================
// v5.4: Added source tracking (Step 5 from paused work queue)
//   - authenticateQR() now accepts optional `source` parameter (default: 'direct')
//   - After claiming product, inserts a row into `scans` table with source column
//   - Enables analytics: which QR type (promo, loyalty, verify, direct) drove the scan
//   - DB column `scans.source` added in v10.0 migration (ALTER TABLE scans ADD source TEXT)
//
// v5.3: THIS FILE FIXES THE LOYALTY RECENT ACTIVITY BUG
//   - transaction_date: new Date().toISOString()  ← correct column name
//   - transaction_type: 'earned'                  ← matches CHECK constraint
// ============================================================================

import { supabase } from "./supabaseClient";

/**
 * Ensure user has a profile row in user_profiles.
 * Creates one with role='customer' and loyalty_points=0 if missing.
 */
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

/**
 * Authenticate (claim) a QR code.
 * @param {string} qrCode - e.g. "PB-001-2026-0001"
 * @param {string} [source='direct'] - How the user reached this scan (e.g. 'promo', 'loyalty', 'verify', 'direct')
 * @returns {Object} { success, points, pointsEarned, product, error, errorType }
 */
export async function authenticateQR(qrCode, source = "direct") {
  try {
    // 1. Check auth
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

    // 2. Ensure profile exists
    await ensureProfile(user.id);

    // 3. Look up QR code
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

    // 4. Validate state
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

    // 5. Claim the product (atomic guard against double-claim)
    const pointsToAward = product.points_value || 10;

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

    // 6. Award points via RPC
    const { error: rpcErr } = await supabase.rpc("increment_loyalty_points", {
      p_user_id: user.id,
      p_points: pointsToAward,
    });
    if (rpcErr) console.error("RPC increment_loyalty_points error:", rpcErr);

    // 7. Log transaction — THE FIX (v5.3)
    // CRITICAL: transaction_date (not created_at), 'earned' (not 'scan_reward')
    const { error: txErr } = await supabase
      .from("loyalty_transactions")
      .insert({
        user_id: user.id,
        points: pointsToAward,
        transaction_type: "earned", // ✅ valid CHECK value
        transaction_date: new Date().toISOString(), // ✅ correct column
        description: `Scanned QR code ${qrCode}`,
      });
    if (txErr) console.error("Transaction log error:", txErr);

    // 7b. Record scan with source tracking (v5.4)
    // scans.source column added in v10.0 migration, DEFAULT 'direct'
    // Note: no scanned_at column — timestamp handled by DB default (created_at)
    const { error: scanErr } = await supabase.from("scans").insert({
      product_id: product.id,
      user_id: user.id,
      source: source || "direct",
    });
    if (scanErr) console.error("Scan record error:", scanErr);

    // 8. Return success
    return {
      success: true,
      points: pointsToAward,
      pointsEarned: pointsToAward, // Alias for ScanResult.js compatibility
      product,
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
