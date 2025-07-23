import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  CalendarIcon, 
  ClockIcon, 
  CurrencyDollarIcon,
  MapPinIcon,
  FunnelIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { useBookings } from '../hooks/useBookings.ts';
import { formatCurrency, formatDate, formatTime, getStatusColor } from '../utils/helpers.ts';
import LoadingSpinner from '../components/LoadingSpinner.tsx';

const BookingsListPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useBookings({ 
    page, 
    limit: 10, 
    status: statusFilter || undefined 
  });

  const bookings = data?.data.bookings || [];
  const meta = data?.meta;

  const statusOptions = [
    { value: '', label: 'All Bookings' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const filteredBookings = bookings.filter(booking =>
    booking.facilityName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-gray-600 mt-1">View and manage all your futsal court bookings</p>
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

              {/* Status Filter */}
              <div className="relative">
                <FunnelIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent appearance-none bg-white"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-sm text-gray-600">
              {meta?.total || 0} total bookings
            </div>
          </div>
        </div>

        {/* Bookings List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="large" />
          </div>
        ) : error ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-red-500 mb-4">
              <CalendarIcon className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Bookings</h3>
            <p className="text-gray-600">There was an error loading your bookings. Please try again.</p>
          </div>
        ) : filteredBookings.length > 0 ? (
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
              <div key={booking.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                      <MapPinIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{booking.facilityName}</h3>
                      <p className="text-gray-600">Booking #{booking.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`badge ${getStatusColor(booking.status)} capitalize`}>
                      {booking.status}
                    </span>
                    <Link
                      to={`/bookings/${booking.id}`}
                      className="btn btn-outline btn-sm"
                    >
                      View Details
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center text-gray-600">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    <div>
                      <div className="font-medium text-gray-900">Date</div>
                      <div>{formatDate(booking.bookingDate)}</div>
                    </div>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <ClockIcon className="w-4 h-4 mr-2" />
                    <div>
                      <div className="font-medium text-gray-900">Time</div>
                      <div>{formatTime(booking.startTime)} - {formatTime(booking.endTime)}</div>
                    </div>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <CurrencyDollarIcon className="w-4 h-4 mr-2" />
                    <div>
                      <div className="font-medium text-gray-900">Amount</div>
                      <div>{formatCurrency(booking.totalAmount)}</div>
                    </div>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <div className="w-4 h-4 mr-2 rounded-full bg-gray-300"></div>
                    <div>
                      <div className="font-medium text-gray-900">Duration</div>
                      <div>{booking.duration} hour(s)</div>
                    </div>
                  </div>
                </div>

                {booking.notes && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-900 mb-1">Notes</div>
                    <div className="text-sm text-gray-600">{booking.notes}</div>
                  </div>
                )}
              </div>
            ))}

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between bg-white px-6 py-3 rounded-lg shadow-sm border border-gray-200">
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
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
            <p className="text-gray-600 mb-6">
              {search || statusFilter
                ? 'No bookings match your current filters.'
                : "You haven't made any bookings yet."}
            </p>
            {!search && !statusFilter && (
              <Link to="/facilities" className="btn btn-primary">
                Browse Facilities
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingsListPage;