import React from 'react';
import { Link } from 'react-router-dom';
import { 
  CalendarIcon
} from '@heroicons/react/24/outline';

const OwnerBookingsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Facility Bookings</h1>
          <p className="text-gray-600 mt-1">Manage bookings for all your facilities</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Booking Management</h3>
          <p className="text-gray-600 mb-6">
            This feature is coming soon. You'll be able to view all bookings for your facilities, 
            approve or reject booking requests, and manage scheduling conflicts.
          </p>
          <Link to="/dashboard" className="btn btn-primary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OwnerBookingsPage;