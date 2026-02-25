// supabase/functions/google-calendar-sync/index.ts
import { corsHeaders, handleOptions } from "../_shared/cors.ts";

Deno.serve(async (req) => {
    const preflight = handleOptions(req);
    if (preflight) return preflight;

    try {
        if (req.method !== "POST") {
            return new Response(JSON.stringify({ error: "Method not allowed" }), {
                status: 405,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // For now, just return a stub so the frontend can confirm connectivity.
        // You can re-add your real sync logic after OAuth token storage works.
        return new Response(JSON.stringify({ synced: 0, deleted: 0 }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});