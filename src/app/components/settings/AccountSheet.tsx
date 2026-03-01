import { Drawer } from 'vaul';
import { LogOut, KeyRound, Mail, RefreshCw, Cloud, Unplug } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { toast } from 'sonner';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useAuth } from '../../context/AuthContext';
import { useExpense } from '../../context/ExpenseContext';
import { format } from 'date-fns';

// Inline Google "G" logo SVG
function GoogleIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 shrink-0" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.14 0 5.95 1.08 8.17 2.85l6.09-6.09C34.46 3.19 29.57 1 24 1 14.88 1 7.12 6.48 3.79 14.24l7.09 5.51C12.58 13.36 17.84 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.52 24.5c0-1.64-.15-3.22-.42-4.75H24v9h12.7c-.55 2.99-2.2 5.52-4.68 7.22l7.24 5.63C43.46 37.62 46.52 31.54 46.52 24.5z" />
            <path fill="#FBBC05" d="M10.88 28.25A14.54 14.54 0 0 1 9.5 24c0-1.47.25-2.89.7-4.22l-7.09-5.51A23.93 23.93 0 0 0 0 24c0 3.87.92 7.53 2.54 10.76l8.34-6.51z" />
            <path fill="#34A853" d="M24 47c5.57 0 10.25-1.84 13.67-5l-7.24-5.63C28.72 37.64 26.45 38.5 24 38.5c-6.16 0-11.42-3.86-13.12-9.25l-8.34 6.51C6.12 41.52 14.38 47 24 47z" />
        </svg>
    );
}

interface AccountSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AccountSheet({ open, onOpenChange }: AccountSheetProps) {
    const { user, signOut, connectGoogleCalendar, disconnectGoogleCalendar, calendarStatus } = useAuth();
    const { syncData, isSyncing, settings } = useExpense();
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    if (!user) return null;

    const email = user.email || '';
    const provider = user.app_metadata?.provider || 'email';
    // Check all linked identities — user.identities is an array of all auth providers
    const linkedProviders = user.identities?.map(id => id.provider) || [];
    const hasEmail = linkedProviders.includes('email') || provider === 'email';

