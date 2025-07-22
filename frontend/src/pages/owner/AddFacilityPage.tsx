import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeftIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';

const AddFacilityPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            to="/owner/facilities"
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-1" />
            Back to facilities
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Add New Facility</h1>
          <p className="text-gray-600">Create a new futsal facility to start accepting bookings</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <BuildingOfficeIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Add Facility Form</h3>
          <p className="text-gray-600 mb-6">
            This feature is coming soon. You'll be able to add new facilities with details like location, 
            pricing, amenities, and operating hours.
          </p>
          <Link to="/owner/facilities" className="btn btn-primary">
            Back to My Facilities
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AddFacilityPage;