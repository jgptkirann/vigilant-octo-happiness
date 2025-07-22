import React from 'react';
import { Link } from 'react-router-dom';
import { 
  MapPinIcon, 
  ClockIcon, 
  CurrencyDollarIcon, 
  StarIcon,
  CalendarIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { useFacilities } from '../hooks/useFacilities';
import { formatCurrency } from '../utils/helpers';

const HomePage: React.FC = () => {
  // Get featured facilities
  const { data: facilitiesData, isLoading } = useFacilities({ 
    limit: 6, 
    sortBy: 'rating',
    sortOrder: 'desc'
  });

  const features = [
    {
      icon: MapPinIcon,
      title: 'Find Nearby Courts',
      description: 'Discover futsal courts near you with our location-based search'
    },
    {
      icon: CalendarIcon,
      title: 'Easy Booking',
      description: 'Book your preferred time slots in just a few clicks'
    },
    {
      icon: CurrencyDollarIcon,
      title: 'Secure Payments',
      description: 'Pay safely with eSewa and other trusted payment methods'
    },
    {
      icon: ShieldCheckIcon,
      title: 'Verified Facilities',
      description: 'All facilities are verified for quality and authenticity'
    }
  ];

  const stats = [
    { label: 'Facilities', value: '50+', icon: MapPinIcon },
    { label: 'Happy Users', value: '1000+', icon: UserGroupIcon },
    { label: 'Bookings', value: '5000+', icon: CalendarIcon },
    { label: 'Cities', value: '10+', icon: ChartBarIcon },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-emerald-600 to-emerald-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Book Your Perfect
              <span className="block text-emerald-200">Futsal Court</span>
            </h1>
            <p className="text-xl md:text-2xl text-emerald-100 mb-8 max-w-3xl mx-auto">
              Discover and book the best futsal facilities across Nepal. Play with friends, 
              compete with others, and enjoy the beautiful game.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/facilities"
                className="bg-white text-emerald-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-emerald-50 transition-colors shadow-lg"
              >
                Find Courts
              </Link>
              <Link
                to="/register"
                className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-emerald-600 transition-colors"
              >
                List Your Facility
              </Link>
            </div>
          </div>
        </div>
        
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-repeat" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose FutsalBook?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              We make it easy to find, book, and play at the best futsal facilities in Nepal
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="text-center group">
                  <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                    <Icon className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-emerald-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center">
                  <div className="w-12 h-12 mx-auto mb-2 text-emerald-600">
                    <Icon className="w-full h-full" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    {stat.value}
                  </div>
                  <div className="text-gray-600">
                    {stat.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Facilities */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Top Rated Facilities
            </h2>
            <p className="text-xl text-gray-600">
              Discover the highest rated futsal courts in your area
            </p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, index) => (
                <div key={index} className="card animate-pulse">
                  <div className="h-48 bg-gray-200" />
                  <div className="card-body">
                    <div className="h-4 bg-gray-200 rounded mb-2" />
                    <div className="h-3 bg-gray-200 rounded mb-3 w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : facilitiesData?.data.facilities.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {facilitiesData.data.facilities.map((facility) => (
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
                    <div className="flex items-center justify-between">
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
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <MapPinIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No facilities found</p>
            </div>
          )}

          <div className="text-center mt-12">
            <Link
              to="/facilities"
              className="btn btn-primary btn-lg"
            >
              View All Facilities
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Play?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of players who trust FutsalBook for their futsal needs. 
            Book your court today and get on the field!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/facilities"
              className="bg-emerald-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-emerald-700 transition-colors"
            >
              Book Now
            </Link>
            <Link
              to="/register?role=owner"
              className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-gray-900 transition-colors"
            >
              List Your Facility
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;