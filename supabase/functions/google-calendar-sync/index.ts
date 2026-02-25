// supabase/functions/google-calendar-sync/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") ?? "";
const CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "";

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY);

async function getUserFromToken(token: string): Promise<{ id: string } | null> {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { "Authorization": `Bearer ${token}`, "apikey": SERVICE_KEY },
    });
    if (!res.ok) { console.error("[sync] Auth error:", res.status, await res.text()); return null; }
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
    if (req.method !== "POST") return jsonResp({ error: "Method not allowed" }, 405);

    try {
        // ── 1. Auth ──────────────────────────────────────────────────────────
        const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
        if (!token) return jsonResp({ error: "Missing Authorization header" }, 401);
        const user = await getUserFromToken(token);
        if (!user) return jsonResp({ error: "Invalid or expired session" }, 401);
        console.log("[sync] User:", user.id);

        // ── 2. Get refresh token ──────────────────────────────────────────────
        const { data: conn, error: connErr } = await supabaseAdmin
            .from("google_calendar_connections")
            .select("refresh_token, calendar_id")
            .eq("user_id", user.id)
            .single();
        if (connErr || !conn) throw new Error("Google Calendar not connected");

        // ── 3. Exchange refresh token → Google access token ───────────────────
        const tokenResp = await fetch(GOOGLE_TOKEN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
                refresh_token: conn.refresh_token, grant_type: "refresh_token",
            }),
        });
        const tokens = await tokenResp.json();
        if (!tokenResp.ok) throw new Error(`Google token error: ${tokens.error_description || tokens.error}`);

        const googleAccessToken = tokens.access_token;
        const calendarId = conn.calendar_id || "primary";
        console.log("[sync] Calendar:", calendarId);

        // ── 4. Read client-submitted transactions ─────────────────────────────
        const rawBody = await req.json().catch(() => ({}));
        const submitted: Array<{ date: string; amount: number; category: string }> =
            Array.isArray(rawBody.transactions) ? rawBody.transactions : [];
        console.log("[sync] Received", submitted.length, "transactions from client");

        // Apply 90-day cutoff as a safety net
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 90);
        const cutoffStr = cutoff.toISOString().split("T")[0];
        const txs = submitted.filter((t) => t.date >= cutoffStr);
        console.log("[sync] After 90-day filter:", txs.length, "| cutoff:", cutoffStr);

        if (txs.length === 0) {
            await supabaseAdmin.from("google_calendar_connections")
                .update({ last_sync_at: new Date().toISOString(), sync_error: null })
                .eq("user_id", user.id);
            return jsonResp({ synced: 0, deleted: 0 }, 200);
        }

        // ── 5. Compute daily totals ───────────────────────────────────────────
        const dailyTotals: Record<string, { total: number; categories: Record<string, number> }> = {};
        txs.forEach((tx) => {
            if (!dailyTotals[tx.date]) dailyTotals[tx.date] = { total: 0, categories: {} };
            dailyTotals[tx.date].total += tx.amount;
            const cat = tx.category || "Uncategorized";
            dailyTotals[tx.date].categories[cat] = (dailyTotals[tx.date].categories[cat] || 0) + tx.amount;
        });

        const days = Object.keys(dailyTotals).sort();
        console.log("[sync] Daily totals:", days.length, "days");

        // ── 6. Fetch existing event IDs in one batch query ────────────────────
        const { data: existingRows } = await supabaseAdmin
            .from("google_calendar_events")
            .select("day, google_event_id")
            .eq("user_id", user.id)
            .in("day", days);

        const existingMap: Record<string, string> = {};
        (existingRows ?? []).forEach((r: { day: string; google_event_id: string }) => {
            existingMap[r.day] = r.google_event_id;
        });

        // ── 7. Upsert all events in PARALLEL (was sequential — caused timeout) ─
        let syncedCount = 0;
        const errors: string[] = [];

        const upsertResults = await Promise.all(
            days.map(async (date) => {
                const data = dailyTotals[date];
                if (data.total <= 0) return { date, ok: false, skipped: true };

                const summary = `💰 Spending: $${data.total.toFixed(2)}`;

                // Format categories as a clean list sorted by amount
                const categoryLines = Object.entries(data.categories)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .map(([cat, amt]) => `• ${cat}: $${(amt as number).toFixed(2)}`)
                    .join("\n");

                const description = [
                    `📊 Daily Total: $${data.total.toFixed(2)}`,
                    ``,
                    `━━━━━━━━━━━━━━━━━━━━`,
                    categoryLines,
                    `━━━━━━━━━━━━━━━━━━━━`,
                    `Synced by CalendarSpent`,
                ].join("\n");

                // All-day event: end = next calendar day (UTC-safe)
                const nextDay = new Date(date + "T00:00:00Z");
                nextDay.setUTCDate(nextDay.getUTCDate() + 1);
                const endDate = nextDay.toISOString().split("T")[0];

                const eventBody = {
                    summary,
                    description,
                    start: { date },
                    end: { date: endDate },
                    // Mark as free (not busy) — it's a spending summary, not a real event
                    transparency: "transparent",
                    reminders: { useDefault: false, overrides: [] },
                };

                const existingEventId = existingMap[date];
                const isUpdate = Boolean(existingEventId);
                const gcalUrl = isUpdate
                    ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${existingEventId}`
                    : `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

                const gcalResp = await fetch(gcalUrl, {
                    method: isUpdate ? "PUT" : "POST",
                    headers: { Authorization: `Bearer ${googleAccessToken}`, "Content-Type": "application/json" },
                    body: JSON.stringify(eventBody),
                });

                if (gcalResp.ok) {
                    const event = await gcalResp.json();
                    if (!isUpdate) {
                        await supabaseAdmin.from("google_calendar_events").insert({
                            user_id: user.id, day: date, google_event_id: event.id,
                        });
                    }
                    console.log(`[sync] ✓ ${isUpdate ? "Updated" : "Created"} ${date} — $${data.total.toFixed(2)}`);
                    return { date, ok: true };
                } else {
                    const errBody = await gcalResp.text();
                    const errMsg = `${date}: ${gcalResp.status} ${errBody.slice(0, 200)}`;
                    console.error("[sync] ✗", errMsg);
                    return { date, ok: false, error: errMsg };
                }
            })
        );

        upsertResults.forEach((r) => {
            if (r.ok) syncedCount++;
            else if (!r.skipped && r.error) errors.push(r.error);
        });

        // ── 8. Update last_sync_at ────────────────────────────────────────────
        const firstError = errors[0] ?? null;
        await supabaseAdmin.from("google_calendar_connections")
            .update({
                last_sync_at: new Date().toISOString(),
                sync_error: syncedCount === 0 && firstError
                    ? `Google Calendar API error (${firstError.split(":")[1]?.trim().slice(0, 10)}): ${firstError}`
                    : null,
            })
            .eq("user_id", user.id);

        console.log("[sync] Done:", syncedCount, "/", days.length, "days synced");

        if (syncedCount === 0 && firstError) {
            return jsonResp({ error: `Google Calendar API error: ${firstError}`, synced: 0, deleted: 0 }, 200);
        }

        return jsonResp({ synced: syncedCount, deleted: 0 }, 200);

    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[sync] Fatal error:", msg);
        return jsonResp({ error: msg }, 500);
    }
});