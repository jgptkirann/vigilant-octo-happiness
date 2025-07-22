import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  MapPinIcon, 
  StarIcon, 
  PhoneIcon,
  EnvelopeIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { useFacility } from '../hooks/useFacilities';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatTime } from '../utils/helpers';
import LoadingSpinner from '../components/LoadingSpinner';

const FacilityDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const facilityId = parseInt(id || '0');

  const { data, isLoading, error } = useFacility(facilityId);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error || !data?.data.facility) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Facility Not Found</h1>
          <p className="text-gray-600 mb-8">The facility you're looking for doesn't exist or has been removed.</p>
          <Link to="/facilities" className="btn btn-primary">
            Browse Facilities
          </Link>
        </div>
      </div>
    );
  }

  const facility = data.data.facility;

  const dayNames = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday'
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Button */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            to="/facilities"
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-1" />
            Back to facilities
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Image Gallery */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
              {facility.images.length > 0 ? (
                <div className="aspect-video bg-gray-200">
                  <img
                    src={facility.images[0]}
                    alt={facility.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-video bg-gray-100 flex items-center justify-center">
                  <MapPinIcon className="w-16 h-16 text-gray-400" />
                </div>
              )}
              {facility.images.length > 1 && (
                <div className="p-4">
                  <div className="grid grid-cols-4 gap-2">
                    {facility.images.slice(1, 5).map((image, index) => (
                      <div key={index} className="aspect-square bg-gray-200 rounded overflow-hidden">
                        <img
                          src={image}
                          alt={`${facility.name} ${index + 2}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Facility Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {facility.name}
                  </h1>
                  <p className="text-gray-600 flex items-center">
                    <MapPinIcon className="w-5 h-5 mr-2" />
                    {facility.address}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center mb-1">
                    <StarIcon className="w-5 h-5 text-yellow-400 fill-current mr-1" />
                    <span className="text-xl font-semibold">
                      {facility.rating.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {facility.totalReviews} reviews
                  </p>
                </div>
              </div>

              {facility.description && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-600 leading-relaxed">
                    {facility.description}
                  </p>
                </div>
              )}

              {/* Amenities */}
              {facility.amenities.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Amenities</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {facility.amenities.map((amenity, index) => (
                      <div key={index} className="flex items-center text-gray-600">
                        <div className="w-2 h-2 bg-emerald-600 rounded-full mr-3" />
                        {amenity}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Operating Hours */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Operating Hours</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(facility.operatingHours).map(([day, hours]) => (
                    <div key={day} className="flex justify-between items-center py-1">
                      <span className="text-gray-600 capitalize">
                        {dayNames[day as keyof typeof dayNames] || day}
                      </span>
                      <span className="text-gray-900 font-medium">
                        {hours.open && hours.close 
                          ? `${formatTime(hours.open)} - ${formatTime(hours.close)}`
                          : 'Closed'
                        }
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Contact Information</h3>
                <div className="space-y-2">
                  <div className="flex items-center text-gray-600">
                    <PhoneIcon className="w-5 h-5 mr-3" />
                    <span>{facility.contact.phone || 'Not provided'}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <EnvelopeIcon className="w-5 h-5 mr-3" />
                    <span>{facility.contact.email || 'Not provided'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Reviews */}
            {facility.recentReviews.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Reviews</h3>
                <div className="space-y-4">
                  {facility.recentReviews.map((review) => (
                    <div key={review.id} className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                            <span className="text-sm font-medium text-gray-700">
                              {review.userName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium text-gray-900">{review.userName}</span>
                        </div>
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <StarIcon
                              key={i}
                              className={`w-4 h-4 ${
                                i < review.rating
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-gray-600">{review.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="mt-8 lg:mt-0">
            {/* Booking Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-8">
              <div className="text-center mb-6">
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {formatCurrency(facility.pricing.perHour)}
                </div>
                <div className="text-gray-600">per hour</div>
              </div>

              {isAuthenticated ? (
                <Link
                  to={`/book/${facility.id}`}
                  className="w-full btn btn-primary btn-lg"
                >
                  Book Now
                </Link>
              ) : (
                <div className="space-y-3">
                  <Link
                    to="/login"
                    className="w-full btn btn-primary btn-lg"
                  >
                    Sign in to Book
                  </Link>
                  <p className="text-sm text-gray-600 text-center">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-emerald-600 hover:text-emerald-500">
                      Sign up
                    </Link>
                  </p>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-200 text-center">
                <p className="text-sm text-gray-600">
                  Quick booking • Instant confirmation
                </p>
              </div>
            </div>

            {/* Owner Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Hosted by</h3>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center mr-4">
                  <span className="text-lg font-medium text-gray-700">
                    {facility.owner.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{facility.owner.name}</p>
                  <p className="text-sm text-gray-600">Facility Owner</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacilityDetailPage;