// src/services/geoService.js v1.0
// Phase 2: Geo-location enrichment service
// Handles: IP geolocation, GPS consent, nearest stockist calculation,
//          device fingerprinting, province/city normalisation.
// All geo runs AFTER the scan result is shown — never blocks UX.

import { supabase } from "./supabaseClient";

// ── Constants ─────────────────────────────────────────────────────────────────

// Free IP geo API — no key required, 1000 req/day limit on free tier
// Upgrade to ipstack.com ($10/mo) for production volume
const IP_GEO_API = "https://ipapi.co/json/";

// Haversine formula constants
const EARTH_RADIUS_M = 6371000;

// SA province normalisation map
const PROVINCE_MAP = {
  gauteng: "Gauteng",
  "western cape": "Western Cape",
  "kwazulu-natal": "KwaZulu-Natal",
  "kwazulu natal": "KwaZulu-Natal",
  "eastern cape": "Eastern Cape",
  limpopo: "Limpopo",
  mpumalanga: "Mpumalanga",
  "north west": "North West",
  "free state": "Free State",
  "northern cape": "Northern Cape",
};

// ── Haversine distance calculation ───────────────────────────────────────────

/**
 * Calculate distance in metres between two lat/lng points.
 */
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(
    EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)),
  );
}

// ── IP Geolocation ────────────────────────────────────────────────────────────

/**
 * Get approximate location from IP address.
 * Returns { lat, lng, city, province, country, source: 'ip' }
 * Falls back gracefully — never throws.
 */
export async function getIPLocation() {
  try {
    const res = await fetch(IP_GEO_API, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;

    const rawProvince = (data.region || "").toLowerCase();
    const province = PROVINCE_MAP[rawProvince] || data.region || null;

    return {
      lat: data.latitude || null,
      lng: data.longitude || null,
      city: data.city || null,
      province,
      country: data.country_code || "ZA",
      source: "ip",
    };
  } catch {
    return null;
  }
}

// ── GPS Location (with consent) ───────────────────────────────────────────────

/**
 * Request GPS permission from the browser.
 * Returns { lat, lng, accuracy, source: 'gps' } or null if denied/unavailable.
 * Use this ONLY after showing the scan result — timing is crucial for consent UX.
 */
export function requestGPSLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          source: "gps",
        });
      },
      () => resolve(null),
      { timeout: 8000, maximumAge: 60000, enableHighAccuracy: false },
    );
  });
}

// ── Device Fingerprint ────────────────────────────────────────────────────────

/**
 * Build a lightweight device identifier.
 * Not perfect but adds friction to multi-account farming.
 */
export function getDeviceInfo() {
  const ua = navigator.userAgent;
  const isMobile = /Mobi|Android/i.test(ua);
  const isTablet = /Tablet|iPad/i.test(ua);
  const deviceType = isTablet ? "tablet" : isMobile ? "mobile" : "desktop";

  let browser = "unknown";
  if (/Chrome/i.test(ua) && !/Edge|OPR/i.test(ua)) browser = "chrome";
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = "safari";
  else if (/Firefox/i.test(ua)) browser = "firefox";
  else if (/Edge/i.test(ua)) browser = "edge";
  else if (/OPR/i.test(ua)) browser = "opera";

  let os = "unknown";
  if (/Android/i.test(ua)) os = "android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "ios";
  else if (/Windows/i.test(ua)) os = "windows";
  else if (/Mac/i.test(ua)) os = "macos";
  else if (/Linux/i.test(ua)) os = "linux";

  return { deviceType, browser, os };
}

// ── Nearest Stockist ──────────────────────────────────────────────────────────

/**
 * Find the nearest active shop tenant to a given lat/lng.
 * Fetches stockist list from Supabase tenants table.
 * Returns { tenant_id, name, distance_m, city, province } or null.
 */
export async function findNearestStockist(lat, lng) {
  if (!lat || !lng) return null;

  try {
    const { data: stockists, error } = await supabase
      .from("tenants")
      .select(
        "id, name, location_lat, location_lng, location_city, location_province",
      )
      .eq("type", "shop")
      .eq("is_active", true)
      .not("location_lat", "is", null)
      .not("location_lng", "is", null);

    if (error || !stockists?.length) return null;

    let nearest = null;
    let minDist = Infinity;

    for (const s of stockists) {
      const dist = haversineDistance(lat, lng, s.location_lat, s.location_lng);
      if (dist < minDist) {
        minDist = dist;
        nearest = { ...s, distance_m: dist };
      }
    }

    return nearest;
  } catch {
    return null;
  }
}

