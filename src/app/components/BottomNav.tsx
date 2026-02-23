import { Home, Plus, Settings } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex-none bg-white border-t border-gray-200 safe-area-inset-bottom">
      <div className="max-w-lg mx-auto px-6 py-3 flex justify-around items-center">
        <button
          onClick={() => navigate('/')}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${isActive('/') ? 'text-blue-500' : 'text-gray-500'
            }`}
        >
          <Home className="w-6 h-6" />
          <span className="text-xs">Home</span>
        </button>

        <button
          onClick={() => navigate('/add')}
          className="flex items-center justify-center w-14 h-14 -mt-6 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-7 h-7" />
        </button>

        <button
          onClick={() => navigate('/settings')}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${isActive('/settings') ? 'text-blue-500' : 'text-gray-500'
            }`}
        >
          <Settings className="w-6 h-6" />
          <span className="text-xs">Settings</span>
        </button>
      </div>
    </div>
  );
}
