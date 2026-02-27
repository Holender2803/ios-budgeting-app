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
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
}

/** Throws if not signed in. */
async function requireSession(): Promise<void> {
    const token = await getAccessToken();
    if (!token) throw new Error("You must be signed in to use Google Calendar sync.");
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
    const token = await getAccessToken();
    if (!token) return DISCONNECTED;

    // If RLS blocks this, you'll also see auth errors here.
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
    await requireSession();

    // IMPORTANT: Let supabase-js attach the Authorization header automatically.
    // Passing custom headers here can accidentally drop required gateway headers.
    const { data, error } = await supabase.functions.invoke("google-calendar-connect", {
        body: { initiate: true },
    });

    if (error) {
        const msg = (error as any)?.message ?? String(error);
        throw new Error(`Could not start Google Calendar connection: ${msg}`);
    }

    const url = (data as any)?.url;
    if (!url) throw new Error("Edge function did not return a redirect URL.");

    window.location.href = url;
}

// ────────────────────────────────────────────────────────────────────────────
// Sync — compute daily totals from local data and push to Google Calendar
// ────────────────────────────────────────────────────────────────────────────
export interface LocalTransaction {
    id: string;
    date: string;        // YYYY-MM-DD
    amount: number;
    category: string;    // category id / label
    vendor: string;
    deletedAt?: number;  // undefined = not deleted
    isRecurring?: boolean; // for daily summary: Total Recurring / Non-Recurring
}

export async function syncGoogleCalendar(
    localTransactions: LocalTransaction[] = []
): Promise<SyncResult> {
    // Verify environment variables first
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables");
    }

    // Explicitly get session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
        console.error("[CalendarService] Session error:", sessionError);
        throw new Error(`Session error: ${sessionError.message}`);
    }
    
    if (!sessionData.session?.access_token) {
        console.error("[CalendarService] No session or access_token found");
        throw new Error("You must be signed in to sync Google Calendar.");
    }

    const accessToken = sessionData.session.access_token;
    console.log("[CalendarService] Token diagnostics:", {
        hasToken: !!accessToken,
        length: accessToken.length,
        start: accessToken.substring(0, 3) + "...",
        end: "..." + accessToken.substring(accessToken.length - 3)
    });

    const recentTransactions = localTransactions
        .filter(t => !t.deletedAt)
        .map(t => ({
            id: t.id,
            date: t.date,
            amount: t.amount,
            category: t.category,
            vendor: t.vendor,
            isRecurring: t.isRecurring,
        }));

    console.log(
        "[CalendarService] syncGoogleCalendar — total local:", localTransactions.length,
        "| sending:", recentTransactions.length, "transactions"
    );

    // Manual fetch with explicit auth headers.
    // IMPORTANT: We send the anon/publishable key in Authorization so the Supabase
    // gateway is always happy, and pass the *user* JWT in a custom header that
    // the edge function reads and validates with supabaseAdmin.
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-sync`;
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
            "x-supabase-user-token": accessToken,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ transactions: recentTransactions }),
    });

    if (!res.ok) {
        const errorText = await res.text();
        console.error("[CalendarService] HTTP error:", {
            status: res.status,
            statusText: res.statusText,
            body: errorText
        });
        throw new Error(`Edge Function returned a non-2xx status code (${res.status}): ${errorText}`);
    }

    const data = await res.json();
    const responseError = data?.error;
    if (responseError) {
        console.error("[CalendarService] Calendar API error from edge function:", responseError);
        throw new Error(responseError);
    }

    const result: SyncResult = {
        synced: data?.synced ?? 0,
        deleted: data?.deleted ?? 0,
    };

    console.log("[CalendarService] Sync response:", result);
    return result;
}

// ────────────────────────────────────────────────────────────────────────────
// Disconnect — remove the stored connection server-side
// ────────────────────────────────────────────────────────────────────────────
export async function disconnectGoogleCalendar(): Promise<void> {
    await requireSession();

    // supabase.functions.invoke doesn't reliably support method overrides across versions.
    // Use fetch with the proper Supabase auth + apikey.
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) throw new Error("You must be signed in to disconnect Google Calendar.");

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-connect`;

    const res = await fetch(url, {
        method: "DELETE",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
    });

    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Failed to disconnect Google Calendar (${res.status}): ${txt}`);
    }
}