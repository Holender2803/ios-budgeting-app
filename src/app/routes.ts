import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { Home } from './screens/Home';
import { DayDetail } from './screens/DayDetail';
import { AddExpense } from './screens/AddExpense';
import { Categories } from './screens/Categories';
import { Settings } from './screens/Settings';
import { Reports } from './screens/Reports';
import { TransactionEdit } from './screens/TransactionEdit';
import { BudgetSettings } from './screens/BudgetSettings';

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
    element: React.createElement(Navigate, { to: '/add', replace: true }),
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
    path: '/settings/budgets',
    Component: BudgetSettings,
  },
  {
    path: '/transaction/:id',
    Component: TransactionEdit,
  },
  {
    path: '/reports',
    Component: Reports,
  },
  {
    path: '/budgets',
    async lazy() {
      const { BudgetsTracking } = await import('./screens/BudgetsTracking');
      return { Component: BudgetsTracking };
    },
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
  {
    path: '/settings/privacy',
    async lazy() {
      const { PrivacyInfo } = await import('./screens/PrivacyInfo');
      return { Component: PrivacyInfo };
    },
  },
  {
    path: '/settings/notifications',
    async lazy() {
      const { NotificationsPlaceholder } = await import('./screens/NotificationsPlaceholder');
      return { Component: NotificationsPlaceholder };
    },
  },
]);
