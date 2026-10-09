import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import DashboardLayout from './layouts/DashboardLayout';

// Page Imports
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ResourcesPage from './pages/ResourcesPage';
import ResourceDetailsPage from './pages/ResourceDetailsPage';
import SchedulingPage from './pages/SchedulingPage';
import ActivityDetailsPage from './pages/ActivityDetailsPage';
import MaintenancePage from './pages/MaintenancePage';
import StaffPage from './pages/StaffPage';
import ConflictsPage from './pages/ConflictsPage';
import OptimisationPage from './pages/OptimisationPage';
import ScenariosPage from './pages/ScenariosPage';
import ReportsPage from './pages/ReportsPage';
import NotificationsPage from './pages/NotificationsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import AccessDeniedPage from './pages/AccessDeniedPage';
import NotFoundPage from './pages/NotFoundPage';
import LoadingSpinner from './components/LoadingSpinner';

function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner text="Authenticating operator session..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !hasRole(allowedRoles)) {
    return <Navigate to="/access-denied" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="resources" element={<ResourcesPage />} />
            <Route path="resources/:id" element={<ResourceDetailsPage />} />
            <Route path="scheduling" element={<SchedulingPage />} />
            <Route path="activities/:id" element={<ActivityDetailsPage />} />
            <Route path="maintenance" element={<MaintenancePage />} />
            <Route path="staff" element={<StaffPage />} />
            <Route path="conflicts" element={<ConflictsPage />} />
            <Route path="optimisation" element={<OptimisationPage />} />
            <Route path="scenarios" element={<ScenariosPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="profile" element={<ProfilePage />} />

            {/* Admin Protected Routes */}
            <Route
              path="audit-logs"
              element={
                <ProtectedRoute allowedRoles={['Administrator']}>
                  <AuditLogsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="settings"
              element={
                <ProtectedRoute allowedRoles={['Administrator']}>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />

            <Route path="access-denied" element={<AccessDeniedPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
