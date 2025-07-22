const { query, testConnection } = require('./database');

const createTables = async () => {
  try {
    console.log('🚀 Starting database migration...');

    // Test connection first
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }

    // Create ENUM types
    await query(`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('user', 'owner', 'admin');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await query(`
      DO $$ BEGIN
        CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await query(`
      DO $$ BEGIN
        CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        phone VARCHAR(20) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role user_role DEFAULT 'user',
        is_verified BOOLEAN DEFAULT false,
        verification_token VARCHAR(255),
        reset_token VARCHAR(255),
        reset_token_expires TIMESTAMP,
        profile_image VARCHAR(255),
        address TEXT,
        date_of_birth DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Facilities table
    await query(`
      CREATE TABLE IF NOT EXISTS facilities (
        id SERIAL PRIMARY KEY,
        owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        address TEXT NOT NULL,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        phone VARCHAR(20),
        email VARCHAR(100),
        amenities TEXT[], -- Array of amenities
        pricing_per_hour DECIMAL(10, 2) NOT NULL,
        images TEXT[], -- Array of image URLs
        operating_hours JSONB, -- Store opening hours as JSON
        is_active BOOLEAN DEFAULT true,
        is_verified BOOLEAN DEFAULT false,
        rating DECIMAL(3, 2) DEFAULT 0.00,
        total_reviews INTEGER DEFAULT 0,
        commission_rate DECIMAL(5, 4) DEFAULT 0.1000,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Time slots table (for managing availability)
    await query(`
      CREATE TABLE IF NOT EXISTS time_slots (
        id SERIAL PRIMARY KEY,
        facility_id INTEGER REFERENCES facilities(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        is_available BOOLEAN DEFAULT true,
        price DECIMAL(10, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(facility_id, date, start_time)
      )
    `);

    // Bookings table
    await query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        facility_id INTEGER REFERENCES facilities(id) ON DELETE CASCADE,
        booking_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        duration INTEGER NOT NULL, -- in minutes
        total_amount DECIMAL(10, 2) NOT NULL,
        commission_amount DECIMAL(10, 2) NOT NULL,
        status booking_status DEFAULT 'pending',
        payment_id INTEGER,
        booking_code VARCHAR(10) UNIQUE,
        special_requests TEXT,
        cancellation_reason TEXT,
        cancelled_at TIMESTAMP,
        confirmed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Payments table
    await query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        amount DECIMAL(10, 2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        transaction_id VARCHAR(100) UNIQUE,
        esewa_ref_id VARCHAR(100),
        status payment_status DEFAULT 'pending',
        payment_date TIMESTAMP,
        refund_amount DECIMAL(10, 2) DEFAULT 0.00,
        refund_date TIMESTAMP,
        metadata JSONB, -- Store additional payment details
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Reviews table
    await query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        facility_id INTEGER REFERENCES facilities(id) ON DELETE CASCADE,
        booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
        comment TEXT,
        is_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, booking_id)
      )
    `);

    // Notifications table
    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        is_read BOOLEAN DEFAULT false,
        related_id INTEGER, -- Can reference booking, payment, etc.
        related_type VARCHAR(50), -- Type of related entity
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Platform settings table
    await query(`
      CREATE TABLE IF NOT EXISTS platform_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    console.log('📊 Creating indexes...');

    await query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await query('CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)');
    await query('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
    
    await query('CREATE INDEX IF NOT EXISTS idx_facilities_owner ON facilities(owner_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_facilities_location ON facilities(latitude, longitude)');
    await query('CREATE INDEX IF NOT EXISTS idx_facilities_active ON facilities(is_active)');
    
    await query('CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_bookings_facility ON bookings(facility_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date)');
    await query('CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status)');
    
    await query('CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)');
    await query('CREATE INDEX IF NOT EXISTS idx_payments_transaction ON payments(transaction_id)');
    
    await query('CREATE INDEX IF NOT EXISTS idx_reviews_facility ON reviews(facility_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id)');
    
    await query('CREATE INDEX IF NOT EXISTS idx_time_slots_facility_date ON time_slots(facility_id, date)');
    await query('CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)');

    // Add foreign key constraint for payments.booking_id to bookings.id
    await query(`
      ALTER TABLE bookings 
      ADD CONSTRAINT fk_bookings_payment 
      FOREIGN KEY (payment_id) REFERENCES payments(id)
    `);

    // Create triggers for updated_at timestamps
    console.log('⚡ Creating triggers...');

    await query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    const tablesWithUpdatedAt = ['users', 'facilities', 'bookings', 'payments', 'reviews', 'platform_settings'];
    
    for (const table of tablesWithUpdatedAt) {
      await query(`
        DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};
        CREATE TRIGGER update_${table}_updated_at
        BEFORE UPDATE ON ${table}
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
      `);
    }

    // Insert default platform settings
    console.log('⚙️ Inserting default settings...');

    await query(`
      INSERT INTO platform_settings (setting_key, setting_value, description)
      VALUES 
        ('default_commission_rate', '0.10', 'Default commission rate for new facilities'),
        ('min_booking_duration', '30', 'Minimum booking duration in minutes'),
        ('max_booking_duration', '240', 'Maximum booking duration in minutes'),
        ('max_advance_booking_days', '30', 'Maximum days in advance for booking'),
        ('cancellation_policy_hours', '24', 'Hours before booking for free cancellation'),
        ('platform_currency', 'NPR', 'Platform currency'),
        ('booking_code_length', '8', 'Length of booking confirmation codes')
      ON CONFLICT (setting_key) DO NOTHING
    `);

    console.log('✅ Database migration completed successfully!');
    console.log('📋 Created tables: users, facilities, time_slots, bookings, payments, reviews, notifications, platform_settings');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
};

// Run migration if this file is executed directly
if (require.main === module) {
  createTables()
    .then(() => {
      console.log('🎉 Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration process failed:', error);
      process.exit(1);
    });
}

module.exports = { createTables };