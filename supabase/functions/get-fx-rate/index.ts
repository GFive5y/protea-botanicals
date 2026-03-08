// get-fx-rate/index.ts — v1.0
// Protea Botanicals — WP-A FX Engine
// Deploy: supabase functions deploy get-fx-rate --no-verify-jwt
// Fetches live USD/ZAR + EUR/ZAR from open.er-api.com (free, no key needed)
// Caches in fx_rates table. Returns cached rate if < 60 minutes old.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CACHE_MINUTES = 60;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // --- Check cache first ---
    const cutoff = new Date(
      Date.now() - CACHE_MINUTES * 60 * 1000,
    ).toISOString();

    const { data: cached } = await supabase
      .from("fx_rates")
      .select("currency_pair, rate, fetched_at")
      .gt("fetched_at", cutoff)
      .order("fetched_at", { ascending: false });

    const cachedUSD = cached?.find((r) => r.currency_pair === "USD_ZAR");
    const cachedEUR = cached?.find((r) => r.currency_pair === "EUR_ZAR");

    if (cachedUSD && cachedEUR) {
      return new Response(
        JSON.stringify({
          usd_zar: parseFloat(cachedUSD.rate),
          eur_zar: parseFloat(cachedEUR.rate),
          fetched_at: cachedUSD.fetched_at,
          source: "cache",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // --- Fetch live rates ---
    const fxRes = await fetch("https://open.er-api.com/v6/latest/USD");
    if (!fxRes.ok) throw new Error(`FX API error: ${fxRes.status}`);
    const fxData = await fxRes.json();

    const usdZar: number = fxData.rates?.ZAR;
    const eurUsd: number = fxData.rates?.EUR;
    if (!usdZar || !eurUsd) throw new Error("Missing ZAR/EUR in FX response");

    const eurZar = usdZar / eurUsd;
    const now = new Date().toISOString();

    // --- Upsert into cache ---
    await supabase.from("fx_rates").insert([
      { currency_pair: "USD_ZAR", rate: usdZar, fetched_at: now },
      { currency_pair: "EUR_ZAR", rate: eurZar, fetched_at: now },
    ]);

    return new Response(
      JSON.stringify({
        usd_zar: usdZar,
        eur_zar: eurZar,
        fetched_at: now,
        source: "live",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    // --- Fallback: return last known rate from DB even if stale ---
    try {
      const { data: fallback } = await supabase
        .from("fx_rates")
        .select("currency_pair, rate, fetched_at")
        .order("fetched_at", { ascending: false })
        .limit(4);

      const fbUSD = fallback?.find((r) => r.currency_pair === "USD_ZAR");
      const fbEUR = fallback?.find((r) => r.currency_pair === "EUR_ZAR");

      if (fbUSD) {
        return new Response(
          JSON.stringify({
            usd_zar: parseFloat(fbUSD.rate),
            eur_zar: fbEUR ? parseFloat(fbEUR.rate) : null,
            fetched_at: fbUSD.fetched_at,
            source: "stale_cache",
            warning: "Live fetch failed — using last known rate",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    } catch (_) {
      /* fallback failed too */
    }

    return new Response(
      JSON.stringify({
        error: err.message,
        usd_zar: 18.5, // last-resort hardcoded fallback
        eur_zar: 20.2,
        source: "hardcoded_emergency_fallback",
      }),
      {
        status: 200, // still 200 so app doesn't crash
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