    // Sync display
    const lastSyncDisplay = settings.lastPullAt
        ? format(new Date(settings.lastPullAt), 'MMM d, h:mm a')
        : 'Never';

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase!.auth.updateUser({ password: newPassword });
            if (error) throw error;
            toast.success('Password updated successfully');
            setShowChangePassword(false);
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            toast.error(error.message || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    const handleSignOut = async () => {
        await signOut();
        onOpenChange(false);
    };

    const handleConnectGoogle = async () => {
        try {
            await connectGoogleCalendar();
            // Browser will redirect
        } catch (error: any) {
            toast.error(error?.message || 'Failed to connect Google');
        }
    };

    const handleDisconnectGoogle = async () => {
        try {
            await disconnectGoogleCalendar();
            toast.success('Google Calendar disconnected');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to disconnect');
        }
    };

    const handleSync = async () => {
        try {
            await syncData();
            toast.success('Synced with cloud');
        } catch (error: any) {
            toast.error(error?.message || 'Sync failed');
        }
    };

    return (
        <Drawer.Root open={open} onOpenChange={(v) => {
            if (!v) {
                setShowChangePassword(false);
                setNewPassword('');
                setConfirmPassword('');
            }
            onOpenChange(v);
        }}>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
                <Drawer.Content className="app-drawer-frame">
                    <div className="app-drawer-panel">
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-2">
                            <div className="w-10 h-1 rounded-full bg-gray-300" />
                        </div>

                        <div className="px-5 pb-2">
                            <h3 className="text-lg font-semibold text-gray-900">Account</h3>
                        </div>

                        <div className="px-4 pb-8 space-y-3 overflow-y-auto">
                            {/* Email info */}
                            <div className="flex items-center gap-3 px-3 py-3 bg-gray-50 rounded-xl">
                                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                                    <Mail className="w-4 h-4 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-gray-500">Email</p>
                                    <p className="text-[14px] font-medium text-gray-900 truncate">{email}</p>
                                </div>
                                <span className="text-[11px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                                    {provider === 'google' ? 'Google' : 'Email'}
                                </span>
                            </div>

                            {/* Cloud sync status */}
                            <button
                                onClick={handleSync}
                                disabled={isSyncing}
                                className="w-full flex items-center gap-3 px-3 py-3 bg-blue-50/60 rounded-xl border border-blue-100 hover:bg-blue-50 transition-colors disabled:opacity-60"
                            >
                                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                                    {isSyncing ? (
                                        <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                                    ) : (
                                        <Cloud className="w-4 h-4 text-blue-600" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                    <p className="text-[14px] font-medium text-gray-900">
                                        {isSyncing ? 'Syncing…' : 'Cloud Backup'}
                                    </p>
                                    <p className="text-[11px] text-gray-500">
                                        Last synced · {lastSyncDisplay}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    <span className="text-[11px] text-green-600 font-medium">Active</span>
                                </div>
                            </button>

                            {/* Google Calendar connection status */}
                            {calendarStatus?.connected ? (
                                <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-green-50/60 border border-green-100">
                                    <GoogleIcon />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[15px] font-medium text-gray-700">Google Account</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2 h-2 rounded-full bg-green-500" />
                                            <span className="text-[12px] text-green-600 font-medium">Connected</span>
                                        </div>
                                        <button
                                            onClick={handleDisconnectGoogle}
                                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                            title="Disconnect Google"
                                        >
                                            <Unplug className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={handleConnectGoogle}
                                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100"
                                >
                                    <GoogleIcon />
                                    <span className="text-[15px] font-medium text-gray-700">Connect Google Calendar</span>
                                    <span className="text-[11px] text-gray-400 ml-auto">Enable Sync</span>
                                </button>
                            )}

                            {/* Change Password — only for email/password users */}
                            {hasEmail && (
                                <>
                                    {!showChangePassword ? (
                                        <button
                                            onClick={() => setShowChangePassword(true)}
                                            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-gray-50 transition-colors"
                                        >
                                            <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center">
                                                <KeyRound className="w-4 h-4 text-amber-600" />
                                            </div>
                                            <span className="text-[15px] font-medium text-gray-900">Change Password</span>
                                        </button>
                                    ) : (
                                        <form onSubmit={handleChangePassword} className="bg-gray-50 rounded-xl p-4 space-y-3">
                                            <p className="text-sm font-medium text-gray-700">New Password</p>
                                            <Input
                                                type="password"
                                                placeholder="New password (min 6 chars)"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                required
                                                minLength={6}
                                                className="rounded-xl h-11 px-4 bg-white border-gray-200"
                                            />
                                            <Input
                                                type="password"
                                                placeholder="Confirm password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                required
                                                className="rounded-xl h-11 px-4 bg-white border-gray-200"
                                            />
                                            <div className="flex gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setShowChangePassword(false);
                                                        setNewPassword('');
                                                        setConfirmPassword('');
                                                    }}
                                                    className="flex-1 h-10 rounded-xl"
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    type="submit"
                                                    disabled={loading}
                                                    className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
                                                >
                                                    {loading ? 'Updating…' : 'Update'}
                                                </Button>
                                            </div>
                                        </form>
                                    )}
                                </>
                            )}

                            {/* Divider */}
                            <div className="border-t border-gray-100 my-1" />

                            {/* Sign Out */}
                            <button
                                onClick={handleSignOut}
                                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-red-50 transition-colors"
                            >
                                <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center">
                                    <LogOut className="w-4 h-4 text-red-500" />
                                </div>
                                <span className="text-[15px] font-medium text-red-600">Sign Out</span>
                            </button>
                        </div>
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}
