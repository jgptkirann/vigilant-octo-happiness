const { query, testConnection } = require('./database');
const { hashPassword } = require('../utils/helpers');

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Test connection first
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }

    // Clear existing data (optional - be careful in production)
    console.log('🧹 Clearing existing data...');
    await query('TRUNCATE TABLE notifications CASCADE');
    await query('TRUNCATE TABLE reviews CASCADE');
    await query('TRUNCATE TABLE payments CASCADE');
    await query('TRUNCATE TABLE bookings CASCADE');
    await query('TRUNCATE TABLE time_slots CASCADE');
    await query('TRUNCATE TABLE facilities CASCADE');
    await query('TRUNCATE TABLE users CASCADE');

    // Reset sequences
    await query('ALTER SEQUENCE users_id_seq RESTART WITH 1');
    await query('ALTER SEQUENCE facilities_id_seq RESTART WITH 1');
    await query('ALTER SEQUENCE bookings_id_seq RESTART WITH 1');
    await query('ALTER SEQUENCE payments_id_seq RESTART WITH 1');
    await query('ALTER SEQUENCE reviews_id_seq RESTART WITH 1');
    await query('ALTER SEQUENCE notifications_id_seq RESTART WITH 1');

    // Seed Users
    console.log('👥 Seeding users...');

    // Admin users
    const adminPassword = await hashPassword('admin123');
    await query(`
      INSERT INTO users (name, email, phone, password_hash, role, is_verified)
      VALUES 
        ('Admin User', 'admin@futsalbook.nepal', '9841234567', $1, 'admin', true),
        ('Super Admin', 'superadmin@futsalbook.nepal', '9841234568', $1, 'admin', true)
    `, [adminPassword]);

    // Regular users
    const userPassword = await hashPassword('user123');
    await query(`
      INSERT INTO users (name, email, phone, password_hash, role, is_verified)
      VALUES 
        ('Rajesh Sharma', 'rajesh@gmail.com', '9841234569', $1, 'user', true),
        ('Sita Gurung', 'sita@gmail.com', '9841234570', $1, 'user', true),
        ('Hari Thapa', 'hari@gmail.com', '9841234571', $1, 'user', true),
        ('Maya Rai', 'maya@gmail.com', '9841234572', $1, 'user', true),
        ('Kiran Shrestha', 'kiran@gmail.com', '9841234573', $1, 'user', true),
        ('Anita Lama', 'anita@gmail.com', '9841234574', $1, 'user', true),
        ('Bikash Oli', 'bikash@gmail.com', '9841234575', $1, 'user', true),
        ('Priya Singh', 'priya@gmail.com', '9841234576', $1, 'user', true)
    `, [userPassword]);

    // Facility owners
    const ownerPassword = await hashPassword('owner123');
    await query(`
      INSERT INTO users (name, email, phone, password_hash, role, is_verified)
      VALUES 
        ('Ram Bahadur', 'ram@futsalowner.com', '9841234577', $1, 'owner', true),
        ('Shyam Tamang', 'shyam@futsalowner.com', '9841234578', $1, 'owner', true),
        ('Gita Karki', 'gita@futsalowner.com', '9841234579', $1, 'owner', true),
        ('Buddha Lama', 'buddha@futsalowner.com', '9841234580', $1, 'owner', true),
        ('Krishna Yadav', 'krishna@futsalowner.com', '9841234581', $1, 'owner', true)
    `, [ownerPassword]);

    // Seed Facilities
    console.log('🏟️ Seeding facilities...');

    const facilitiesData = [
      {
        name: 'Kathmandu Futsal Arena',
        description: 'Premium futsal facility in the heart of Kathmandu with modern amenities and professional-grade artificial turf.',
        address: 'New Baneshwor, Kathmandu',
        latitude: 27.6915,
        longitude: 85.3398,
        phone: '014567890',
        email: 'info@ktmfutsal.com',
        pricing: 1500,
        owner_id: 11, // Ram Bahadur
        amenities: ['Parking', 'Changing Room', 'Shower', 'Cafeteria', 'Equipment Rental'],
        operating_hours: {
          monday: { open: '06:00', close: '22:00' },
          tuesday: { open: '06:00', close: '22:00' },
          wednesday: { open: '06:00', close: '22:00' },
          thursday: { open: '06:00', close: '22:00' },
          friday: { open: '06:00', close: '23:00' },
          saturday: { open: '06:00', close: '23:00' },
          sunday: { open: '07:00', close: '22:00' }
        }
      },
      {
        name: 'Pokhara Sports Complex',
        description: 'Beautiful futsal ground with mountain view. Perfect for both casual and competitive games.',
        address: 'Lakeside, Pokhara',
        latitude: 28.2096,
        longitude: 83.9856,
        phone: '061567890',
        email: 'contact@pokharasports.com',
        pricing: 1200,
        owner_id: 12, // Shyam Tamang
        amenities: ['Parking', 'Changing Room', 'Water', 'Equipment Rental'],
        operating_hours: {
          monday: { open: '06:00', close: '21:00' },
          tuesday: { open: '06:00', close: '21:00' },
          wednesday: { open: '06:00', close: '21:00' },
          thursday: { open: '06:00', close: '21:00' },
          friday: { open: '06:00', close: '22:00' },
          saturday: { open: '06:00', close: '22:00' },
          sunday: { open: '07:00', close: '21:00' }
        }
      },
      {
        name: 'Lalitpur Futsal Center',
        description: 'Modern facility with two courts, ideal for tournaments and training sessions.',
        address: 'Jawalakhel, Lalitpur',
        latitude: 27.6722,
        longitude: 85.3150,
        phone: '015567890',
        email: 'info@lalitpurfutsal.com',
        pricing: 1800,
        owner_id: 13, // Gita Karki
        amenities: ['Parking', 'Changing Room', 'Shower', 'Cafeteria', 'First Aid', 'Equipment Rental', 'Two Courts'],
        operating_hours: {
          monday: { open: '06:00', close: '22:00' },
          tuesday: { open: '06:00', close: '22:00' },
          wednesday: { open: '06:00', close: '22:00' },
          thursday: { open: '06:00', close: '22:00' },
          friday: { open: '06:00', close: '23:00' },
          saturday: { open: '06:00', close: '23:00' },
          sunday: { open: '07:00', close: '22:00' }
        }
      },
      {
        name: 'Bhaktapur Futsal Ground',
        description: 'Traditional setting with modern facilities. Great for family and friends.',
        address: 'Madhyapur Thimi, Bhaktapur',
        latitude: 27.6769,
        longitude: 85.4298,
        phone: '016567890',
        email: 'bhaktapurfutsal@email.com',
        pricing: 1000,
        owner_id: 14, // Buddha Lama
        amenities: ['Parking', 'Changing Room', 'Water'],
        operating_hours: {
          monday: { open: '06:00', close: '21:00' },
          tuesday: { open: '06:00', close: '21:00' },
          wednesday: { open: '06:00', close: '21:00' },
          thursday: { open: '06:00', close: '21:00' },
          friday: { open: '06:00', close: '22:00' },
          saturday: { open: '06:00', close: '22:00' },
          sunday: { open: '07:00', close: '21:00' }
        }
      },
      {
        name: 'Chitwan Futsal Palace',
        description: 'Premier futsal destination in Chitwan with air-conditioned facilities.',
        address: 'Bharatpur, Chitwan',
        latitude: 27.6891,
        longitude: 84.4358,
        phone: '056567890',
        email: 'palace@chitwanfutsal.com',
        pricing: 1300,
        owner_id: 15, // Krishna Yadav
        amenities: ['Parking', 'Changing Room', 'Shower', 'Air Conditioning', 'Equipment Rental'],
        operating_hours: {
          monday: { open: '06:00', close: '22:00' },
          tuesday: { open: '06:00', close: '22:00' },
          wednesday: { open: '06:00', close: '22:00' },
          thursday: { open: '06:00', close: '22:00' },
          friday: { open: '06:00', close: '23:00' },
          saturday: { open: '06:00', close: '23:00' },
          sunday: { open: '07:00', close: '22:00' }
        }
      },
      {
        name: 'Thamel Sports Arena',
        description: 'Conveniently located in Thamel, perfect for tourists and locals alike.',
        address: 'Thamel, Kathmandu',
        latitude: 27.7172,
        longitude: 85.3240,
        phone: '014567891',
        email: 'thamel@sportsarena.com',
        pricing: 1600,
        owner_id: 11, // Ram Bahadur (second facility)
        amenities: ['Parking', 'Changing Room', 'Shower', 'Cafeteria'],
        operating_hours: {
          monday: { open: '06:00', close: '22:00' },
          tuesday: { open: '06:00', close: '22:00' },
          wednesday: { open: '06:00', close: '22:00' },
          thursday: { open: '06:00', close: '22:00' },
          friday: { open: '06:00', close: '23:00' },
          saturday: { open: '06:00', close: '23:00' },
          sunday: { open: '07:00', close: '22:00' }
        }
      }
    ];

    for (const facility of facilitiesData) {
      await query(`
        INSERT INTO facilities (
          owner_id, name, description, address, latitude, longitude,
          phone, email, pricing_per_hour, amenities, operating_hours, is_verified
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
      `, [
        facility.owner_id,
        facility.name,
        facility.description,
        facility.address,
        facility.latitude,
        facility.longitude,
        facility.phone,
        facility.email,
        facility.pricing,
        facility.amenities,
        JSON.stringify(facility.operating_hours)
      ]);
    }

    // Seed some bookings
    console.log('📅 Seeding bookings...');

    const bookingsData = [
      {
        user_id: 3, // Rajesh Sharma
        facility_id: 1,
        booking_date: '2024-01-15',
        start_time: '18:00',
        end_time: '19:00',
        duration: 60,
        total_amount: 1500,
        commission_amount: 150,
        status: 'completed',
        booking_code: 'FB24011500'
      },
      {
        user_id: 4, // Sita Gurung
        facility_id: 2,
        booking_date: '2024-01-16',
        start_time: '19:00',
        end_time: '20:30',
        duration: 90,
        total_amount: 1800,
        commission_amount: 180,
        status: 'completed',
        booking_code: 'FB24011600'
      },
      {
        user_id: 5, // Hari Thapa
        facility_id: 3,
        booking_date: '2024-01-17',
        start_time: '17:00',
        end_time: '18:00',
        duration: 60,
        total_amount: 1800,
        commission_amount: 180,
        status: 'confirmed',
        booking_code: 'FB24011700'
      },
      {
        user_id: 6, // Maya Rai
        facility_id: 1,
        booking_date: '2024-01-18',
        start_time: '20:00',
        end_time: '21:00',
        duration: 60,
        total_amount: 1500,
        commission_amount: 150,
        status: 'pending',
        booking_code: 'FB24011800'
      }
    ];

    for (const booking of bookingsData) {
      await query(`
        INSERT INTO bookings (
          user_id, facility_id, booking_date, start_time, end_time,
          duration, total_amount, commission_amount, status, booking_code
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        booking.user_id,
        booking.facility_id,
        booking.booking_date,
        booking.start_time,
        booking.end_time,
        booking.duration,
        booking.total_amount,
        booking.commission_amount,
        booking.status,
        booking.booking_code
      ]);
    }

    // Seed payments for completed bookings
    console.log('💳 Seeding payments...');

    await query(`
      INSERT INTO payments (booking_id, user_id, amount, payment_method, status, transaction_id, payment_date)
      VALUES 
        (1, 3, 1500, 'esewa', 'completed', 'ESW001234', CURRENT_TIMESTAMP - INTERVAL '2 days'),
        (2, 4, 1800, 'esewa', 'completed', 'ESW001235', CURRENT_TIMESTAMP - INTERVAL '1 day')
    `);

    // Update bookings with payment references
    await query('UPDATE bookings SET payment_id = 1 WHERE id = 1');
    await query('UPDATE bookings SET payment_id = 2 WHERE id = 2');

    // Seed reviews
    console.log('⭐ Seeding reviews...');

    const reviewsData = [
      {
        user_id: 3,
        facility_id: 1,
        booking_id: 1,
        rating: 5,
        comment: 'Excellent facility! Clean, well-maintained, and great staff. Will definitely book again.'
      },
      {
        user_id: 4,
        facility_id: 2,
        booking_id: 2,
        rating: 4,
        comment: 'Good futsal ground with beautiful mountain view. Could use better lighting but overall great experience.'
      },
      {
        user_id: 7, // Bikash Oli
        facility_id: 1,
        booking_id: null, // Past booking not in seed data
        rating: 5,
        comment: 'Amazing facility in Kathmandu! Perfect for serious games and practice sessions.'
      },
      {
        user_id: 8, // Priya Singh
        facility_id: 3,
        booking_id: null,
        rating: 4,
        comment: 'Great facility with two courts. Parking can be challenging during peak hours.'
      }
    ];

    for (const review of reviewsData) {
      await query(`
        INSERT INTO reviews (user_id, facility_id, booking_id, rating, comment, is_verified)
        VALUES ($1, $2, $3, $4, $5, true)
      `, [
        review.user_id,
        review.facility_id,
        review.booking_id,
        review.rating,
        review.comment
      ]);
    }

    // Update facility ratings based on reviews
    console.log('📊 Updating facility ratings...');

    await query(`
      UPDATE facilities 
      SET 
        rating = (
          SELECT ROUND(AVG(rating)::numeric, 2) 
          FROM reviews 
          WHERE facility_id = facilities.id
        ),
        total_reviews = (
          SELECT COUNT(*) 
          FROM reviews 
          WHERE facility_id = facilities.id
        )
      WHERE id IN (SELECT DISTINCT facility_id FROM reviews)
    `);

    // Seed some notifications
    console.log('🔔 Seeding notifications...');

    await query(`
      INSERT INTO notifications (user_id, title, message, type, related_id, related_type)
      VALUES 
        (3, 'Booking Confirmed', 'Your booking at Kathmandu Futsal Arena has been confirmed.', 'booking', 1, 'booking'),
        (4, 'Payment Successful', 'Your payment for Pokhara Sports Complex has been processed.', 'payment', 2, 'payment'),
        (5, 'Booking Reminder', 'Your futsal game is tomorrow at 5:00 PM.', 'booking', 3, 'booking'),
        (6, 'Welcome to FutsalBook', 'Thank you for joining FutsalBook Nepal!', 'info', null, null)
    `);

    console.log('✅ Database seeding completed successfully!');
    console.log('📊 Seeded data summary:');
    console.log('  - Users: 15 (2 admins, 8 users, 5 owners)');
    console.log('  - Facilities: 6');
    console.log('  - Bookings: 4');
    console.log('  - Payments: 2');
    console.log('  - Reviews: 4');
    console.log('  - Notifications: 4');

    // Display login credentials
    console.log('\n🔑 Login Credentials:');
    console.log('Admin: admin@futsalbook.nepal / admin123');
    console.log('User: rajesh@gmail.com / user123');
    console.log('Owner: ram@futsalowner.com / owner123');

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    throw error;
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('🎉 Seeding process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding process failed:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase };