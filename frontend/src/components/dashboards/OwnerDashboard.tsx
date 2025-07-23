import React from 'react';
import { Link } from 'react-router-dom';
import { 
  CalendarIcon, 
  CurrencyDollarIcon,
  MapPinIcon,
  UserIcon,
  PlusIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext.tsx';
import { useFacilities } from '../../hooks/useFacilities.ts';
import { formatCurrency } from '../../utils/helpers.ts';
import LoadingSpinner from '../LoadingSpinner.tsx';

const OwnerDashboard: React.FC = () => {
  const { user } = useAuth();
  const { data: facilitiesData, isLoading } = useFacilities({ 
    ownerId: user?.id, 
    limit: 10 
  });

  const facilities = facilitiesData?.data.facilities || [];

  // Mock stats - in a real app, these would come from API
  const stats = [
    {
      name: 'Total Facilities',
      value: facilities.length,
      icon: BuildingOfficeIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: 'Active Bookings',
      value: '23', // This would come from API
      icon: CalendarIcon,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
    {
      name: 'Monthly Revenue',
      value: formatCurrency(85000), // This would come from API
      icon: CurrencyDollarIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      name: 'Total Views',
      value: '1,245', // This would come from API
      icon: EyeIcon,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Owner Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Welcome back, {user?.name}! Manage your facilities and bookings
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Link
            to="/owner/facilities/new"
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                <PlusIcon className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Add Facility</h3>
                <p className="text-gray-600">Create a new futsal facility</p>
              </div>
            </div>
          </Link>

          <Link
            to="/owner/facilities"
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <MapPinIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">My Facilities</h3>
                <p className="text-gray-600">Manage your facilities</p>
              </div>
            </div>
          </Link>

          <Link
            to="/owner/bookings"
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <CalendarIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Bookings</h3>
                <p className="text-gray-600">View and manage bookings</p>
              </div>
            </div>
          </Link>

          <Link
            to="/owner/analytics"
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                <ChartBarIcon className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Analytics</h3>
                <p className="text-gray-600">View performance metrics</p>
              </div>
            </div>
          </Link>

          <Link
            to="/profile"
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                <UserIcon className="w-6 h-6 text-gray-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Profile</h3>
                <p className="text-gray-600">Update your information</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.name} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                    <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* My Facilities */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">My Facilities</h2>
                <Link to="/owner/facilities" className="text-emerald-600 hover:text-emerald-500 text-sm font-medium">
                  View all
                </Link>
              </div>
            </div>

            {isLoading ? (
              <div className="p-6 flex justify-center">
                <LoadingSpinner size="medium" />
              </div>
            ) : facilities.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {facilities.slice(0, 3).map((facility) => (
                  <div key={facility.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {facility.name}
                          </h3>
                          <span className={`badge ${facility.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {facility.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="flex items-center text-gray-600 text-sm space-x-4">
                          <div className="flex items-center">
                            <MapPinIcon className="w-4 h-4 mr-1" />
                            {facility.address}
                          </div>
                          <div className="flex items-center">
                            <CurrencyDollarIcon className="w-4 h-4 mr-1" />
                            {formatCurrency(facility.pricing.perHour)}/hour
                          </div>
                        </div>
                      </div>
                      <div className="ml-4">
                        <Link
                          to={`/owner/facilities/${facility.id}`}
                          className="btn btn-outline btn-sm"
                        >
                          Manage
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center">
                <BuildingOfficeIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No facilities yet</h3>
                <p className="text-gray-600 mb-4">
                  Create your first facility to start accepting bookings
                </p>
                <Link to="/owner/facilities/new" className="btn btn-primary">
                  Add Facility
                </Link>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {/* Mock activity items - in a real app, these would come from API */}
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <CalendarIcon className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">New booking received</p>
                    <p className="text-xs text-gray-500">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">Profile updated</p>
                    <p className="text-xs text-gray-500">1 day ago</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <CurrencyDollarIcon className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">Payment received</p>
                    <p className="text-xs text-gray-500">2 days ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;