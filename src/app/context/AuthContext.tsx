import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabaseClient';
import {
    getCalendarStatus,
    initiateGoogleCalendarConnect,
    syncGoogleCalendar,
    disconnectGoogleCalendar,
    CalendarStatus,
} from '../../lib/calendarService';
import { toast } from 'sonner';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    supabaseConfigured: boolean;

    signOut: () => Promise<void>;
    signInWithGoogle: () => Promise<void>;

    // Google Calendar
    calendarStatus: CalendarStatus | null;
    calendarStatusLoading: boolean;
    connectGoogleCalendar: () => Promise<void>;
    disconnectGoogleCalendar: () => Promise<void>;
    syncCalendar: () => Promise<void>;
    isSyncingCalendar: boolean;
    refreshCalendarStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    // Google Calendar state
    const [calendarStatus, setCalendarStatus] = useState<CalendarStatus | null>(null);
    const [calendarStatusLoading, setCalendarStatusLoading] = useState(false);
    const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);

    const supabaseConfigured = supabase !== null;

    const refreshCalendarStatus = useCallback(async () => {
        if (!supabaseConfigured) return;
        setCalendarStatusLoading(true);
        try {
            const status = await getCalendarStatus();
            setCalendarStatus(status);
        } catch {
            // Silently fail — calendar status is non-critical
        } finally {
            setCalendarStatusLoading(false);
        }
    }, [supabaseConfigured]);

    useEffect(() => {
        if (!supabaseConfigured) {
            setLoading(false);
            return;
        }

        // Get initial session (handles returning from OAuth redirect)
        supabase!.auth.getSession().then(({ data: { session }, error }) => {
            if (error) {
                console.error('Error getting session:', error);
            } else {
                setSession(session);
                setUser(session?.user ?? null);
            }
            setLoading(false);
        });

        // Listen for auth changes (fires after OAuth redirect)
        const {
            data: { subscription },
        } = supabase!.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [supabaseConfigured]);

    // Load calendar status when user signs in, and handle ?calendar_connected=1 redirect
    useEffect(() => {
        if (!user || !supabaseConfigured) {
            setCalendarStatus(null);
            return;
        }

        refreshCalendarStatus();

        // Handle redirect from Google consent screen
        const params = new URLSearchParams(window.location.search);
        if (params.get('calendar_connected') === '1') {
            toast.success('Google Calendar connected!');
            // Clean up URL without reloading
            window.history.replaceState({}, '', window.location.pathname);
        } else if (params.get('calendar_error')) {
            const errMsg = params.get('calendar_error');
            if (errMsg !== 'cancelled') {
                toast.error(`Calendar connection failed: ${errMsg}`);
            }
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, [user?.id, supabaseConfigured, refreshCalendarStatus]);

    const handleSignOut = async () => {
        if (!supabaseConfigured) return;
        try {
            const { error } = await supabase!.auth.signOut();
            if (error) throw error;
            setCalendarStatus(null);
            toast.success('Signed out successfully');
        } catch (error) {
            console.error('Sign out error:', error);
            toast.error('Failed to sign out');
        }
    };

    const handleSignInWithGoogle = async () => {
        if (!supabaseConfigured) return;
        try {
            const { error } = await supabase!.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    // Dynamic redirectTo so it works on both localhost and Vercel
                    redirectTo: window.location.origin,
                },
            });
            if (error) throw error;
            // Browser will redirect to Google — nothing more to do here
        } catch (error) {
            console.error('Google sign-in error:', error);
            // Re-throw so AuthModal can display a non-blocking error
            throw error;
        }
    };

    const handleConnectGoogleCalendar = async () => {
        await initiateGoogleCalendarConnect();
        // Browser will redirect — nothing more to do
    };

    const handleDisconnectGoogleCalendar = async () => {
        await disconnectGoogleCalendar();
        setCalendarStatus({
            connected: false,
            calendarId: null,
            connectedAt: null,
            lastSyncAt: null,
            syncError: null,
            status: null,
        });
        toast.success('Google Calendar disconnected');
    };

    const handleSyncCalendar = async () => {
        if (isSyncingCalendar) return;
        setIsSyncingCalendar(true);
        try {
            const result = await syncGoogleCalendar();
            toast.success(`Synced ${result.synced} day${result.synced !== 1 ? 's' : ''} to Google Calendar`);
            await refreshCalendarStatus();
        } catch (error: any) {
            toast.error(error?.message ?? 'Calendar sync failed');
            await refreshCalendarStatus(); // Reload to show sync_error from DB
        } finally {
            setIsSyncingCalendar(false);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                session,
                loading,
                supabaseConfigured,
                signOut: handleSignOut,
                signInWithGoogle: handleSignInWithGoogle,

                calendarStatus,
                calendarStatusLoading,
                connectGoogleCalendar: handleConnectGoogleCalendar,
                disconnectGoogleCalendar: handleDisconnectGoogleCalendar,
                syncCalendar: handleSyncCalendar,
                isSyncingCalendar,
                refreshCalendarStatus,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}