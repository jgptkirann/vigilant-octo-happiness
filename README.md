# FutsalBook Nepal

A comprehensive futsal booking platform connecting users with futsal facilities across Nepal.

## 🏆 Features

### For Users (Players)
- Browse and search futsal facilities
- View facility details, photos, and reviews
- Real-time slot availability checking
- Online booking with secure payments
- Booking history and management
- Rate and review facilities

### For Futsal Owners
- Facility management dashboard
- Pricing and schedule management
- Booking calendar and analytics
- Revenue tracking and reports
- Customer management

### For Admins
- Platform management and analytics
- User and facility oversight
- Transaction and commission tracking
- Content moderation

## 🚀 Tech Stack

- **Frontend**: React.js with TypeScript
- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT
- **Payments**: eSewa Integration
- **File Storage**: Local storage (upgradeable to cloud)
- **Email**: Nodemailer
- **SMS**: Third-party SMS API

## 📦 Installation

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (v13 or higher)
- npm or yarn

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd futsalbook-nepal
```

2. Install dependencies:
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. Setup environment variables:
```bash
# Backend (.env)
cp backend/.env.example backend/.env
# Edit the .env file with your configuration

# Frontend (.env)
cp frontend/.env.example frontend/.env
# Edit the .env file with your configuration
```

4. Setup database:
```bash
cd backend
npm run db:migrate
npm run db:seed
```

5. Start the application:
```bash
# Start backend (from backend directory)
npm run dev

# Start frontend (from frontend directory)
npm run dev
```

## 🏗️ Project Structure

```
futsalbook-nepal/
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Custom middleware
│   │   ├── services/       # Business logic
│   │   ├── config/         # Configuration files
│   │   └── utils/          # Utility functions
│   ├── migrations/         # Database migrations
│   ├── seeds/              # Database seeds
│   └── uploads/            # File uploads
├── frontend/               # React.js client
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom hooks
│   │   ├── services/       # API services
│   │   ├── context/        # React context
│   │   ├── utils/          # Utility functions
│   │   └── types/          # TypeScript types
│   └── public/             # Static assets
├── docs/                   # Documentation
└── docker/                 # Docker configuration
```

## 🌍 Environment Variables

### Backend
```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://username:password@localhost:5432/futsalbook
JWT_SECRET=your-jwt-secret
ESEWA_MERCHANT_CODE=your-esewa-merchant-code
ESEWA_SECRET_KEY=your-esewa-secret-key
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-email-password
SMS_API_KEY=your-sms-api-key
```

### Frontend
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ESEWA_BASE_URL=https://uat.esewa.com.np
```

## 📊 Database Schema

### Core Tables
- **users**: User accounts and profiles
- **facilities**: Futsal facility information
- **bookings**: Booking records
- **payments**: Payment transactions
- **reviews**: User reviews and ratings
- **time_slots**: Available time slots for booking

## 🔐 Authentication

The application uses JWT-based authentication with the following flow:
1. User registration with phone/email verification
2. Login with credentials
3. JWT token generation and validation
4. Role-based access control (User, Owner, Admin)

## 💳 Payment Integration

### eSewa Integration
- Secure payment processing for bookings
- Real-time payment verification
- Automated receipt generation
- Refund processing for cancellations

## 📱 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/verify` - Phone/email verification
- `POST /api/auth/refresh` - Token refresh

### Facility Endpoints
- `GET /api/facilities` - List facilities with search/filter
- `GET /api/facilities/:id` - Get facility details
- `GET /api/facilities/:id/slots` - Get available slots
- `POST /api/facilities` - Create facility (Owner)
- `PUT /api/facilities/:id` - Update facility (Owner)

### Booking Endpoints
- `POST /api/bookings` - Create booking
- `GET /api/bookings` - Get user bookings
- `GET /api/bookings/:id` - Get booking details
- `PUT /api/bookings/:id` - Update booking
- `DELETE /api/bookings/:id` - Cancel booking

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 🚀 Deployment

### Production Build
```bash
# Build frontend
cd frontend
npm run build

# Start production server
cd backend
npm start
```

### Docker Deployment
```bash
docker-compose up -d
```

## 📈 Monitoring and Analytics

- Booking completion rates
- Revenue tracking
- User engagement metrics
- Performance monitoring

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions, please contact:
- Email: support@futsalbook.nepal
- Phone: +977-XXXX-XXXX

## 🔄 Roadmap

### Phase 1 (MVP) ✅
- [x] User authentication and profiles
- [x] Facility listing and booking
- [x] Payment integration
- [x] Basic admin dashboard

### Phase 2 (Enhanced Features) 🚧
- [ ] Advanced search and filtering
- [ ] Review and rating system
- [ ] Mobile app development
- [ ] Enhanced analytics

### Phase 3 (Scale & Optimize) 📋
- [ ] Performance optimization
- [ ] Multi-language support
- [ ] Tournament organization
- [ ] Equipment rental marketplace
