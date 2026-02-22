import { createBrowserRouter } from 'react-router';
import { Home } from './screens/Home';
import { DayDetail } from './screens/DayDetail';
import { AddExpense } from './screens/AddExpense';
import { ReceiptUpload } from './screens/ReceiptUpload';
import { Categories } from './screens/Categories';
import { Settings } from './screens/Settings';
import { TransactionEdit } from './screens/TransactionEdit';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Home,
  },
  {
    path: '/day/:date',
    Component: DayDetail,
  },
  {
    path: '/add',
    Component: AddExpense,
  },
  {
    path: '/receipt-upload',
    Component: ReceiptUpload,
  },
  {
    path: '/categories',
    Component: Categories,
  },
  {
    path: '/settings',
    Component: Settings,
  },
  {
    path: '/transaction/:id',
    Component: TransactionEdit,
  },
  {
    path: '/settings/recurring',
    async lazy() {
      const { RecurringRules } = await import('./screens/RecurringRules');
      return { Component: RecurringRules };
    },
  },
  {
    path: '/settings/recurring/:id',
    async lazy() {
      const { RuleDetail } = await import('./screens/RuleDetail');
      return { Component: RuleDetail };
    },
  },
]);