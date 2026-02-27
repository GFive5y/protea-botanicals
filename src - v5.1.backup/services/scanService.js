// src/services/scanService.js
import { supabase } from "./supabaseClient";

export async function authenticateQR(qrCode) {
  const { data: product, error } = await supabase
    .from("products")
    .select("*, batches(*)")
    .eq("qr_code", qrCode)
    .single();

  if (error || !product) {
    console.error("Product lookup error:", error);
    return { authentic: false, message: "Invalid or fake QR Code" };
  }

  // Update scan count only - last_scan_at column not yet in schema
  const { error: updateError } = await supabase
    .from("products")
    .update({
      scan_count: (product.scan_count || 0) + 1,
    })
    .eq("qr_code", qrCode);

  if (updateError) {
    console.warn("Product update failed (non-critical):", updateError.message);
  }

  const pointsEarned = 10;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    console.log("User logged in:", user.id);
    const { error: txError } = await supabase
      .from("loyalty_transactions")
      .insert({
        user_id: user.id,
        transaction_type: "earned",
        points: pointsEarned,
        description: `Scan of ${product.batches?.batch_number || "Unknown"}`,
        transaction_date: new Date().toISOString(), // ← explicitly set the date
      });

    if (txError) {
      console.error("Transaction insert error FULL:", JSON.stringify(txError));
    } else {
      console.log("Transaction inserted successfully ✅");
    }

    const { error: rpcError } = await supabase.rpc("increment_loyalty_points", {
      user_id: user.id,
      points: pointsEarned,
    });

    if (rpcError) console.error("RPC points update error:", rpcError);
    else console.log("Total points updated via RPC ✅");
  } else {
    console.log("No user logged in - skipping points");
  }

  return {
    authentic: true,
    product,
    batch: product.batches,
    pointsEarned,
  };
}
