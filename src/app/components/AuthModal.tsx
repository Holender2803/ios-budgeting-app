import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
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

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
    const [isSignIn, setIsSignIn] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Reset to "Sign in" mode whenever the modal opens
    useEffect(() => {
        if (open) {
            setIsSignIn(true);
            setEmail('');
            setPassword('');
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
                // In Supabase, if the user already exists, it might send a confirmation email or return an error depending on settings. 
                // We'll catch hard errors below, but if success, show a neutral security-friendly message.
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

    const toggleMode = () => {
        setIsSignIn(!isSignIn);
        setEmail('');
        setPassword('');
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

                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
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
            </DialogContent>
        </Dialog>
    );
}
