import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { familie_id, datum, leistungsart, plz, max_stundensatz } = await req.json();

    // Find available Anbieter for the given date and service type
    const { data: verfuegbare, error } = await supabase
      .from("anbieter_verfuegbarkeit")
      .select(`
        id, anbieter_id, datum, zeit_von, zeit_bis, stundensatz,
        profiles:anbieter_id(vorname, nachname, beschreibung, plz)
      `)
      .eq("datum", datum)
      .eq("status", "frei")
      .lte("stundensatz", max_stundensatz || 100);

    if (error) throw error;

    // Score each match (simple scoring: price, availability breadth)
    const scored = (verfuegbare || []).map((v: any) => ({
      ...v,
      score: Math.random() * 100, // TODO: replace with real ML scoring
    })).sort((a: any, b: any) => b.score - a.score);

    return new Response(JSON.stringify({ matches: scored.slice(0, 10) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
