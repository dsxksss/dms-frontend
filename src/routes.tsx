import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { isStandalone } from '@/lib/edition'
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
const ProjectLayout = lazyPage(
  () => import('@/features/projects/ProjectWorkspace'),
  'ProjectLayout',
)
const ProjectOverviewSection = lazyPage(
  () => import('@/features/projects/ProjectWorkspace'),
  'ProjectOverviewSection',
)
const ProjectRegistrySection = lazyPage(
  () => import('@/features/projects/ProjectWorkspace'),
  'ProjectRegistrySection',
)
const ProjectDataSection = lazyPage(
  () => import('@/features/projects/ProjectWorkspace'),
  'ProjectDataSection',
)
const ProjectNotebookSection = lazyPage(
  () => import('@/features/projects/ProjectWorkspace'),
  'ProjectNotebookSection',
)
const ProjectDatasetsSection = lazyPage(
  () => import('@/features/projects/ProjectWorkspace'),
  'ProjectDatasetsSection',
)
const ProjectFilesSection = lazyPage(
  () => import('@/features/projects/ProjectWorkspace'),
  'ProjectFilesSection',
)
const ProjectAuditSection = lazyPage(
  () => import('@/features/projects/ProjectWorkspace'),
  'ProjectAuditSection',
)
const ProjectMembersSection = lazyPage(
  () => import('@/features/projects/ProjectWorkspace'),
  'ProjectMembersSection',
)
const DatasetDetailPage = lazyPage(
  () => import('@/features/datasets/DatasetDetailPage'),
  'DatasetDetailPage',
)
const PublicDatasetsPage = lazyPage(
  () => import('@/features/datasets/PublicDatasetsPage'),
  'PublicDatasetsPage',
)
const PlatformDatasetsPage = lazyPage(
  () => import('@/features/platform/PlatformDatasetsPage'),
  'PlatformDatasetsPage',
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
  // 自助注册仅自定义租户版（standalone）；WeMol 配套版重定向回登录。
  {
    path: '/signup',
    element: isStandalone ? <SignupPage /> : <Navigate to="/login" replace />,
  },
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
              { path: 'system/datasets', element: <PlatformDatasetsPage /> },
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
          { path: 'public-datasets', element: <PublicDatasetsPage /> },
          { path: 'orgs', element: <OrgsListPage /> },
          { path: 'orgs/:id', element: <OrgDetailPage /> },
          { path: 'orgs/:orgId/datasets/:dsId', element: <DatasetDetailPage /> },
          { path: 'inbox', element: <InboxPage /> },
          { path: 'audit', element: <AuditPage /> },
          { path: 'settings', element: <SettingsPage /> },
        ],
      },
      {
        element: <ProjectLayout />,
        children: [
          { path: 'projects/:id', element: <ProjectOverviewSection /> },
          { path: 'projects/:id/registry', element: <ProjectRegistrySection /> },
          { path: 'projects/:id/data', element: <ProjectDataSection /> },
          { path: 'projects/:id/notebook', element: <ProjectNotebookSection /> },
          { path: 'projects/:id/datasets', element: <ProjectDatasetsSection /> },
          { path: 'projects/:id/datasets/:dsId', element: <DatasetDetailPage /> },
          { path: 'projects/:id/files', element: <ProjectFilesSection /> },
          { path: 'projects/:id/audit', element: <ProjectAuditSection /> },
          { path: 'projects/:id/members', element: <ProjectMembersSection /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
