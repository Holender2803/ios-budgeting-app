// src/lib/calendarService.ts
// Frontend client for the Google Calendar Supabase Edge Functions.
// No refresh tokens handled here — all stored server-side.

/// <reference types="vite/client" />
import { supabase } from "./supabaseClient";

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────
export interface CalendarStatus {
    connected: boolean;
    calendarId: string | null;
    connectedAt: string | null;
    lastSyncAt: string | null;
    syncError: string | null;
    status: string | null;
}

export interface SyncResult {
    synced: number;
    deleted: number;
}

// ────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ────────────────────────────────────────────────────────────────────────────

/** Returns the current session's access_token, or null if not signed in. */
async function getAccessToken(): Promise<string | null> {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
}

/** Returns the current session's access_token, throws if not signed in. */
async function requireAccessToken(): Promise<string> {
    const token = await getAccessToken();
    if (!token) throw new Error("You must be signed in to use Google Calendar sync.");
    return token;
}

const DISCONNECTED: CalendarStatus = {
    connected: false,
    calendarId: null,
    connectedAt: null,
    lastSyncAt: null,
    syncError: null,
    status: null,
};

// ────────────────────────────────────────────────────────────────────────────
// Status — reads the google_calendar_status DB view (safe, no refresh_token)
// ────────────────────────────────────────────────────────────────────────────
export async function getCalendarStatus(): Promise<CalendarStatus> {
    if (!supabase) return DISCONNECTED;
    const token = await getAccessToken();
    if (!token) return DISCONNECTED;

    // Query the view directly — it strips the refresh_token
    const { data, error } = await supabase
        .from("google_calendar_status")
        .select("calendar_id, connected_at, last_sync_at, sync_error, status")
        .single();

    if (error || !data) return DISCONNECTED;

    return {
        connected: true,
        calendarId: data.calendar_id ?? "primary",
        connectedAt: data.connected_at ?? null,
        lastSyncAt: data.last_sync_at ?? null,
        syncError: data.sync_error ?? null,
        status: data.status ?? null,
    };
}

// ────────────────────────────────────────────────────────────────────────────
// Connect — ask the edge function to build the Google consent URL, then redirect
// ────────────────────────────────────────────────────────────────────────────
export async function initiateGoogleCalendarConnect(): Promise<void> {
    if (!supabase) throw new Error("Supabase not configured");
    const accessToken = await requireAccessToken();

    // ── Diagnostic ── open browser DevTools > Console to see this
    console.log(
        "[CalendarConnect] Token length:", accessToken.length,
        "| starts:", accessToken.slice(0, 10),
        "| ends:", accessToken.slice(-6)
    );

    const { data, error } = await supabase.functions.invoke("google-calendar-connect", {
        body: { initiate: true },
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (error) {
        // Provide a more helpful message than the generic supabase-js one
        const msg = (error as any)?.message ?? String(error);
        throw new Error(`Could not start Google Calendar connection: ${msg}`);
    }

    const url = (data as any)?.url;
    if (!url) throw new Error("Edge function did not return a redirect URL.");

    // Redirect the browser to Google's consent page
    window.location.href = url;
}

// ────────────────────────────────────────────────────────────────────────────
// Sync — compute daily totals from local data and push to Google Calendar
// Pass in the local transactions so we don't depend on Supabase sync state.
// ────────────────────────────────────────────────────────────────────────────

export interface LocalTransaction {
    id: string;
    date: string;        // YYYY-MM-DD
    amount: number;
    category: string;    // category id / label
    deletedAt?: number;  // undefined = not deleted
}

export async function syncGoogleCalendar(
    localTransactions: LocalTransaction[] = []
): Promise<SyncResult> {
    if (!supabase) throw new Error("Supabase not configured");
    const accessToken = await requireAccessToken();

    // Only send non-deleted transactions from the last 90 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const cutoffStr = cutoff.toISOString().split("T")[0];

    const recentTransactions = localTransactions.filter(
        t => !t.deletedAt && t.date >= cutoffStr
    ).map(t => ({
        date: t.date,
        amount: t.amount,
        category: t.category,
    }));

    console.log(
        "[CalendarService] syncGoogleCalendar — total local:", localTransactions.length,
        "| 90-day cutoff:", cutoffStr,
        "| sending:", recentTransactions.length, "transactions"
    );

    const { data, error } = await supabase.functions.invoke("google-calendar-sync", {
        body: { transactions: recentTransactions },
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (error) {
        const msg = (error as any)?.message ?? "Calendar sync failed";
        console.error("[CalendarService] Sync error:", msg);
        throw new Error(msg);
    }

    // Surface any Google Calendar API error the edge function captured
    const responseError = (data as any)?.error;
    if (responseError) {
        console.error("[CalendarService] Calendar API error from edge function:", responseError);
        throw new Error(responseError);
    }

    const result = {
        synced: (data as any)?.synced ?? 0,
        deleted: (data as any)?.deleted ?? 0,
    };
    console.log("[CalendarService] Sync response:", result);
    return result;
}


// ────────────────────────────────────────────────────────────────────────────
// Disconnect — remove the stored connection server-side
// ────────────────────────────────────────────────────────────────────────────
export async function disconnectGoogleCalendar(): Promise<void> {
    if (!supabase) throw new Error("Supabase not configured");
    const accessToken = await requireAccessToken();

    const { error } = await supabase.functions.invoke("google-calendar-connect", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (error) {
        throw new Error((error as any)?.message ?? "Failed to disconnect Google Calendar");
    }
}