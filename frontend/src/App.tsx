import React, { useEffect } from 'react';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { useAppStore } from './store/useAppStore';
import { clearAuthToken } from './services/api';

export const App: React.FC = () => {
  const { user, setUser } = useAppStore();

  useEffect(() => {
    // Ensure that opening the application link always presents the 3D login page first
    clearAuthToken();
    setUser(null);
  }, [setUser]);

  const handleLoginSuccess = (userData: any) => {
    setUser(userData);
  };

  const handleLogout = () => {
    clearAuthToken();
    setUser(null);
  };

  return user ? (
    <DashboardPage onLogout={handleLogout} />
  ) : (
    <LoginPage onLoginSuccess={handleLoginSuccess} />
  );
};
