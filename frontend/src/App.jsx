import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Login from './components/Login/Login';
import Dashboard from './components/Dashboard/Dashboard';
import InviteHandler from './components/Invite/InviteHandler';

function PrivateRoute({ children }) {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function PublicRoute({ children }) {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  return !isAuthenticated ? children : <Navigate to="/home" />;
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Root always tries to go home, which then handles auth */}
        <Route path="/" element={<Navigate to="/home" />} />
        
        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />
        
        <Route path="/invite/:token" element={<InviteHandler />} />
        
        <Route path="/home" element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;
