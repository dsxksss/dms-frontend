import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/auth/ProtectedRoute'
import { AppLayout } from '@/components/app-layout'
import { LoginPage } from '@/features/auth/LoginPage'
import { ProjectsListPage } from '@/features/projects/ProjectsListPage'
import { ProjectDetailPage } from '@/features/projects/ProjectDetailPage'
import { DatasetsListPage } from '@/features/datasets/DatasetsListPage'
import { DatasetDetailPage } from '@/features/datasets/DatasetDetailPage'
import { OrgsListPage } from '@/features/orgs/OrgsListPage'
import { OrgDetailPage } from '@/features/orgs/OrgDetailPage'
import { AuditPage } from '@/features/audit/AuditPage'
import { SettingsPage } from '@/features/settings/SettingsPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
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
          { path: 'audit', element: <AuditPage /> },
          { path: 'settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
