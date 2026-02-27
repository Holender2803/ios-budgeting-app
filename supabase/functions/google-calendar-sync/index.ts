// supabase/functions/google-calendar-sync/index.ts
// One Google Calendar event per day: daily summary with title "Daily Expenses · $TOTAL"
// and a structured description. Idempotent: same payload => no duplicates.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") ?? "";
const CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "";

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY);

/** Google Calendar event description limit (chars). */
const MAX_DESCRIPTION_LENGTH = 8000;
/** Max breakdown lines before truncating with "...and X more". */
const MAX_BREAKDOWN_LINES = 50;

function jsonResp(body: unknown, status: number): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}

function toLocalDateString(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** One transaction from the client (category may be name or id). */
interface IncomingTx {
    id: string;
    date: string;
    amount: number;
    category: string;
    vendor: string;
    isRecurring?: boolean;
}

/** Build the exact daily summary description (plain text, no emojis). */
function buildDailyDescription(
    total: number,
    recurringTotal: number,
    nonRecurringTotal: number,
    byCategory: Array<{ label: string; amount: number }>,
    breakdown: Array<{ vendor: string; category: string; amount: number; isRecurring: boolean }>,
): string {
    const totalStr = total.toFixed(2);
    const lines: string[] = [];

    lines.push("Expenses Summary: $" + totalStr);
    lines.push("");

    lines.push("----------------------------");
    lines.push("Totals");
    lines.push("----------------------------");
    if (recurringTotal > 0) lines.push(`Total Recurring: $${recurringTotal.toFixed(2)}`);
    if (nonRecurringTotal > 0) lines.push(`Total Non-Recurring: $${nonRecurringTotal.toFixed(2)}`);

    lines.push("");
    lines.push("----------------------------");
    lines.push("Expense By Category");
    lines.push("----------------------------");
    for (const { label, amount } of byCategory) {
        lines.push(`${label}: $${amount.toFixed(2)}`);
    }

    lines.push("");
    lines.push("----------------------------");
    lines.push("Expenses Breakdown");
    lines.push("----------------------------");
    const maxLines = MAX_BREAKDOWN_LINES;
    const show = breakdown.slice(0, maxLines);
    const moreCount = breakdown.length - maxLines;
    for (const { vendor, category, amount, isRecurring } of show) {
        const recurTag = isRecurring ? " (Recurring)" : "";
        lines.push(`- ${vendor} | ${category} | $${amount.toFixed(2)}${recurTag}`);
    }
    if (moreCount > 0) {
        lines.push(`...and ${moreCount} more`);
    }

    let out = lines.join("\n");
    if (out.length > MAX_DESCRIPTION_LENGTH) {
        out = out.slice(0, MAX_DESCRIPTION_LENGTH - 20) + "\n\n...truncated";
    }
    return out;
}

Deno.serve(async (req: Request) => {
    const preflight = handleOptions(req);
    if (preflight) return preflight;
    if (req.method !== "POST") return jsonResp({ error: "Method not allowed" }, 405);

    try {
        // ── 1. Auth ──────────────────────────────────────────────────────────
        const userToken = (req.headers.get("x-supabase-user-token") ?? "").trim();
        if (!userToken) return jsonResp({ error: "Missing user token" }, 401);

        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(userToken);
        if (authError || !user) return jsonResp({ error: "Invalid session" }, 401);

        console.log("[sync] User:", user.id);

        // ── 2. Get refresh token ──────────────────────────────────────────────
        const { data: conn, error: connErr } = await supabaseAdmin
            .from("google_calendar_connections")
            .select("refresh_token, calendar_id")
            .eq("user_id", user.id)
            .single();
        if (connErr || !conn) throw new Error("Google Calendar not connected");

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

        // ── 3. Payload and sync window (today -14 to today +14) ───────────────
        const rawBody = await req.json().catch(() => ({}));
        const submitted: IncomingTx[] = Array.isArray(rawBody.transactions) ? rawBody.transactions : [];

        const today = new Date();
        const pastCutoff = new Date(today);
        pastCutoff.setDate(today.getDate() - 14);
        const futureCutoff = new Date(today);
        futureCutoff.setDate(today.getDate() + 14);
        const minDateStr = toLocalDateString(pastCutoff);
        const maxDateStr = toLocalDateString(futureCutoff);

        const activeTxs = submitted.filter((t) => t.date >= minDateStr && t.date <= maxDateStr);

        // ── 4. Group by day (idempotency: one event per day, keyed by "summary:YYYY-MM-DD") ──
        const byDay = new Map<string, IncomingTx[]>();
        for (const t of activeTxs) {
            const list = byDay.get(t.date) ?? [];
            list.push(t);
            byDay.set(t.date, list);
        }

        // ── 5. Fetch existing calendar mappings in window ─────────────────────
        // We store one row per day with expense_id = "summary:YYYY-MM-DD" for daily summary.
        // Any row with expense_id not starting with "summary:" is legacy per-expense; we will remove it.
        const { data: existingRows } = await supabaseAdmin
            .from("google_calendar_events")
            .select("id, expense_id, google_event_id, day")
            .eq("user_id", user.id)
            .gte("day", minDateStr)
            .lte("day", maxDateStr);

        const summaryByDay: Record<string, { db_id: string; google_event_id: string }> = {};
        const legacyRows: { id: string; google_event_id: string }[] = [];
        for (const r of existingRows ?? []) {
            const day = r.day as string;
            if (String(r.expense_id).startsWith("summary:")) {
                summaryByDay[day] = { db_id: r.id, google_event_id: r.google_event_id };
            } else {
                legacyRows.push({ id: r.id, google_event_id: r.google_event_id });
            }
        }

        const actions: Array<() => Promise<{ ok: boolean; error?: string }>> = [];

        // ── 6. Delete legacy per-expense events (migrate to one-per-day) ────────
        for (const row of legacyRows) {
            actions.push(async () => {
                const gcalUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${row.google_event_id}`;
                const gcalResp = await fetch(gcalUrl, {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${googleAccessToken}` },
                });
                if (gcalResp.ok || gcalResp.status === 404 || gcalResp.status === 410) {
                    await supabaseAdmin.from("google_calendar_events").delete().eq("id", row.id);
                    return { ok: true };
                }
                return { ok: false, error: `Legacy delete failed: ${row.google_event_id}` };
            });
        }

        // ── 7. Upsert one event per day that has transactions ─────────────────
        for (const [day, txs] of byDay.entries()) {
            const total = txs.reduce((s, t) => s + t.amount, 0);
            const recurringTotal = txs.filter((t) => t.isRecurring).reduce((s, t) => s + t.amount, 0);
            const nonRecurringTotal = total - recurringTotal;

            const categoryMap = new Map<string, number>();
            for (const t of txs) {
                const cur = categoryMap.get(t.category) ?? 0;
                categoryMap.set(t.category, cur + t.amount);
            }
            const byCategory = Array.from(categoryMap.entries())
                .map(([label, amount]) => ({ label, amount }))
                .sort((a, b) => b.amount - a.amount);

            const breakdown = txs.map((t) => ({
                vendor: t.vendor,
                category: t.category,
                amount: t.amount,
                isRecurring: !!t.isRecurring,
            }));

            const description = buildDailyDescription(
                total,
                recurringTotal,
                nonRecurringTotal,
                byCategory,
                breakdown,
            );
            const title = `Daily Expenses · $${total.toFixed(2)}`;

            const nextDay = new Date(day + "T00:00:00Z");
            nextDay.setUTCDate(nextDay.getUTCDate() + 1);
            const endDate = nextDay.toISOString().split("T")[0];

            const eventBody = {
                summary: title,
                description,
                start: { date: day },
                end: { date: endDate },
                transparency: "transparent",
                reminders: { useDefault: false, overrides: [] },
            };

            const existing = summaryByDay[day];
            const isUpdate = !!existing;

            actions.push(async () => {
                const gcalUrl = isUpdate
                    ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${existing.google_event_id}`
                    : `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

                const gcalResp = await fetch(gcalUrl, {
                    method: isUpdate ? "PUT" : "POST",
                    headers: { Authorization: `Bearer ${googleAccessToken}`, "Content-Type": "application/json" },
                    body: JSON.stringify(eventBody),
                });

                if (!gcalResp.ok) {
                    const err = await gcalResp.text();
                    return { ok: false, error: `${day} ${isUpdate ? "PUT" : "POST"} failed: ${err}` };
                }

                if (!isUpdate) {
                    const event = await gcalResp.json();
                    await supabaseAdmin.from("google_calendar_events").insert({
                        user_id: user.id,
                        expense_id: `summary:${day}`,
                        day,
                        google_event_id: event.id,
                    });
                }
                return { ok: true };
            });
        }

        // ── 8. Delete summary events for days with no transactions ────────────
        const daysWithTx = new Set(byDay.keys());
        for (const day of Object.keys(summaryByDay)) {
            if (daysWithTx.has(day)) continue;
            const mapping = summaryByDay[day];
            actions.push(async () => {
                const gcalUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${mapping.google_event_id}`;
                const gcalResp = await fetch(gcalUrl, {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${googleAccessToken}` },
                });
                if (gcalResp.ok || gcalResp.status === 404 || gcalResp.status === 410) {
                    await supabaseAdmin.from("google_calendar_events").delete().eq("id", mapping.db_id);
                    return { ok: true };
                }
                const err = await gcalResp.text();
                return { ok: false, error: `Delete ${day} failed: ${err}` };
            });
        }

        // ── 9. Run all actions (idempotent: re-running produces same calendar state) ──
        console.log(`[sync] Window: ${minDateStr} to ${maxDateStr}, ${actions.length} actions`);
        const results = await Promise.all(actions.map((a) => a()));

        const errors = results.filter((r) => !r.ok).map((r) => r.error!);
        const emptyDayDeletes = Object.keys(summaryByDay).filter((d) => !daysWithTx.has(d)).length;
        const deletedCount = legacyRows.length + emptyDayDeletes;
        const syncedCount = byDay.size; // one event created/updated per day with transactions

        await supabaseAdmin
            .from("google_calendar_connections")
            .update({
                last_sync_at: new Date().toISOString(),
                sync_error: errors.length ? `Sync error (${errors.length} total): ${(errors[0] ?? "").slice(0, 150)}` : null,
            })
            .eq("user_id", user.id);

        console.log(`[sync] Done: ${syncedCount} synced, ${deletedCount} deleted, ${errors.length} errors`);

        if (errors.length > 0 && okCount === 0) {
            return jsonResp({ error: errors[0], synced: 0, deleted: 0 }, 200);
        }
        return jsonResp({ synced: syncedCount, deleted: deletedCount }, 200);
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[sync] Fatal error:", msg);
        return jsonResp({ error: msg }, 500);
    }
});
