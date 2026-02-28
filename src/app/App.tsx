import { RouterProvider } from 'react-router';
import { router } from './routes';
import { ExpenseProvider, useExpense } from './context/ExpenseContext';
import { AuthProvider } from './context/AuthContext';
import { SelectionProvider } from './context/SelectionContext';
import { Toaster } from './components/ui/sonner';

function AppDataBlocker() {
  const { isHydrated } = useExpense();

  if (!isHydrated) {
    // A minimal loading state while we pull from IndexedDB
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-blue-600 animate-spin" />
        <p className="mt-4 text-sm text-gray-500 font-medium">Loading your data...</p>
      </div>
    );
  }

  return (
    <>
      <RouterProvider router={router} />
      <Toaster
        toastOptions={{
          style: { marginBottom: '80px' },
          className: 'z-[100]'
        }}
      />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ExpenseProvider>
        <SelectionProvider>
          <AppDataBlocker />
        </SelectionProvider>
      </ExpenseProvider>
    </AuthProvider>
  );
}