import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import LoadingSpinner from '../components/LoadingSpinner.tsx';

// Import role-specific dashboard components
import UserDashboard from '../components/dashboards/UserDashboard.tsx';
import OwnerDashboard from '../components/dashboards/OwnerDashboard.tsx';
import AdminDashboard from '../components/dashboards/AdminDashboard.tsx';

const DashboardPage: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You need to be logged in to access the dashboard.</p>
        </div>
      </div>
    );
  }

  // Render different dashboards based on user role
  switch (user.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'owner':
      return <OwnerDashboard />;
    case 'user':
    default:
      return <UserDashboard />;
  }
};

export default DashboardPage;