import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/auth/ProtectedRoute'
import { AppLayout } from '@/components/app-layout'
import { LoginPage } from '@/features/auth/LoginPage'
import { SignupPage } from '@/features/auth/SignupPage'
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
const PlatformSettingsPage = lazyPage(
  () => import('@/features/platform/PlatformSettingsPage'),
  'PlatformSettingsPage',
)

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  {
    element: <PlatformRoot />,
    children: [
      { path: 'system/login', element: <PlatformLoginPage /> },
      {
        element: <PlatformProtectedRoute />,
        children: [
          {
            element: <PlatformLayout />,
            children: [
              { path: 'system', element: <PlatformOverviewPage /> },
              { path: 'system/tenants', element: <TenantsListPage /> },
              { path: 'system/tenants/:id', element: <TenantDetailPage /> },
              { path: 'system/settings', element: <PlatformSettingsPage /> },
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
