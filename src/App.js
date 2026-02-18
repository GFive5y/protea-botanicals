import { supabase } from "./services/supabaseClient";
import { useEffect } from "react";

useEffect(() => {
  supabase
    .from("batches")
    .select("*")
    .then(({ data, error }) => {
      console.log("Test data:", data, "Error:", error);
    });
}, []);