// ── Full Geo Enrichment Pipeline ──────────────────────────────────────────────

/**
 * Run the full geo enrichment pipeline for a scan event.
 * Returns enriched geo object to be stored alongside the scan record.
 *
 * @param {object} opts
 * @param {boolean} opts.hasGPSConsent - whether user has previously consented to GPS
 * @returns {object} geoData
 */
export async function enrichScanGeo({ hasGPSConsent = false } = {}) {
  const device = getDeviceInfo();

  // Always get IP location (no consent required, city-level only)
  const ipGeo = await getIPLocation();

  // GPS: only if user previously consented (don't prompt here — prompt in UI)
  let gpsGeo = null;
  if (hasGPSConsent) {
    gpsGeo = await requestGPSLocation();
  }

  // Use GPS if available, fall back to IP
  const bestLat = gpsGeo?.lat ?? ipGeo?.lat ?? null;
  const bestLng = gpsGeo?.lng ?? ipGeo?.lng ?? null;
  const locationSource = gpsGeo ? "gps" : ipGeo ? "ip" : "none";

  // Find nearest stockist
  const stockist = bestLat ? await findNearestStockist(bestLat, bestLng) : null;

  return {
    gps_lat: gpsGeo?.lat ?? null,
    gps_lng: gpsGeo?.lng ?? null,
    ip_lat: ipGeo?.lat ?? null,
    ip_lng: ipGeo?.lng ?? null,
    ip_city: ipGeo?.city ?? null,
    ip_province: ipGeo?.province ?? null,
    ip_country: ipGeo?.country ?? "ZA",
    location_source: locationSource,
    nearest_stockist_id: stockist?.id ?? null,
    distance_to_stockist_m: stockist?.distance_m ?? null,
    device_type: device.deviceType,
    browser: device.browser,
    os: device.os,
    // Return stockist details for UI display (not stored in DB directly)
    _stockist: stockist,
    _city: gpsGeo ? null : ipGeo?.city,
    _province: gpsGeo ? null : ipGeo?.province,
  };
}

// ── Update scan record with geo data ─────────────────────────────────────────

/**
 * Write geo enrichment data back to the scans table.
 * Called after enrichScanGeo() completes.
 */
export async function updateScanWithGeo(scanId, geoData) {
  if (!scanId) return;
  const { _stockist, _city, _province, ...dbFields } = geoData;
  try {
    await supabase.from("scans").update(dbFields).eq("id", scanId);
  } catch {
    // Non-blocking — don't surface geo errors to user
  }
}

// ── Update user profile with geo data (first scan only) ──────────────────────

/**
 * Enrich user_profile with location if province/city not already set.
 * Only runs if user hasn't provided this info themselves.
 */
export async function enrichUserProfileGeo(userId, geoData) {
  if (!userId) return;
  try {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("province, city")
      .eq("id", userId)
      .single();

    const updates = {};
    if (!profile?.province && geoData.ip_province)
      updates.province = geoData.ip_province;
    if (!profile?.city && geoData.ip_city) updates.city = geoData.ip_city;
    if (Object.keys(updates).length > 0) {
      await supabase.from("user_profiles").update(updates).eq("id", userId);
    }
  } catch {
    // Non-blocking
  }
}

// ── Save GPS consent preference ───────────────────────────────────────────────

export async function saveGPSConsent(userId, consented) {
  if (!userId) return;
  await supabase
    .from("user_profiles")
    .update({ geolocation_consent: consented })
    .eq("id", userId);
}

// ── Check profile completeness ────────────────────────────────────────────────

/**
 * Returns { percent, missing, isComplete }
 */
export function checkProfileCompleteness(profile) {
  const fields = [
    { key: "full_name", label: "Full name" },
    { key: "date_of_birth", label: "Date of birth" },
    { key: "province", label: "Province" },
    { key: "preferred_type", label: "Preferred strain type" },
    { key: "how_heard", label: "How you heard about us" },
    { key: "phone", label: "Phone number" },
    { key: "marketing_opt_in", label: "Communication preferences" },
  ];

  const filled = fields.filter((f) => {
    const v = profile?.[f.key];
    return v !== null && v !== undefined && v !== "" && v !== false;
  });

  const percent = Math.round((filled.length / fields.length) * 100);
  const missing = fields.filter((f) => {
    const v = profile?.[f.key];
    return v === null || v === undefined || v === "" || v === false;
  });

  return {
    percent,
    missing,
    isComplete: percent >= 85, // 6/7 fields = complete
    filled: filled.length,
    total: fields.length,
  };
}
