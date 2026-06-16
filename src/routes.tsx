import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/auth/ProtectedRoute'
import { LoginPage } from '@/features/auth/LoginPage'
import { HomePage } from '@/features/home/HomePage'

// M1：登录 + 受保护首页。后续里程碑在受保护子树下挂 AppLayout 与各模块路由。
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [{ path: '/', element: <HomePage /> }],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
