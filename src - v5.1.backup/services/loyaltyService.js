// src/services/loyaltyService.js - 3-TIER VERSION (Super Grok v4.5)
import { supabase } from "./supabaseClient";

export const updateTier = async (userId, points) => {
  let tier = "bronze";
  if (points >= 20 && points <= 40) tier = "silver";
  if (points >= 40 && points <= 60) tier = "gold";
  if (points > 60) tier = "platinum"; // for future expansion

  await supabase
    .from("user_profiles")
    .update({ loyalty_tier: tier })
    .eq("id", userId);
};
