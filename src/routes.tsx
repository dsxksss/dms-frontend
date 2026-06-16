import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/auth/ProtectedRoute'
import { AppLayout } from '@/components/app-layout'
import { ComingSoonPage } from '@/components/coming-soon'
import { LoginPage } from '@/features/auth/LoginPage'
import { ProjectsListPage } from '@/features/projects/ProjectsListPage'
import { ProjectDetailPage } from '@/features/projects/ProjectDetailPage'
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
          { path: 'orgs', element: <ComingSoonPage titleKey="nav.organizations" /> },
          { path: 'audit', element: <ComingSoonPage titleKey="nav.audit" /> },
          { path: 'settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
