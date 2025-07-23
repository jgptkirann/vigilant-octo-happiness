import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  BuildingOfficeIcon,
  PlusIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { useFacilities } from '../../hooks/useFacilities.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { formatCurrency } from '../../utils/helpers.ts';
import LoadingSpinner from '../../components/LoadingSpinner.tsx';

const OwnerFacilitiesPage: React.FC = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useFacilities({ 
    ownerId: user?.id, 
    page, 
    limit: 12 
  });

  const facilities = data?.data.facilities || [];
  const meta = data?.meta;

  const filteredFacilities = facilities.filter(facility =>
    facility.name.toLowerCase().includes(search.toLowerCase()) ||
    facility.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Facilities</h1>
              <p className="text-gray-600 mt-1">Manage your futsal facilities and track their performance</p>
            </div>
            <Link
              to="/owner/facilities/new"
              className="btn btn-primary flex items-center"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Add Facility
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="relative">
                <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search facilities..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="text-sm text-gray-600">
              {meta?.total || 0} total facilities
            </div>
          </div>
        </div>

        {/* Facilities Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="large" />
          </div>
        ) : error ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-red-500 mb-4">
              <BuildingOfficeIcon className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Facilities</h3>
            <p className="text-gray-600">There was an error loading your facilities. Please try again.</p>
          </div>
        ) : filteredFacilities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFacilities.map((facility) => (
              <div key={facility.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                {/* Image */}
                <div className="aspect-video bg-gray-100 relative">
                  {facility.images.length > 0 ? (
                    <img
                      src={facility.images[0]}
                      alt={facility.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <BuildingOfficeIcon className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    <span className={`badge ${facility.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {facility.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{facility.name}</h3>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPinIcon className="w-4 h-4 mr-2" />
                      <span className="truncate">{facility.address}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <CurrencyDollarIcon className="w-4 h-4 mr-2" />
                      <span>{formatCurrency(facility.pricing.perHour)}/hour</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4 text-center">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-lg font-semibold text-gray-900">{facility.rating.toFixed(1)}</div>
                      <div className="text-xs text-gray-600">Rating</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-lg font-semibold text-gray-900">{facility.totalReviews}</div>
                      <div className="text-xs text-gray-600">Reviews</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <Link
                      to={`/facilities/${facility.id}`}
                      className="flex-1 btn btn-outline btn-sm flex items-center justify-center"
                    >
                      <EyeIcon className="w-4 h-4 mr-1" />
                      View
                    </Link>
                    <Link
                      to={`/owner/facilities/${facility.id}`}
                      className="flex-1 btn btn-primary btn-sm flex items-center justify-center"
                    >
                      <PencilIcon className="w-4 h-4 mr-1" />
                      Manage
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <BuildingOfficeIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No facilities found</h3>
            <p className="text-gray-600 mb-6">
              {search
                ? 'No facilities match your search criteria.'
                : "You haven't added any facilities yet."}
            </p>
            {!search && (
              <Link to="/owner/facilities/new" className="btn btn-primary">
                <PlusIcon className="w-5 h-5 mr-2" />
                Add Your First Facility
              </Link>
            )}
          </div>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between bg-white px-6 py-3 rounded-lg shadow-sm border border-gray-200 mt-8">
            <div className="text-sm text-gray-700">
              Showing {((meta.page - 1) * meta.limit) + 1} to {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} results
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="btn btn-outline btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm text-gray-700">
                Page {meta.page} of {meta.totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(meta.totalPages, page + 1))}
                disabled={page === meta.totalPages}
                className="btn btn-outline btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerFacilitiesPage;