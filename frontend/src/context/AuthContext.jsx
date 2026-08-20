import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, setAccessToken, removeAccessToken, getAccessToken } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const { data } = await authAPI.getMe();
      setAccount(data.data);
    } catch (error) {
      console.error('Auth check failed:', error);
      // Try refreshing token
      try {
        const { data } = await authAPI.refreshToken();
        setAccessToken(data.data.accessToken);
        setAccount(data.data.account);
      } catch {
        removeAccessToken();
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const signup = async (formData) => {
    const { data } = await authAPI.signup(formData);
    setAccessToken(data.data.accessToken);
    setAccount(data.data.account);
    return data;
  };

  const login = async (formData) => {
    const { data } = await authAPI.login(formData);
    setAccessToken(data.data.accessToken);
    setAccount(data.data.account);
    return data;
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch {
      // Ignore errors during logout
    }
    removeAccessToken();
    setAccount(null);
    navigate('/login');
  };

  const updateAccount = (updates) => {
    setAccount(prev => ({ ...prev, ...updates }));
  };

  const value = {
    account,
    loading,
    isAuthenticated: !!account,
    signup,
    login,
    logout,
    updateAccount,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
