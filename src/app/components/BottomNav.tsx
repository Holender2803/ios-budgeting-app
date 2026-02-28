import { Home, PieChart, Plus, Wallet, Settings } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex-none bg-white border-t border-gray-200 safe-area-inset-bottom">
      <div className="max-w-lg mx-auto px-4 py-3 flex justify-between items-center">
        <button
          onClick={() => navigate('/')}
          className={`flex flex-col items-center gap-1 w-[4.5rem] py-1 rounded-lg transition-colors ${isActive('/') ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'
            }`}
        >
          <Home className="w-6 h-6" />
          <span className="text-[10px] font-medium">Home</span>
        </button>

        <button
          onClick={() => navigate('/reports')}
          className={`flex flex-col items-center gap-1 w-[4.5rem] py-1 rounded-lg transition-colors ${isActive('/reports') ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'
            }`}
        >
          <PieChart className="w-6 h-6" />
          <span className="text-[10px] font-medium">Reports</span>
        </button>

        <div className="w-[4.5rem] flex justify-center">
          <button
            onClick={() => navigate('/add')}
            className="flex items-center justify-center w-14 h-14 -mt-6 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 active:scale-95 transition-all"
          >
            <Plus className="w-7 h-7" />
          </button>
        </div>

        <button
          onClick={() => navigate('/budgets')}
          className={`flex flex-col items-center gap-1 w-[4.5rem] py-1 rounded-lg transition-colors ${isActive('/budgets') ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'
            }`}
        >
          <Wallet className="w-6 h-6" />
          <span className="text-[10px] font-medium">Budgets</span>
        </button>

        <button
          onClick={() => navigate('/settings')}
          className={`flex flex-col items-center gap-1 w-[4.5rem] py-1 rounded-lg transition-colors ${isActive('/settings') ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'
            }`}
        >
          <Settings className="w-6 h-6" />
          <span className="text-[10px] font-medium">Settings</span>
        </button>
      </div>
    </div>
  );
}
