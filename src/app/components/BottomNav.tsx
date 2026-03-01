import { Home, PieChart, Plus, Wallet, Settings } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;
  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/reports', label: 'Reports', icon: PieChart },
    { path: '/budgets', label: 'Budgets', icon: Wallet },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      <div className="flex-none safe-area-inset-bottom lg:hidden">
        <div className="mx-auto w-full max-w-lg px-0 md:px-4 md:pb-4">
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 md:rounded-[16px] md:border md:shadow-sm">
            {navItems.slice(0, 2).map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex flex-col items-center gap-1 w-[4.5rem] py-1 rounded-lg transition-colors ${isActive(item.path) ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </button>
              );
            })}

            <div className="w-[4.5rem] flex justify-center">
              <button
                onClick={() => navigate('/add')}
                className="flex items-center justify-center w-14 h-14 -mt-6 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 active:scale-95 transition-all"
              >
                <Plus className="w-7 h-7" />
              </button>
            </div>

            {navItems.slice(2).map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex flex-col items-center gap-1 w-[4.5rem] py-1 rounded-lg transition-colors ${isActive(item.path) ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="hidden lg:block fixed left-6 top-1/2 z-40 -translate-y-1/2">
        <div className="w-24 rounded-[24px] border border-[#E2E8F0] bg-white p-3 shadow-[0_24px_48px_rgba(15,23,42,0.08)]">
          <div className="space-y-2">
            {navItems.slice(0, 2).map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex w-full flex-col items-center gap-1 rounded-[18px] px-2 py-3 text-center transition-colors ${active ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[11px] font-semibold">{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="my-3 flex justify-center">
            <button
              onClick={() => navigate('/add')}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg transition-all hover:bg-blue-600 active:scale-95"
              aria-label="Add expense"
            >
              <Plus className="w-7 h-7" />
            </button>
          </div>

          <div className="space-y-2">
            {navItems.slice(2).map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex w-full flex-col items-center gap-1 rounded-[18px] px-2 py-3 text-center transition-colors ${active ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[11px] font-semibold">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
