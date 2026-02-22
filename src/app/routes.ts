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
]);