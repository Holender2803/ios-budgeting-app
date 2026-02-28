import { useNavigate } from 'react-router';
import { ArrowLeft, Bell } from 'lucide-react';

export function NotificationsPlaceholder() {
    const navigate = useNavigate();

    return (
        <div className="h-[100dvh] flex flex-col bg-gray-50">
            {/* Header */}
            <div className="flex-none bg-white border-b border-gray-200">
                <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                    >
                        <ArrowLeft className="w-4.5 h-4.5 text-gray-700" />
                    </button>
                    <h1 className="text-lg font-semibold text-gray-900">Notifications & Alerts</h1>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center px-8">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                        <Bell className="w-7 h-7 text-gray-400" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Coming Soon</h2>
                    <p className="text-sm text-gray-500 leading-relaxed max-w-[260px] mx-auto">
                        Notification settings will be available in a future update. Stay tuned!
                    </p>
                </div>
            </div>
        </div>
    );
}
