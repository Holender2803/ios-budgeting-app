// supabase/functions/google-calendar-sync/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") ?? "";
const CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "";

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY);

// ── Same verified auth approach as connect function ──────────────────────────
async function getUserFromToken(token: string): Promise<{ id: string } | null> {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: {
            "Authorization": `Bearer ${token}`,
            "apikey": SERVICE_KEY,
        },
    });
    if (!res.ok) {
        const body = await res.text();
        console.error("[sync] Auth API error:", res.status, body);
        return null;
    }
    const user = await res.json();
    return user?.id ? user : null;
}

function jsonResp(body: unknown, status: number): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}

Deno.serve(async (req: Request) => {
    const preflight = handleOptions(req);
    if (preflight) return preflight;

    if (req.method !== "POST") {
        return jsonResp({ error: "Method not allowed" }, 405);
    }

    try {
        const authHeader = req.headers.get("Authorization") ?? "";
        const token = authHeader.replace(/^Bearer\s+/i, "").trim();
        if (!token) return jsonResp({ error: "Missing Authorization header" }, 401);

        // Verify identity via direct Supabase Auth API call (works with --no-verify-jwt)
        const user = await getUserFromToken(token);
        if (!user) return jsonResp({ error: "Invalid or expired session" }, 401);

        console.log("[sync] Authenticated user:", user.id);

        // 1. Get stored Google refresh token
        const { data: conn, error: connErr } = await supabaseAdmin
            .from("google_calendar_connections")
            .select("refresh_token, calendar_id")
            .eq("user_id", user.id)
            .single();

        if (connErr || !conn) throw new Error("Google Calendar not connected");

        // 2. Exchange refresh token → Google access token
        const tokenResp = await fetch(GOOGLE_TOKEN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                refresh_token: conn.refresh_token,
                grant_type: "refresh_token",
            }),
        });

        const tokens = await tokenResp.json();
        if (!tokenResp.ok) throw new Error(`Google token error: ${tokens.error_description || tokens.error}`);

        const googleAccessToken = tokens.access_token;
        const calendarId = conn.calendar_id || "primary";

        // 3. Fetch expenses from the last 30 days (table is "expenses" not "transactions")
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const startDate = thirtyDaysAgo.toISOString().split("T")[0];

        const { data: txs, error: txsErr } = await supabaseAdmin
            .from("expenses")
            .select("date, amount, category_id")
            .eq("user_id", user.id)
            .is("deleted_at", null)
            .gte("date", startDate);

        if (txsErr) throw txsErr;

        // 4. Compute daily totals
        const dailyTotals: Record<string, { total: number; categories: Record<string, number> }> = {};

        (txs ?? []).forEach((tx: { date: string; amount: number; category_id: string }) => {
            if (!dailyTotals[tx.date]) dailyTotals[tx.date] = { total: 0, categories: {} };
            dailyTotals[tx.date].total += tx.amount;
            const cat = tx.category_id || "Uncategorized";
            dailyTotals[tx.date].categories[cat] = (dailyTotals[tx.date].categories[cat] || 0) + tx.amount;
        });

        console.log("[sync] Daily totals to sync:", Object.keys(dailyTotals).length, "days");

        // 5. Upsert events to Google Calendar
        let syncedCount = 0;

        for (const [date, data] of Object.entries(dailyTotals)) {
            if (data.total <= 0) continue;

            const summary = `📅 Spending: $${data.total.toFixed(2)}`;
            const description =
                `Daily Total: $${data.total.toFixed(2)}\n\nCategories:\n` +
                Object.entries(data.categories)
                    .map(([cat, amt]) => `• ${cat}: $${(amt as number).toFixed(2)}`)
                    .join("\n");

            // Find existing Google event ID for this day
            const { data: existing } = await supabaseAdmin
                .from("google_calendar_events")
                .select("google_event_id")
                .eq("user_id", user.id)
                .eq("day", date)
                .maybeSingle();

            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);
            const endDate = nextDay.toISOString().split("T")[0];

            const eventBody = {
                summary,
                description,
                start: { date },
                end: { date: endDate },
            };

            const gcalUrl = existing?.google_event_id
                ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${existing.google_event_id}`
                : `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

            const gcalResp = await fetch(gcalUrl, {
                method: existing?.google_event_id ? "PUT" : "POST",
                headers: {
                    Authorization: `Bearer ${googleAccessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(eventBody),
            });

            if (gcalResp.ok) {
                const event = await gcalResp.json();
                if (!existing?.google_event_id) {
                    await supabaseAdmin.from("google_calendar_events").insert({
                        user_id: user.id,
                        day: date,
                        google_event_id: event.id,
                    });
                }
                syncedCount++;
            } else {
                const errBody = await gcalResp.text();
                console.warn("[sync] Google Calendar event failed:", gcalResp.status, errBody);
            }
        }

        // 6. Update last_sync_at
        await supabaseAdmin
            .from("google_calendar_connections")
            .update({ last_sync_at: new Date().toISOString(), sync_error: null })
            .eq("user_id", user.id);

        console.log("[sync] Done — synced", syncedCount, "events");

        return jsonResp({ synced: syncedCount, deleted: 0 }, 200);

    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[sync] Error:", msg);
        return jsonResp({ error: msg }, 500);
    }
});