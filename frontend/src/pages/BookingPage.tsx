import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  CalendarIcon, 
  ClockIcon, 
  CurrencyDollarIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useFacility } from '../hooks/useFacilities.ts';
import { useCreateBooking } from '../hooks/useBookings.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { formatCurrency, formatDate, formatTime } from '../utils/helpers.ts';
import LoadingSpinner from '../components/LoadingSpinner.tsx';
import toast from 'react-hot-toast';

interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  duration: number;
}

const BookingPage: React.FC = () => {
  const { facilityId } = useParams<{ facilityId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const facilityIdNum = parseInt(facilityId || '0');

  const { data, isLoading, error } = useFacility(facilityIdNum);
  const createBookingMutation = useCreateBooking();

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

  const facility = data?.data.facility;

  // Generate time slots based on facility operating hours
  useEffect(() => {
    if (facility && selectedDate) {
      generateTimeSlots();
    }
  }, [facility, selectedDate]);

  const generateTimeSlots = () => {
    if (!facility || !selectedDate) return;

    const dayOfWeek = new Date(selectedDate).toLocaleLowerCase();
    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date(selectedDate).getDay()];
    
    const operatingHours = facility.operatingHours[dayName];
    if (!operatingHours) {
      setTimeSlots([]);
      return;
    }

    const slots: TimeSlot[] = [];
    const openTime = operatingHours.open;
    const closeTime = operatingHours.close;
    
    let currentTime = openTime;
    while (currentTime < closeTime) {
      const [hours, minutes] = currentTime.split(':').map(Number);
      const nextHour = hours + 1;
      const endTime = `${nextHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      
      if (endTime <= closeTime) {
        slots.push({
          startTime: currentTime,
          endTime: endTime,
          isAvailable: true, // In a real app, this would check against existing bookings
          duration: 1
        });
      }
      
      currentTime = endTime;
    }
    
    setTimeSlots(slots);
  };

  const handleBooking = async () => {
    if (!selectedDate || !selectedSlot || !facility) {
      toast.error('Please select a date and time slot');
      return;
    }

    try {
      await createBookingMutation.mutateAsync({
        facilityId: facility.id,
        date: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        notes: notes.trim() || undefined
      });

      navigate('/dashboard');
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30); // Allow booking up to 30 days in advance
    return maxDate.toISOString().split('T')[0];
  };

  const totalAmount = selectedSlot ? facility?.pricing.perHour * selectedSlot.duration : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error || !facility) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Facility Not Found</h1>
          <p className="text-gray-600 mb-8">The facility you're trying to book doesn't exist or has been removed.</p>
          <Link to="/facilities" className="btn btn-primary">
            Browse Facilities
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
            to={`/facilities/${facility.id}`}
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-1" />
            Back to facility details
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Book Your Court</h1>
          <p className="text-gray-600">Complete your booking for {facility.name}</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Booking Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Facility Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Facility Details</h3>
              <div className="flex items-start space-x-4">
                {facility.images.length > 0 ? (
                  <img
                    src={facility.images[0]}
                    alt={facility.name}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                    <CalendarIcon className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <div>
                  <h4 className="font-semibold text-gray-900">{facility.name}</h4>
                  <p className="text-gray-600 text-sm">{facility.address}</p>
                  <p className="text-emerald-600 font-medium text-sm mt-1">
                    {formatCurrency(facility.pricing.perHour)}/hour
                  </p>
                </div>
              </div>
            </div>

            {/* Date Selection */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Date</h3>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={getMinDate()}
                max={getMaxDate()}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              {selectedDate && (
                <p className="text-sm text-gray-600 mt-2">
                  Selected: {formatDate(selectedDate)}
                </p>
              )}
            </div>

            {/* Time Slot Selection */}
            {selectedDate && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Time Slot</h3>
                {timeSlots.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {timeSlots.map((slot, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedSlot(slot)}
                        disabled={!slot.isAvailable}
                        className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                          selectedSlot?.startTime === slot.startTime
                            ? 'bg-emerald-100 border-emerald-500 text-emerald-700'
                            : slot.isAvailable
                            ? 'bg-white border-gray-300 text-gray-700 hover:border-emerald-300'
                            : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">Facility is closed on this day.</p>
                )}
              </div>
            )}

            {/* Special Requests */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Special Requests (Optional)</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special requests or notes for your booking..."
                rows={4}
                maxLength={500}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              />
              <p className="text-sm text-gray-500 mt-2">{notes.length}/500 characters</p>
            </div>
          </div>

          {/* Booking Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Summary</h3>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Facility:</span>
                  <span className="font-medium">{facility.name}</span>
                </div>
                
                {selectedDate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium">{formatDate(selectedDate)}</span>
                  </div>
                )}
                
                {selectedSlot && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Time:</span>
                    <span className="font-medium">
                      {formatTime(selectedSlot.startTime)} - {formatTime(selectedSlot.endTime)}
                    </span>
                  </div>
                )}
                
                {selectedSlot && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">{selectedSlot.duration} hour(s)</span>
                  </div>
                )}
                
                {selectedSlot && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Rate:</span>
                    <span className="font-medium">{formatCurrency(facility.pricing.perHour)}/hour</span>
                  </div>
                )}
              </div>
              
              {selectedSlot && (
                <div className="border-t border-gray-200 pt-4 mb-6">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total Amount:</span>
                    <span className="text-emerald-600">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              )}
              
              <button
                onClick={handleBooking}
                disabled={!selectedDate || !selectedSlot || createBookingMutation.isPending}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  selectedDate && selectedSlot && !createBookingMutation.isPending
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {createBookingMutation.isPending ? (
                  <div className="flex items-center justify-center">
                    <LoadingSpinner size="small" />
                    <span className="ml-2">Processing...</span>
                  </div>
                ) : (
                  'Confirm Booking'
                )}
              </button>
              
              <p className="text-xs text-gray-500 text-center mt-3">
                Your booking will be confirmed instantly
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;