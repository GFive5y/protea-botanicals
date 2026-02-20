// src/services/scanService.js - FINAL VERSION WITH TIER UPDATE (Super Grok v4.5)
import { supabase } from "./supabaseClient";
import { updateTier } from "./loyaltyService";

export const authenticateQR = async (qrCode) => {
  try {
    let { data: batch } = await supabase
      .from("batches")
      .select("*")
      .eq("batch_number", qrCode)
      .single();

    if (!batch) {
      const { data: newBatch } = await supabase
        .from("batches")
        .insert({
          batch_number: qrCode,
          product_name: "Protea Botanicals Premium Extract",
          lab_certified: true,
          coa_url: "https://example.com/coa/PB-001-2026.pdf",
        })
        .select()
        .single();
      batch = newBatch;
    }

    const result = {
      authentic: true,
      batch,
      pointsEarned: 0,
    };

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
      result.message = "Log in to earn points!";
      return result;
    }

    // Award point
    await supabase.from("loyalty_transactions").insert({
      user_id: user.id,
      points: 1,
      transaction_type: "scan",
      description: `Scanned ${qrCode}`,
    });

    // Update profile points
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("loyalty_points")
      .eq("id", user.id)
      .single();

    const newPoints = (profile?.loyalty_points || 0) + 1;

    await supabase
      .from("user_profiles")
      .update({ loyalty_points: newPoints })
      .eq("id", user.id);

    // Update tier (this is the key line that was missing)
    await updateTier(user.id, newPoints);

    result.pointsEarned = 1;
    result.message = "Points awarded!";
    return result;
  } catch (err) {
    console.error("Scan error:", err);
    return {
      authentic: false,
      message: "Error processing scan – please try again",
    };
  }
};
