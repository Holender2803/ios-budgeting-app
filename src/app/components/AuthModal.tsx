import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { toast } from 'sonner';

interface AuthModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

// Inline Google "G" logo SVG (no external dependency)
function GoogleIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 48 48"
            className="w-5 h-5 shrink-0"
            aria-hidden="true"
        >
            <path
                fill="#EA4335"
                d="M24 9.5c3.14 0 5.95 1.08 8.17 2.85l6.09-6.09C34.46 3.19 29.57 1 24 1 14.88 1 7.12 6.48 3.79 14.24l7.09 5.51C12.58 13.36 17.84 9.5 24 9.5z"
            />
            <path
                fill="#4285F4"
                d="M46.52 24.5c0-1.64-.15-3.22-.42-4.75H24v9h12.7c-.55 2.99-2.2 5.52-4.68 7.22l7.24 5.63C43.46 37.62 46.52 31.54 46.52 24.5z"
            />
            <path
                fill="#FBBC05"
                d="M10.88 28.25A14.54 14.54 0 0 1 9.5 24c0-1.47.25-2.89.7-4.22l-7.09-5.51A23.93 23.93 0 0 0 0 24c0 3.87.92 7.53 2.54 10.76l8.34-6.51z"
            />
            <path
                fill="#34A853"
                d="M24 47c5.57 0 10.25-1.84 13.67-5l-7.24-5.63C28.72 37.64 26.45 38.5 24 38.5c-6.16 0-11.42-3.86-13.12-9.25l-8.34 6.51C6.12 41.52 14.38 47 24 47z"
            />
        </svg>
    );
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
    const { supabaseConfigured, signInWithGoogle } = useAuth();

    const [isSignIn, setIsSignIn] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [oauthError, setOauthError] = useState<string | null>(null);

    // Reset to "Sign in" mode whenever the modal opens
    useEffect(() => {
        if (open) {
            setIsSignIn(true);
            setEmail('');
            setPassword('');
            setOauthError(null);
        }
    }, [open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) return;

        setLoading(true);

        try {
            if (isSignIn) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                toast.success('Signed in successfully');
                onOpenChange(false);
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;

                toast.success("If an account exists for this email, you'll receive a confirmation link. Otherwise, you can sign in.");
                setIsSignIn(true);
                setPassword('');
            }
        } catch (error: any) {
            toast.error(error.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setOauthError(null);
        try {
            await signInWithGoogle();
            // Browser redirects to Google — modal will close naturally
        } catch (error: any) {
            setOauthError(error?.message || 'Google sign-in failed. Please try again.');
        }
    };

    const toggleMode = () => {
        setIsSignIn(!isSignIn);
        setEmail('');
        setPassword('');
        setOauthError(null);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md w-[calc(100%-2rem)] rounded-2xl p-6">
                <DialogHeader>
                    <DialogTitle className="text-xl text-center">
                        {isSignIn ? 'Sign In' : 'Create Account'}
                    </DialogTitle>
                    <DialogDescription className="text-center">
                        {isSignIn
                            ? 'Sign in to access your cloud backups and sync.'
                            : 'Create an account to backup and sync your expenses.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                    {/* Google OAuth button — only shown when Supabase is configured */}
                    {supabaseConfigured && (
                        <>
                            <Button
                                type="button"
                                onClick={handleGoogleSignIn}
                                variant="outline"
                                className="w-full h-12 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium shadow-sm transition-colors flex items-center justify-center gap-3"
                            >
                                <GoogleIcon />
                                Continue with Google
                            </Button>

                            {/* Non-blocking error message for OAuth failures */}
                            {oauthError && (
                                <p className="text-xs text-red-500 text-center -mt-2">
                                    {oauthError}
                                </p>
                            )}

                            {/* Divider */}
                            <div className="flex items-center gap-3">
                                <div className="h-px flex-1 bg-gray-200" />
                                <span className="text-xs text-gray-400 font-medium">or</span>
                                <div className="h-px flex-1 bg-gray-200" />
                            </div>
                        </>
                    )}

                    {/* Email / password form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Input
                                type="email"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="rounded-xl h-12 px-4 bg-gray-50 border-gray-200"
                            />
                        </div>
                        <div className="space-y-2">
                            <Input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="rounded-xl h-12 px-4 bg-gray-50 border-gray-200"
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-colors"
                        >
                            {loading ? 'Processing...' : isSignIn ? 'Sign In' : 'Create Account'}
                        </Button>

                        <div className="text-center mt-4">
                            <button
                                type="button"
                                onClick={toggleMode}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                                {isSignIn
                                    ? "Don't have an account? Sign up"
                                    : 'Already have an account? Sign in'}
                            </button>
                        </div>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
