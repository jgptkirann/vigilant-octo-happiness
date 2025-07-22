import React from 'react';
import { Link } from 'react-router-dom';
import { 
  CalendarIcon, 
  ClockIcon, 
  CurrencyDollarIcon,
  MapPinIcon,
  UserIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext.tsx';
import { useBookings } from '../hooks/useBookings.ts';
import { formatCurrency, formatDate, formatTime, getStatusColor } from '../utils/helpers.ts';
import LoadingSpinner from '../components/LoadingSpinner.tsx';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { data: bookingsData, isLoading } = useBookings({ limit: 10 });

  const bookings = bookingsData?.data.bookings || [];

  const stats = [
    {
      name: 'Total Bookings',
      value: bookings.length,
      icon: CalendarIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: 'This Month',
      value: bookings.filter(booking => {
        const bookingDate = new Date(booking.bookingDate);
        const now = new Date();
        return bookingDate.getMonth() === now.getMonth() && 
               bookingDate.getFullYear() === now.getFullYear();
      }).length,
      icon: ClockIcon,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
    {
      name: 'Total Spent',
      value: formatCurrency(bookings.reduce((sum, booking) => sum + booking.totalAmount, 0)),
      icon: CurrencyDollarIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your bookings and account settings
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Link
            to="/facilities"
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                <PlusIcon className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Book a Court</h3>
                <p className="text-gray-600">Find and book futsal facilities</p>
              </div>
            </div>
          </Link>

          <Link
            to="/profile"
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <UserIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Edit Profile</h3>
                <p className="text-gray-600">Update your information</p>
              </div>
            </div>
          </Link>

          {user?.role === 'owner' && (
            <Link
              to="/owner/facilities"
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <MapPinIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">My Facilities</h3>
                  <p className="text-gray-600">Manage your facilities</p>
                </div>
              </div>
            </Link>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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

        {/* Recent Bookings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Recent Bookings</h2>
              <Link to="/bookings" className="text-emerald-600 hover:text-emerald-500 text-sm font-medium">
                View all
              </Link>
            </div>
          </div>

          {isLoading ? (
            <div className="p-6 flex justify-center">
              <LoadingSpinner size="medium" />
            </div>
          ) : bookings.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {bookings.slice(0, 5).map((booking) => (
                <div key={booking.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {booking.facilityName}
                        </h3>
                        <span className={`badge ${getStatusColor(booking.status)} capitalize`}>
                          {booking.status}
                        </span>
                      </div>
                      <div className="flex items-center text-gray-600 text-sm space-x-4">
                        <div className="flex items-center">
                          <CalendarIcon className="w-4 h-4 mr-1" />
                          {formatDate(booking.bookingDate)}
                        </div>
                        <div className="flex items-center">
                          <ClockIcon className="w-4 h-4 mr-1" />
                          {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                        </div>
                        <div className="flex items-center">
                          <CurrencyDollarIcon className="w-4 h-4 mr-1" />
                          {formatCurrency(booking.totalAmount)}
                        </div>
                      </div>
                    </div>
                    <div className="ml-4">
                      <Link
                        to={`/bookings/${booking.id}`}
                        className="btn btn-outline btn-sm"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center">
              <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings yet</h3>
              <p className="text-gray-600 mb-4">
                Start by booking your first futsal court
              </p>
              <Link to="/facilities" className="btn btn-primary">
                Browse Facilities
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;