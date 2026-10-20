import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { initTheme } from './slices/themeSlice';
import Login from './components/Login/Login';
import Dashboard from './components/Dashboard/Dashboard';
import InviteHandler from './components/Invite/InviteHandler';
import SuperAdminDashboard from './components/SuperAdmin/SuperAdminDashboard';
import { fetchCurrentProfile } from './slices/authSlice';

// Protected route for normal user workspace (Dashboard)
function UserWorkspaceRoute({ children }) {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

// Protected route strictly for Super Admin Dashboard
function SuperAdminRoute({ children }) {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'superadmin') return <Navigate to="/home" replace />;
  return children;
}

function AppContent() {
  const dispatch = useDispatch();
  const location = useLocation();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const isSuperAdminRoute = location.pathname.startsWith('/superadmin');
  
  useEffect(() => {
    // Only apply the superadmin executive theme when actively viewing /superadmin
    dispatch(initTheme({ isSuperAdmin: isSuperAdminRoute }));
    if (isAuthenticated) {
      dispatch(fetchCurrentProfile());
    }
  }, [dispatch, isAuthenticated, isSuperAdminRoute]);

  return (
    <Routes>
      {/* Default click URL: Always opens the login page */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      
      {/* Login page: If super admin logs in, goes to /superadmin; if normal user logs in, goes to /home */}
      <Route path="/login" element={<Login />} />
      
      <Route path="/invite/:token" element={<InviteHandler />} />
      
      <Route path="/home" element={
        <UserWorkspaceRoute>
          <Dashboard />
        </UserWorkspaceRoute>
      } />

      <Route path="/dashboard" element={
        <UserWorkspaceRoute>
          <Dashboard />
        </UserWorkspaceRoute>
      } />

      <Route path="/superadmin" element={
        <SuperAdminRoute>
          <SuperAdminDashboard />
        </SuperAdminRoute>
      } />

      {/* Fallback for any other unmatched URL */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
