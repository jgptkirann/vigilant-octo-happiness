import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthContextType, RegisterForm } from '../types';
import { authAPI } from '../services/api.ts';
import { getStorageItem, setStorageItem, removeStorageItem, getErrorMessage } from '../utils/helpers.ts';
import toast from 'react-hot-toast';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = getStorageItem<string>('token', '');
        const storedUser = getStorageItem<User | null>('user', null);

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(storedUser);

          // Verify token is still valid
          try {
            const response = await authAPI.getCurrentUser();
            if (response.success) {
              setUser(response.data.user);
              setStorageItem('user', response.data.user);
            }
          } catch (error) {
            // Token is invalid, clear storage
            logout();
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (identifier: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await authAPI.login({ identifier, password });

      if (response.success) {
        const { user: userData, token: authToken, refreshToken } = response.data;
        
        setUser(userData);
        setToken(authToken);
        
        // Store in localStorage
        setStorageItem('user', userData);
        setStorageItem('token', authToken);
        setStorageItem('refreshToken', refreshToken);

        toast.success('Login successful!');
      }
    } catch (error) {
      const message = getErrorMessage(error);
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterForm): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await authAPI.register(data);

      if (response.success) {
        toast.success('Registration successful! Please check your email for verification.');
      }
    } catch (error) {
      const message = getErrorMessage(error);
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = (): void => {
    try {
      // Call logout API (optional, fire and forget)
      authAPI.logout().catch(() => {
        // Ignore errors
      });
    } catch (error) {
      // Ignore errors
    } finally {
      // Clear state
      setUser(null);
      setToken(null);

      // Clear localStorage
      removeStorageItem('user');
      removeStorageItem('token');
      removeStorageItem('refreshToken');

      toast.success('Logged out successfully');
    }
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    isLoading,
    isAuthenticated: !!user && !!token,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};