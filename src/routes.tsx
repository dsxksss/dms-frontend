import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/auth/ProtectedRoute'
import { AdminProtectedRoute } from '@/auth/AdminProtectedRoute'
import { AppLayout } from '@/components/app-layout'
import { AdminLayout } from '@/components/admin-layout'
import { LoginPage } from '@/features/auth/LoginPage'
import { SignupPage } from '@/features/auth/SignupPage'
import { SignupTenantPage } from '@/features/auth/SignupTenantPage'
import { AdminLoginPage } from '@/features/admin/AdminLoginPage'
import { PlatformRoot } from '@/platform/PlatformRoot'
import { PlatformProtectedRoute } from '@/platform/PlatformProtectedRoute'
import { PlatformLayout } from '@/platform/PlatformLayout'
import { PlatformLoginPage } from '@/features/platform/PlatformLoginPage'

// 业务页面按路由懒加载（首屏只载登录/壳）。
const lazyPage = <T extends Record<string, React.ComponentType>>(
  loader: () => Promise<T>,
  name: keyof T,
) => lazy(() => loader().then((m) => ({ default: m[name] })))

const ProjectsListPage = lazyPage(
  () => import('@/features/projects/ProjectsListPage'),
  'ProjectsListPage',
)
const ProjectDetailPage = lazyPage(
  () => import('@/features/projects/ProjectDetailPage'),
  'ProjectDetailPage',
)
const DatasetsListPage = lazyPage(
  () => import('@/features/datasets/DatasetsListPage'),
  'DatasetsListPage',
)
const DatasetDetailPage = lazyPage(
  () => import('@/features/datasets/DatasetDetailPage'),
  'DatasetDetailPage',
)
const OrgsListPage = lazyPage(() => import('@/features/orgs/OrgsListPage'), 'OrgsListPage')
const OrgDetailPage = lazyPage(
  () => import('@/features/orgs/OrgDetailPage'),
  'OrgDetailPage',
)
const AuditPage = lazyPage(() => import('@/features/audit/AuditPage'), 'AuditPage')
const InboxPage = lazyPage(
  () => import('@/features/membership/InboxPage'),
  'InboxPage',
)
const SettingsPage = lazyPage(
  () => import('@/features/settings/SettingsPage'),
  'SettingsPage',
)
const AdminOverviewPage = lazyPage(
  () => import('@/features/admin/AdminOverviewPage'),
  'AdminOverviewPage',
)
const AdminUsersPage = lazyPage(
  () => import('@/features/admin/AdminUsersPage'),
  'AdminUsersPage',
)
const PlatformOverviewPage = lazyPage(
  () => import('@/features/platform/PlatformOverviewPage'),
  'PlatformOverviewPage',
)
const TenantsListPage = lazyPage(
  () => import('@/features/platform/TenantsListPage'),
  'TenantsListPage',
)
const TenantDetailPage = lazyPage(
  () => import('@/features/platform/TenantDetailPage'),
  'TenantDetailPage',
)

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  { path: '/signup/tenant', element: <SignupTenantPage /> },
  { path: '/admin/login', element: <AdminLoginPage /> },
  {
    element: <AdminProtectedRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: 'admin', element: <AdminOverviewPage /> },
          { path: 'admin/orgs', element: <OrgsListPage /> },
          { path: 'admin/orgs/:id', element: <OrgDetailPage /> },
          { path: 'admin/users', element: <AdminUsersPage /> },
          { path: 'admin/audit', element: <AuditPage /> },
        ],
      },
    ],
  },
  {
    element: <PlatformRoot />,
    children: [
      { path: 'platform/login', element: <PlatformLoginPage /> },
      {
        element: <PlatformProtectedRoute />,
        children: [
          {
            element: <PlatformLayout />,
            children: [
              { path: 'platform', element: <PlatformOverviewPage /> },
              { path: 'platform/tenants', element: <TenantsListPage /> },
              { path: 'platform/tenants/:id', element: <TenantDetailPage /> },
            ],
          },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/projects" replace /> },
          { path: 'projects', element: <ProjectsListPage /> },
          { path: 'projects/:id', element: <ProjectDetailPage /> },
          { path: 'datasets', element: <DatasetsListPage /> },
          { path: 'datasets/:id', element: <DatasetDetailPage /> },
          { path: 'orgs', element: <OrgsListPage /> },
          { path: 'orgs/:id', element: <OrgDetailPage /> },
          { path: 'inbox', element: <InboxPage /> },
          { path: 'audit', element: <AuditPage /> },
          { path: 'settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
