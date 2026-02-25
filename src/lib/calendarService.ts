// src/lib/calendarService.ts
// Frontend client for the Google Calendar Supabase Edge Functions.
// No refresh tokens handled here — all stored server-side.

/// <reference types="vite/client" />
import { supabase } from './supabaseClient';

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
// Helpers
// ────────────────────────────────────────────────────────────────────────────
async function requireSessionAccessToken(): Promise<string> {
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error(error.message);

    const token = data.session?.access_token;
    if (!token) throw new Error('Not signed in');

    return token;
}

// ────────────────────────────────────────────────────────────────────────────
// Status (DB view/table read)
// ────────────────────────────────────────────────────────────────────────────
export async function getCalendarStatus(): Promise<CalendarStatus> {
    if (!supabase) {
        return {
            connected: false,
            calendarId: null,
            connectedAt: null,
            lastSyncAt: null,
            syncError: null,
            status: null,
        };
    }

    // If user isn't signed in, treat as not connected (don't throw)
    const token = await requireSessionAccessToken().catch(() => null);
    if (!token) {
        return {
            connected: false,
            calendarId: null,
            connectedAt: null,
            lastSyncAt: null,
            syncError: null,
            status: null,
        };
    }

    const { data, error } = await supabase
        .from('google_calendar_status')
        .select('calendar_id, connected_at, last_sync_at, sync_error, status')
        .single();

    if (error || !data) {
        return {
            connected: false,
            calendarId: null,
            connectedAt: null,
            lastSyncAt: null,
            syncError: null,
            status: null,
        };
    }

    return {
        connected: true,
        calendarId: data.calendar_id ?? 'primary',
        connectedAt: data.connected_at ?? null,
        lastSyncAt: data.last_sync_at ?? null,
        syncError: data.sync_error ?? null,
        status: data.status ?? null,
    };
}

// ────────────────────────────────────────────────────────────────────────────
// Connect (OAuth kickoff)
// FIX: use supabase.functions.invoke so apikey + JWT are sent correctly
// ────────────────────────────────────────────────────────────────────────────
export async function initiateGoogleCalendarConnect(): Promise<void> {
    if (!supabase) throw new Error('Supabase not configured');

    // Ensure user is signed in (so JWT exists)
    await requireSessionAccessToken();

    const { data, error } = await supabase.functions.invoke('google-calendar-connect', {
        body: { initiate: true },
    });

    if (error) {
        throw new Error(`Failed to start OAuth: ${error.message}`);
    }

    const url = (data as any)?.url;
    if (!url) throw new Error('No redirect URL returned');

    window.location.href = url;
}

// ────────────────────────────────────────────────────────────────────────────
// Sync (write-only)
// ────────────────────────────────────────────────────────────────────────────
export async function syncGoogleCalendar(): Promise<SyncResult> {
    if (!supabase) throw new Error('Supabase not configured');

    // Ensure user is signed in
    await requireSessionAccessToken();

    const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: {}, // keep empty; server calculates what to sync
    });

    if (error) {
        throw new Error(error.message || 'Calendar sync failed');
    }

    return {
        synced: (data as any)?.synced ?? 0,
        deleted: (data as any)?.deleted ?? 0,
    };
}

// ────────────────────────────────────────────────────────────────────────────
// Disconnect
// ────────────────────────────────────────────────────────────────────────────
export async function disconnectGoogleCalendar(): Promise<void> {
    if (!supabase) throw new Error('Supabase not configured');

    // Ensure user is signed in
    await requireSessionAccessToken();

    const { error } = await supabase.functions.invoke('google-calendar-connect', {
        method: 'DELETE',
    });

    if (error) {
        throw new Error(error.message || 'Disconnect failed');
    }
}