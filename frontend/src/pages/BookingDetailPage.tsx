import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  CalendarIcon, 
  ClockIcon, 
  CurrencyDollarIcon,
  MapPinIcon,
  ArrowLeftIcon,
  PhoneIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { useBooking, useCancelBooking } from '../hooks/useBookings.ts';
import { formatCurrency, formatDate, formatTime, getStatusColor } from '../utils/helpers.ts';
import LoadingSpinner from '../components/LoadingSpinner.tsx';
import toast from 'react-hot-toast';

const BookingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const bookingId = parseInt(id || '0');
  
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');

  const { data, isLoading, error } = useBooking(bookingId);
  const cancelBookingMutation = useCancelBooking();

  const booking = data?.data.booking;

  const handleCancelBooking = async () => {
    if (!booking) return;

    try {
      await cancelBookingMutation.mutateAsync(booking.id);
      setShowCancelModal(false);
      toast.success('Booking cancelled successfully');
      navigate('/bookings');
    } catch (error) {
      // Error handled by mutation
    }
  };

  const canCancelBooking = booking && 
    (booking.status === 'pending' || booking.status === 'confirmed') &&
    new Date(booking.bookingDate) > new Date();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Booking Not Found</h1>
          <p className="text-gray-600 mb-8">The booking you're looking for doesn't exist or has been removed.</p>
          <Link to="/bookings" className="btn btn-primary">
            Back to Bookings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            to="/bookings"
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-1" />
            Back to bookings
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Details</h1>
          <p className="text-gray-600">Booking #{booking.id}</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Booking Status */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Booking Status</h3>
                <span className={`badge ${getStatusColor(booking.status)} capitalize text-lg px-4 py-2`}>
                  {booking.status}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                {booking.status === 'pending' && 'Your booking is awaiting confirmation from the facility owner.'}
                {booking.status === 'confirmed' && 'Your booking has been confirmed. See you on the court!'}
                {booking.status === 'cancelled' && 'This booking has been cancelled.'}
                {booking.status === 'completed' && 'This booking has been completed. Thanks for playing!'}
              </div>
            </div>

            {/* Facility Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Facility Information</h3>
              <div className="flex items-start space-x-4">
                <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                  <MapPinIcon className="w-8 h-8 text-gray-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 text-lg">{booking.facilityName}</h4>
                  <div className="mt-2 space-y-1 text-sm text-gray-600">
                    <div className="flex items-center">
                      <MapPinIcon className="w-4 h-4 mr-2" />
                      <span>Facility Address</span>
                    </div>
                    <div className="flex items-center">
                      <PhoneIcon className="w-4 h-4 mr-2" />
                      <span>+977 98XXXXXXXX</span>
                    </div>
                    <div className="flex items-center">
                      <EnvelopeIcon className="w-4 h-4 mr-2" />
                      <span>facility@example.com</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Booking Details */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <CalendarIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Date</div>
                    <div className="text-sm text-gray-600">{formatDate(booking.bookingDate)}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <ClockIcon className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Time</div>
                    <div className="text-sm text-gray-600">
                      {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <ClockIcon className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Duration</div>
                    <div className="text-sm text-gray-600">{booking.duration} hour(s)</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <CurrencyDollarIcon className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Total Amount</div>
                    <div className="text-sm text-gray-600">{formatCurrency(booking.totalAmount)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Special Requests */}
            {booking.notes && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Special Requests</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700">{booking.notes}</p>
                </div>
              </div>
            )}

            {/* Payment Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h3>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">Payment Status</div>
                  <div className="text-sm text-gray-600">{booking.paymentStatus}</div>
                </div>
                <span className={`badge ${
                  booking.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                  booking.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                } capitalize`}>
                  {booking.paymentStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
              <div className="space-y-3">
                {canCancelBooking && (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="w-full btn btn-outline-red"
                  >
                    Cancel Booking
                  </button>
                )}
                <Link
                  to={`/facilities/${booking.facilityId}`}
                  className="w-full btn btn-outline text-center"
                >
                  View Facility
                </Link>
                <Link
                  to="/facilities"
                  className="w-full btn btn-primary text-center"
                >
                  Book Another Court
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Booking Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-500 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Cancel Booking</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Are you sure you want to cancel this booking? This action cannot be undone.
            </p>
            <textarea
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder="Reason for cancellation (optional)"
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none mb-4"
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="btn btn-outline"
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancelBooking}
                disabled={cancelBookingMutation.isPending}
                className="btn btn-red"
              >
                {cancelBookingMutation.isPending ? 'Cancelling...' : 'Cancel Booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingDetailPage;