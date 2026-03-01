import { useNavigate } from 'react-router';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useExpense } from '../context/ExpenseContext';
import { toast } from 'sonner';
import { useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '../components/ui/alert-dialog';

export function PrivacyInfo() {
    const navigate = useNavigate();
    const { user, signOut } = useAuth();
    const { clearAllData } = useExpense();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteAccount = async () => {
        setIsDeleting(true);
        try {
            await clearAllData();
            await signOut();
            toast.success('Account and all data deleted');
            navigate('/');
        } catch (error) {
            console.error('Delete account failed:', error);
            toast.error('Failed to delete account');
        } finally {
            setIsDeleting(false);
        }
    };

    const sections = [
        {
            title: 'What we store',
            body: 'Your expenses, categories, budget limits, and app settings. Nothing else.',
        },
        {
            title: 'Where your data lives',
            body: 'Your data is stored securely in your own private account. We cannot access or view it.',
        },
        {
            title: 'Third-party services',
            body: 'We only connect to services you explicitly enable (such as Google Calendar). You can revoke access at any time.',
        },
        {
            title: 'Security',
            body: 'All data is encrypted in transit and at rest.',
        },
        {
            title: 'Your rights',
            body: 'You can export your data at any time or permanently delete your account and all associated data.',
        },
        {
            title: 'What we never do',
            body: 'We never sell your data. We never show ads. We never share or monetize your data.',
        },
    ];

    return (
        <div className="h-[100dvh] flex flex-col bg-gray-50">
            {/* Header */}
            <div className="flex-none bg-white border-b border-gray-200">
                <div className="app-shell-narrow py-4 flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                    >
                        <ArrowLeft className="w-4.5 h-4.5 text-gray-700" />
                    </button>
                    <h1 className="text-lg font-semibold text-gray-900">Privacy & Data</h1>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="app-shell-narrow py-6 space-y-6">
                    {sections.map((section) => (
                        <div key={section.title}>
                            <h3 className="text-[15px] font-semibold text-gray-900 mb-1.5">{section.title}</h3>
                            <p className="text-[14px] text-gray-600 leading-relaxed">{section.body}</p>
                        </div>
                    ))}

                    {/* Delete Account */}
                    {user && (
                        <div className="pt-6 border-t border-gray-200">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <button
                                        disabled={isDeleting}
                                        className="w-full py-3 px-4 rounded-xl border-2 border-red-200 text-red-600 font-medium text-[15px] hover:bg-red-50 transition-colors disabled:opacity-50"
                                    >
                                        {isDeleting ? 'Deleting...' : 'Delete My Account & All Data'}
                                    </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-2xl p-6">
                                    <AlertDialogHeader className="text-left space-y-3">
                                        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-2 mx-auto">
                                            <AlertTriangle className="w-6 h-6 text-red-600" />
                                        </div>
                                        <AlertDialogTitle className="text-xl text-center">Delete everything?</AlertDialogTitle>
                                        <AlertDialogDescription className="text-base text-center">
                                            This will permanently delete all your data from Supabase and sign you out. This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <div className="flex gap-3 mt-8">
                                        <AlertDialogCancel className="w-1/2 flex-1 rounded-xl h-12 m-0 bg-gray-100 hover:bg-gray-200 border-0 font-medium text-gray-900">
                                            Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleDeleteAccount}
                                            className="w-1/2 flex-1 rounded-xl h-12 m-0 bg-red-600 hover:bg-red-700 font-medium text-white shadow-none"
                                        >
                                            Delete Everything
                                        </AlertDialogAction>
                                    </div>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
