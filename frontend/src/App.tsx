import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';

import { AuthProvider, useAuth } from './context/AuthContext.tsx';

// Import pages
import HomePage from './pages/HomePage.tsx';
import LoginPage from './pages/LoginPage.tsx';
import RegisterPage from './pages/RegisterPage.tsx';
import FacilitiesPage from './pages/FacilitiesPage.tsx';
import FacilityDetailPage from './pages/FacilityDetailPage.tsx';
import BookingPage from './pages/BookingPage.tsx';
import DashboardPage from './pages/DashboardPage.tsx';
import ProfilePage from './pages/ProfilePage.tsx';

// Import missing pages
import BookingsListPage from './pages/BookingsListPage.tsx';
import BookingDetailPage from './pages/BookingDetailPage.tsx';
import OwnerFacilitiesPage from './pages/owner/OwnerFacilitiesPage.tsx';
import OwnerFacilityDetailPage from './pages/owner/OwnerFacilityDetailPage.tsx';
import AddFacilityPage from './pages/owner/AddFacilityPage.tsx';
import OwnerBookingsPage from './pages/owner/OwnerBookingsPage.tsx';

// Import components
import Layout from './components/Layout.tsx';
import LoadingSpinner from './components/LoadingSpinner.tsx';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'user' | 'owner' | 'admin';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole && user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Public Route Component (redirect if already authenticated)
interface PublicRouteProps {
  children: React.ReactNode;
}

const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="App min-h-screen bg-gray-50">
            <Routes>
              {/* Public routes */}
              <Route
                path="/"
                element={
                  <Layout>
                    <HomePage />
                  </Layout>
                }
              />
              <Route
                path="/facilities"
                element={
                  <Layout>
                    <FacilitiesPage />
                  </Layout>
                }
              />
              <Route
                path="/facilities/:id"
                element={
                  <Layout>
                    <FacilityDetailPage />
                  </Layout>
                }
              />

              {/* Auth routes */}
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <LoginPage />
                  </PublicRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <PublicRoute>
                    <RegisterPage />
                  </PublicRoute>
                }
              />

              {/* Protected routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <DashboardPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <ProfilePage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/book/:facilityId"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <BookingPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bookings"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <BookingsListPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bookings/:id"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <BookingDetailPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Owner routes */}
              <Route
                path="/owner/facilities"
                element={
                  <ProtectedRoute requiredRole="owner">
                    <Layout>
                      <OwnerFacilitiesPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/owner/facilities/new"
                element={
                  <ProtectedRoute requiredRole="owner">
                    <Layout>
                      <AddFacilityPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/owner/facilities/:id"
                element={
                  <ProtectedRoute requiredRole="owner">
                    <Layout>
                      <OwnerFacilityDetailPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/owner/bookings"
                element={
                  <ProtectedRoute requiredRole="owner">
                    <Layout>
                      <OwnerBookingsPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Admin routes - TODO: Implement admin pages */}
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Layout>
                      <div className="min-h-screen flex items-center justify-center">
                        <div className="text-center">
                          <h1 className="text-2xl font-bold text-gray-900 mb-4">Admin Pages</h1>
                          <p className="text-gray-600">Admin functionality coming soon...</p>
                        </div>
                      </div>
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Catch all route */}
              <Route
                path="*"
                element={
                  <Layout>
                    <div className="min-h-screen flex items-center justify-center">
                      <div className="text-center">
                        <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                        <p className="text-gray-600 mb-8">Page not found</p>
                        <a
                          href="/"
                          className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                          Go Home
                        </a>
                      </div>
                    </div>
                  </Layout>
                }
              />
            </Routes>

            {/* Toast notifications */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 5000,
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </div>
        </Router>

        {/* React Query DevTools */}
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;