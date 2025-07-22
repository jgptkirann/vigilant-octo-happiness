import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  MapPinIcon, 
  StarIcon, 
  FunnelIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { useFacilities } from '../hooks/useFacilities';
import { formatCurrency, debounce } from '../utils/helpers';
import { SearchFilters } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

const FacilitiesPage: React.FC = () => {
  const [filters, setFilters] = useState<SearchFilters>({
    search: '',
    sortBy: 'rating',
    sortOrder: 'desc',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useFacilities({ 
    ...filters, 
    page, 
    limit: 12 
  });

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((searchTerm: string) => {
      setFilters(prev => ({ ...prev, search: searchTerm }));
      setPage(1);
    }, 500),
    []
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleSortChange = (sortBy: string, sortOrder: 'asc' | 'desc') => {
    setFilters(prev => ({ ...prev, sortBy, sortOrder }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      sortBy: 'rating',
      sortOrder: 'desc',
    });
    setPage(1);
  };

  const facilities = data?.data.facilities || [];
  const meta = data?.meta;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-emerald-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">
              Find Your Perfect Futsal Court
            </h1>
            <p className="text-xl text-emerald-100 mb-8">
              Discover and book the best futsal facilities across Nepal
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by facility name or location..."
                  className="w-full pl-10 pr-4 py-3 text-gray-900 placeholder-gray-500 bg-white border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  onChange={handleSearchChange}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="w-full lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden p-2 text-gray-500 hover:text-gray-700"
                >
                  <FunnelIcon className="w-5 h-5" />
                </button>
              </div>

              <div className={`space-y-6 ${showFilters ? 'block' : 'hidden lg:block'}`}>
                {/* Sort By */}
                <div>
                  <label className="form-label">Sort By</label>
                  <select
                    value={`${filters.sortBy}-${filters.sortOrder}`}
                    onChange={(e) => {
                      const [sortBy, sortOrder] = e.target.value.split('-');
                      handleSortChange(sortBy, sortOrder as 'asc' | 'desc');
                    }}
                    className="form-select"
                  >
                    <option value="rating-desc">Highest Rated</option>
                    <option value="rating-asc">Lowest Rated</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="name-asc">Name: A to Z</option>
                    <option value="name-desc">Name: Z to A</option>
                  </select>
                </div>

                {/* Price Range */}
                <div>
                  <label className="form-label">Price Range (per hour)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      className="form-input"
                      value={filters.minPrice || ''}
                      onChange={(e) => handleFilterChange('minPrice', e.target.value ? parseInt(e.target.value) : undefined)}
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      className="form-input"
                      value={filters.maxPrice || ''}
                      onChange={(e) => handleFilterChange('maxPrice', e.target.value ? parseInt(e.target.value) : undefined)}
                    />
                  </div>
                </div>

                {/* Amenities */}
                <div>
                  <label className="form-label">Amenities</label>
                  <div className="space-y-2">
                    {['Parking', 'Changing Room', 'Shower', 'Refreshments', 'Equipment Rental'].map((amenity) => (
                      <label key={amenity} className="flex items-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                          checked={filters.amenities?.includes(amenity) || false}
                          onChange={(e) => {
                            const currentAmenities = filters.amenities || [];
                            const newAmenities = e.target.checked
                              ? [...currentAmenities, amenity]
                              : currentAmenities.filter(a => a !== amenity);
                            handleFilterChange('amenities', newAmenities);
                          }}
                        />
                        <span className="ml-2 text-sm text-gray-700">{amenity}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Clear Filters */}
                <button
                  onClick={clearFilters}
                  className="w-full btn btn-outline"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Futsal Facilities
                </h2>
                {meta && (
                  <p className="text-gray-600">
                    Showing {((meta.page - 1) * meta.limit) + 1}-{Math.min(meta.page * meta.limit, meta.total)} of {meta.total} facilities
                  </p>
                )}
              </div>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="large" />
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="text-center py-12">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <p className="text-red-800">Failed to load facilities. Please try again.</p>
                </div>
              </div>
            )}

            {/* Facilities Grid */}
            {!isLoading && !error && (
              <>
                {facilities.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {facilities.map((facility) => (
                      <Link
                        key={facility.id}
                        to={`/facilities/${facility.id}`}
                        className="card hover:shadow-lg transition-shadow"
                      >
                        <div className="h-48 bg-gray-200 relative overflow-hidden">
                          {facility.images.length > 0 ? (
                            <img
                              src={facility.images[0]}
                              alt={facility.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100">
                              <MapPinIcon className="w-12 h-12 text-gray-400" />
                            </div>
                          )}
                          {facility.distance && (
                            <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded text-sm font-medium">
                              {facility.distance} km
                            </div>
                          )}
                        </div>
                        <div className="card-body">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {facility.name}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2 flex items-center">
                            <MapPinIcon className="w-4 h-4 mr-1" />
                            {facility.address}
                          </p>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center">
                              <StarIcon className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                              <span className="text-sm font-medium">
                                {facility.rating.toFixed(1)}
                              </span>
                              <span className="text-sm text-gray-500 ml-1">
                                ({facility.totalReviews})
                              </span>
                            </div>
                            <div className="text-sm font-semibold text-emerald-600">
                              {formatCurrency(facility.pricing.perHour)}/hr
                            </div>
                          </div>
                          {facility.amenities.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {facility.amenities.slice(0, 3).map((amenity, index) => (
                                <span
                                  key={index}
                                  className="badge badge-gray text-xs"
                                >
                                  {amenity}
                                </span>
                              ))}
                              {facility.amenities.length > 3 && (
                                <span className="badge badge-gray text-xs">
                                  +{facility.amenities.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <MapPinIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No facilities found</h3>
                    <p className="text-gray-500 mb-4">
                      Try adjusting your search or filter criteria
                    </p>
                    <button
                      onClick={clearFilters}
                      className="btn btn-primary"
                    >
                      Clear Filters
                    </button>
                  </div>
                )}

                {/* Pagination */}
                {meta && meta.totalPages > 1 && (
                  <div className="flex justify-center mt-8">
                    <nav className="flex items-center space-x-2">
                      <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      
                      {[...Array(meta.totalPages)].map((_, index) => {
                        const pageNumber = index + 1;
                        return (
                          <button
                            key={pageNumber}
                            onClick={() => setPage(pageNumber)}
                            className={`px-3 py-2 border rounded-md text-sm font-medium ${
                              page === pageNumber
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                            }`}
                          >
                            {pageNumber}
                          </button>
                        );
                      })}
                      
                      <button
                        onClick={() => setPage(Math.min(meta.totalPages, page + 1))}
                        disabled={page === meta.totalPages}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacilitiesPage;