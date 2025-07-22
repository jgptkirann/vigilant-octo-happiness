const { createTables } = require('./migrate');
const { seedDatabase } = require('./seed');

const setupDatabase = async () => {
  try {
    console.log('🚀 Starting FutsalBook Nepal database setup...\n');

    // Run migrations
    console.log('📋 Step 1: Running database migrations...');
    await createTables();
    console.log('✅ Database migrations completed successfully!\n');

    // Run seeding
    console.log('🌱 Step 2: Seeding initial data...');
    await seedDatabase();
    console.log('✅ Database seeding completed successfully!\n');

    console.log('🎉 FutsalBook Nepal database setup completed successfully!');
    console.log('\n📚 Quick Start Guide:');
    console.log('1. Start the backend server: npm run dev');
    console.log('2. API will be available at: http://localhost:5000/api');
    console.log('3. Health check: http://localhost:5000/api/health');
    console.log('\n🔑 Default Login Credentials:');
    console.log('  Admin: admin@futsalbook.nepal / admin123');
    console.log('  User: rajesh@gmail.com / user123');
    console.log('  Owner: ram@futsalowner.com / owner123');
    console.log('\n📖 API Documentation:');
    console.log('  Base URL: http://localhost:5000/api');
    console.log('  Endpoints: /auth, /users, /facilities, /bookings, /payments, /reviews, /admin');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Ensure PostgreSQL is running');
    console.error('2. Check database connection settings in .env file');
    console.error('3. Verify database exists and user has proper permissions');
    throw error;
  }
};

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('\n🚀 Ready to start development!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupDatabase };