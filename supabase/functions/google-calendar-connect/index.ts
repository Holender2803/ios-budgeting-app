// supabase/functions/google-calendar-connect/index.ts
// Handles Google Calendar OAuth flow.
//
// POST body { initiate: true }
//      → Return { url } for Google consent screen (called by supabase.functions.invoke)
//
// GET ?code=<code>&state=<jwt>
//      → OAuth callback from Google: exchange code, store refresh_token, redirect to app
//
// DELETE (Bearer JWT)
//      → Remove stored connection for the authenticated user

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

// Service-role Supabase client — bypasses RLS
const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') ?? '';
const CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '';
const REDIRECT_URI = Deno.env.get('GOOGLE_REDIRECT_URI') ?? '';
const APP_ORIGIN = Deno.env.get('APP_ORIGIN') ?? 'http://localhost:5173';

Deno.serve(async (req: Request) => {
    // ── CORS preflight ───────────────────────────────────────────────────────
    const preflight = handleOptions(req);
    if (preflight) return preflight;

    // ── POST: Initiate OAuth or handle initiate=true body ────────────────────
    // supabase.functions.invoke() always sends POST.
    // We distinguish "initiate" from "disconnect" via the body.
    if (req.method === 'POST') {
        // Verify the caller is signed in
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return json({ error: 'Unauthorized' }, 401);
        }

        const jwt = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(jwt);
        if (userErr || !user) {
            return json({ error: 'Invalid token' }, 401);
        }

        const body = await req.json().catch(() => ({})) as Record<string, unknown>;

        if (body?.initiate === true) {
            // Build Google consent URL; thread the user JWT via state param
            const googleAuthUrl = new URL(GOOGLE_AUTH_URL);
            googleAuthUrl.searchParams.set('client_id', CLIENT_ID);
            googleAuthUrl.searchParams.set('redirect_uri', REDIRECT_URI);
            googleAuthUrl.searchParams.set('response_type', 'code');
            googleAuthUrl.searchParams.set('scope', CALENDAR_SCOPE);
            googleAuthUrl.searchParams.set('access_type', 'offline');
            googleAuthUrl.searchParams.set('prompt', 'consent'); // always get refresh_token
            googleAuthUrl.searchParams.set('state', jwt); // thread identity through

            return json({ url: googleAuthUrl.toString() }, 200);
        }

        return json({ error: 'Unknown POST action' }, 400);
    }

    // ── DELETE: Disconnect ───────────────────────────────────────────────────
    if (req.method === 'DELETE') {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) return json({ error: 'Unauthorized' }, 401);

        const jwt = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(jwt);
        if (userErr || !user) return json({ error: 'Invalid token' }, 401);

        await supabaseAdmin
            .from('google_calendar_connections')
            .delete()
            .eq('user_id', user.id);

        // Also clean up tracked event IDs
        await supabaseAdmin
            .from('google_calendar_events')
            .delete()
            .eq('user_id', user.id);

        return json({ ok: true }, 200);
    }

    // ── GET: OAuth callback from Google ──────────────────────────────────────
    if (req.method === 'GET') {
        const url = new URL(req.url);
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state'); // This is the Supabase JWT
        const errorParam = url.searchParams.get('error');

        if (errorParam || !code || !state) {
            return Response.redirect(
                `${APP_ORIGIN}/?calendar_error=${encodeURIComponent(errorParam ?? 'cancelled')}`,
                302,
            );
        }

        // Verify JWT to identify user
        const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(state);
        if (userErr || !user) {
            return Response.redirect(`${APP_ORIGIN}/?calendar_error=invalid_token`, 302);
        }

        // Exchange code for tokens
        const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                redirect_uri: REDIRECT_URI,
                grant_type: 'authorization_code',
            }),
        });

        const tokenData = await tokenRes.json();

        if (!tokenData.refresh_token) {
            console.error('No refresh_token in Google response:', JSON.stringify(tokenData));
            return Response.redirect(`${APP_ORIGIN}/?calendar_error=no_refresh_token`, 302);
        }

        // Upsert connection (service role bypasses RLS — refresh_token never hits client)
        const { error: upsertErr } = await supabaseAdmin
            .from('google_calendar_connections')
            .upsert({
                user_id: user.id,
                refresh_token: tokenData.refresh_token,
                calendar_id: 'primary',
                connected_at: new Date().toISOString(),
                last_sync_at: null,
                sync_error: null,
                status: 'connected',
            });

        if (upsertErr) {
            console.error('Upsert error:', upsertErr);
            return Response.redirect(`${APP_ORIGIN}/?calendar_error=db_error`, 302);
        }

        return Response.redirect(`${APP_ORIGIN}/?calendar_connected=1`, 302);
    }

    return json({ error: 'Method not allowed' }, 405);
});

// Helper: JSON response with CORS headers always attached
function json(body: unknown, status: number): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}