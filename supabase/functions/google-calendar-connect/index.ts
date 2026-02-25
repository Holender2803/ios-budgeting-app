// supabase/functions/google-calendar-connect/index.ts
//
// POST body { initiate: true }
//   → Build Google consent URL and return it.
//   The user's Supabase JWT AND app origin are embedded in the 'state' param
//   so the GET callback can redirect back to the correct origin.
//
// GET ?code=<code>&state=<encodedState>
//   → Google OAuth callback: exchange code, verify JWT from state, store refresh_token
//
// DELETE (Bearer JWT)
//   → Verify user, delete their connection rows

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') ?? '';
const CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '';
const REDIRECT_URI = Deno.env.get('GOOGLE_REDIRECT_URI') ?? '';
const APP_ORIGIN = Deno.env.get('APP_ORIGIN') ?? 'http://localhost:5173';

// Admin client — used for DB writes only (bypasses RLS)
const db = createClient(SUPABASE_URL, SERVICE_KEY);

console.log('[connect] boot | CLIENT_ID?', !!CLIENT_ID, '| REDIRECT_URI?', !!REDIRECT_URI, '| APP_ORIGIN:', APP_ORIGIN);

// ── Verify a Supabase JWT via direct HTTP call ───────────────────────────────
async function getUserFromToken(token: string): Promise<{ id: string } | null> {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SERVICE_KEY,
        },
    });
    if (!res.ok) {
        const body = await res.text();
        console.error('[connect] Auth API error:', res.status, body);
        return null;
    }
    const user = await res.json();
    return user?.id ? user : null;
}

// ── JSON response helper ─────────────────────────────────────────────────────
function json(body: unknown, status: number): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}

// ── Main ─────────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
    const preflight = handleOptions(req);
    if (preflight) return preflight;

    // ── POST: build Google OAuth URL ─────────────────────────────────────────
    if (req.method === 'POST') {
        const authHeader = req.headers.get('Authorization') ?? '';
        const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();

        if (!jwt || !jwt.startsWith('eyJ')) {
            return json({ error: 'Missing or invalid Authorization header' }, 401);
        }

        const body = await req.json().catch(() => ({})) as Record<string, unknown>;

        if (body?.initiate === true) {
            // Detect the app's actual origin from the request so we redirect back
            // to wherever the user is (localhost in dev, Vercel in production).
            const requestOrigin = req.headers.get('Origin') || APP_ORIGIN;

            // Embed both the JWT and the origin in state so GET callback can use them
            const statePayload = btoa(JSON.stringify({ jwt, origin: requestOrigin }));

            const url = new URL(GOOGLE_AUTH_URL);
            url.searchParams.set('client_id', CLIENT_ID);
            url.searchParams.set('redirect_uri', REDIRECT_URI);
            url.searchParams.set('response_type', 'code');
            url.searchParams.set('scope', CALENDAR_SCOPE);
            url.searchParams.set('access_type', 'offline');
            url.searchParams.set('prompt', 'consent');
            url.searchParams.set('state', statePayload);

            console.log('[connect] returning OAuth URL | origin:', requestOrigin);
            return json({ url: url.toString() }, 200);
        }

        return json({ error: 'Unknown action' }, 400);
    }

    // ── DELETE: disconnect ───────────────────────────────────────────────────
    if (req.method === 'DELETE') {
        const authHeader = req.headers.get('Authorization') ?? '';
        const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
        const user = await getUserFromToken(jwt);
        if (!user) return json({ error: 'Unauthorized' }, 401);

        await db.from('google_calendar_connections').delete().eq('user_id', user.id);
        await db.from('google_calendar_events').delete().eq('user_id', user.id);

        return json({ ok: true }, 200);
    }

    // ── GET: Google OAuth callback ───────────────────────────────────────────
    if (req.method === 'GET') {
        const params = new URL(req.url).searchParams;
        const code = params.get('code');
        const stateRaw = params.get('state');
        const errorParam = params.get('error');

        // Default redirect target (fallback)
        let redirectOrigin = APP_ORIGIN;
        let jwt = '';

        // Decode the state payload (contains both jwt and origin)
        if (stateRaw) {
            try {
                const decoded = JSON.parse(atob(stateRaw));
                jwt = decoded.jwt ?? '';
                redirectOrigin = decoded.origin ?? APP_ORIGIN;
            } catch {
                // Legacy: state might just be a plain JWT
                jwt = stateRaw;
            }
        }

        if (errorParam || !code || !jwt) {
            return Response.redirect(
                `${redirectOrigin}/?calendar_error=${encodeURIComponent(errorParam ?? 'cancelled')}`,
                302
            );
        }

        // Verify the Supabase JWT
        const user = await getUserFromToken(jwt);
        if (!user) {
            console.error('[connect] GET: invalid JWT in state');
            return Response.redirect(`${redirectOrigin}/?calendar_error=invalid_token`, 302);
        }

        // Exchange code → tokens
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
            console.error('[connect] No refresh_token:', JSON.stringify(tokenData));
            return Response.redirect(`${redirectOrigin}/?calendar_error=no_refresh_token`, 302);
        }

        const { error: upsertErr } = await db.from('google_calendar_connections').upsert({
            user_id: user.id,
            refresh_token: tokenData.refresh_token,
            calendar_id: 'primary',
            connected_at: new Date().toISOString(),
            last_sync_at: null,
            sync_error: null,
            status: 'connected',
        });

        if (upsertErr) {
            console.error('[connect] DB upsert error:', upsertErr);
            return Response.redirect(`${redirectOrigin}/?calendar_error=db_error`, 302);
        }

        console.log('[connect] connection stored for user:', user.id);
        return Response.redirect(`${redirectOrigin}/?calendar_connected=1`, 302);
    }

    return json({ error: 'Method not allowed' }, 405);
});