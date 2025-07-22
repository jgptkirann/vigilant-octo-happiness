# FutsalBook Nepal Setup Guide

This guide will help you set up the FutsalBook Nepal application locally for development.

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **PostgreSQL** (v13 or higher) - [Download](https://www.postgresql.org/download/)
- **npm** or **yarn** - Comes with Node.js
- **Git** - [Download](https://git-scm.com/)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd futsalbook-nepal
```

### 2. Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Database Setup

#### Create PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE futsalbook_nepal;

# Create user (optional)
CREATE USER futsalbook_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE futsalbook_nepal TO futsalbook_user;

# Exit PostgreSQL
\q
```

#### Configure Environment Variables

```bash
# Backend configuration
cd backend
cp .env.example .env

# Edit .env file with your database credentials
nano .env
```

Update the following variables in `backend/.env`:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/futsalbook_nepal
DB_HOST=localhost
DB_PORT=5432
DB_NAME=futsalbook_nepal
DB_USER=your_username
DB_PASSWORD=your_password
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

```bash
# Frontend configuration
cd ../frontend
cp .env.example .env

# Edit frontend .env if needed
nano .env
```

### 4. Initialize Database

```bash
cd backend
npm run db:setup
```

This command will:
- Create all necessary database tables
- Set up indexes and triggers
- Insert initial data (users, facilities, bookings, etc.)

### 5. Start the Application

Open two terminal windows:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

### 6. Access the Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000/api
- **API Health Check:** http://localhost:5000/api/health

## 🔑 Default Login Credentials

The database setup creates default users for testing:

### Admin Account
- **Email:** admin@futsalbook.nepal
- **Password:** admin123
- **Access:** Full platform management

### User Account
- **Email:** rajesh@gmail.com
- **Password:** user123
- **Access:** Book facilities, manage bookings

### Facility Owner Account
- **Email:** ram@futsalowner.com
- **Password:** owner123
- **Access:** Manage facilities, view bookings

## 📁 Project Structure

```
futsalbook-nepal/
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── config/         # Database and app configuration
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Custom middleware
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   └── utils/          # Utility functions
│   ├── uploads/            # File uploads
│   └── package.json
├── frontend/               # React.js client
│   ├── public/             # Static assets
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom hooks
│   │   ├── services/       # API services
│   │   ├── context/        # React context
│   │   ├── utils/          # Utility functions
│   │   └── types/          # TypeScript types
│   └── package.json
├── docs/                   # Documentation
└── README.md
```

## 🛠️ Available Scripts

### Backend Scripts

```bash
# Development
npm run dev          # Start development server with hot reload
npm start           # Start production server

# Database
npm run db:setup    # Complete database setup (migrate + seed)
npm run db:migrate  # Run database migrations only
npm run db:seed     # Seed initial data only
npm run db:reset    # Reset database (migrate + seed)

# Code Quality
npm run lint        # Run ESLint
npm run lint:fix    # Fix ESLint issues
npm test           # Run tests
```

### Frontend Scripts

```bash
# Development
npm start          # Start development server
npm run build      # Build for production
npm test          # Run tests

# Code Quality
npm run lint       # Run ESLint
npm run lint:fix   # Fix ESLint issues
npm run type-check # TypeScript type checking
```

## 🔧 Configuration

### Backend Configuration (.env)

Key environment variables:

```env
# Server
NODE_ENV=development
PORT=5000

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/futsalbook_nepal

# Authentication
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=24h

# eSewa (Payment Gateway)
ESEWA_MERCHANT_CODE=EPAYTEST
ESEWA_SECRET_KEY=8gBm/:&EnhH.1/q
ESEWA_BASE_URL=https://uat.esewa.com.np/epay/main

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Features
DEFAULT_COMMISSION_RATE=0.10
MIN_BOOKING_DURATION=30
MAX_ADVANCE_BOOKING_DAYS=30
```

### Frontend Configuration (.env)

```env
# API
REACT_APP_API_URL=http://localhost:5000/api

# eSewa
REACT_APP_ESEWA_BASE_URL=https://uat.esewa.com.np
REACT_APP_ESEWA_MERCHANT_CODE=EPAYTEST

# Features
REACT_APP_ENABLE_NOTIFICATIONS=true
REACT_APP_MOCK_PAYMENTS=true
```

## 📱 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/verify` - Verify account
- `GET /api/auth/me` - Get current user

### Facilities
- `GET /api/facilities` - List facilities
- `GET /api/facilities/:id` - Get facility details
- `GET /api/facilities/:id/slots` - Get available slots
- `POST /api/facilities` - Create facility (Owner)

### Bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings` - Get user bookings
- `GET /api/bookings/:id` - Get booking details
- `PUT /api/bookings/:id` - Update booking

### Payments
- `POST /api/payments/initiate` - Initiate payment
- `POST /api/payments/verify/esewa` - Verify eSewa payment
- `GET /api/payments/:id` - Get payment details

### Reviews
- `POST /api/reviews` - Create review
- `GET /api/reviews/facility/:id` - Get facility reviews
- `GET /api/reviews/user` - Get user reviews

### Admin
- `GET /api/admin/dashboard` - Admin dashboard
- `GET /api/admin/users` - Manage users
- `GET /api/admin/facilities` - Manage facilities
- `GET /api/admin/analytics/revenue` - Revenue analytics

## 🧪 Testing

### Backend Testing

```bash
cd backend
npm test
```

### Frontend Testing

```bash
cd frontend
npm test
```

## 📊 Database Schema

### Core Tables

1. **users** - User accounts and profiles
2. **facilities** - Futsal facility information
3. **bookings** - Booking records
4. **payments** - Payment transactions
5. **reviews** - User reviews and ratings
6. **notifications** - System notifications
7. **platform_settings** - Configuration settings

### Key Relationships

- Users can make multiple bookings
- Facilities belong to owners (users)
- Bookings have associated payments
- Reviews are linked to bookings and facilities
- Notifications are sent to users

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Input validation and sanitization
- Rate limiting on API endpoints
- CORS protection
- SQL injection prevention
- XSS protection

## 💳 Payment Integration

### eSewa Integration

The application integrates with eSewa, Nepal's popular payment gateway:

1. **Test Environment:** Uses eSewa UAT environment
2. **Payment Flow:** 
   - User initiates payment
   - Redirected to eSewa
   - Payment verification
   - Booking confirmation

### Test Credentials

For eSewa testing:
- **Merchant Code:** EPAYTEST
- **Test Amount:** Any amount
- **Success URL:** Handled automatically

## 🚀 Deployment

### Backend Deployment

1. Set up PostgreSQL database
2. Configure environment variables
3. Run database migrations
4. Start the server

### Frontend Deployment

1. Build the React app: `npm run build`
2. Serve static files
3. Configure API endpoints

### Environment-Specific Configurations

- **Development:** Full debugging, mock payments
- **Staging:** Production-like environment
- **Production:** Optimized, secure settings

## 🐛 Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Check PostgreSQL service
sudo service postgresql status

# Verify connection settings
psql -h localhost -p 5432 -U username -d futsalbook_nepal
```

**Port Already in Use**
```bash
# Kill process on port 5000
sudo lsof -ti:5000 | xargs sudo kill -9

# Or use different port
PORT=5001 npm run dev
```

**Dependencies Issues**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Getting Help

1. Check the console for error messages
2. Verify environment variables
3. Ensure database is running
4. Check API endpoint responses
5. Review browser network tab

## 📚 Additional Resources

- [Node.js Documentation](https://nodejs.org/docs/)
- [React Documentation](https://reactjs.org/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Express.js Guide](https://expressjs.com/guide/)
- [eSewa API Documentation](https://developer.esewa.com.np/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Happy Coding! 🚀**

For support, please contact: support@futsalbook.nepal