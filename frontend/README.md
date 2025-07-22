# FutsalBook Nepal - Frontend

A modern React TypeScript frontend application for the FutsalBook Nepal platform - a comprehensive futsal booking system.

## 🚀 Features

### For Users
- **Browse Facilities**: Search and filter futsal courts by location, price, amenities
- **Real-time Availability**: Check time slots and book instantly
- **User Dashboard**: Manage bookings, view history, and track spending
- **Profile Management**: Complete user profile with verification status
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices

### For Facility Owners
- **Facility Management**: Add, edit, and manage futsal facilities
- **Booking Overview**: Track reservations and revenue
- **Dashboard Analytics**: View booking statistics and performance metrics

### Technical Features
- **Modern UI/UX**: Built with Tailwind CSS and Heroicons
- **State Management**: React Query for server state, Context API for client state
- **Authentication**: JWT-based auth with automatic token refresh
- **Real-time Updates**: Live data synchronization
- **Error Handling**: Comprehensive error boundaries and user feedback
- **Type Safety**: Full TypeScript implementation

## 🛠️ Tech Stack

- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Routing**: React Router DOM v6
- **State Management**: 
  - React Query (TanStack Query) for server state
  - React Context for authentication and app state
- **Form Handling**: React Hook Form with validation
- **HTTP Client**: Axios with interceptors
- **Icons**: Heroicons
- **Notifications**: React Hot Toast
- **Build Tool**: Create React App
- **Development**: ESLint, TypeScript compiler

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Backend API running (see backend documentation)

## 🚀 Getting Started

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd futsalbook-nepal/frontend

# Install dependencies
npm install
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit the environment variables
nano .env
```

Environment variables:
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ESEWA_BASE_URL=https://uat.esewa.com.np
REACT_APP_ENV=development
REACT_APP_NAME=FutsalBook Nepal
REACT_APP_VERSION=1.0.0
```

### 3. Start Development Server

```bash
npm start
```

The application will be available at `http://localhost:3000`

## 📁 Project Structure

```
frontend/
├── public/                 # Static assets
│   ├── index.html         # Main HTML template
│   └── manifest.json      # PWA manifest
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── Layout.tsx     # Main layout wrapper
│   │   └── LoadingSpinner.tsx
│   ├── pages/             # Page components
│   │   ├── HomePage.tsx   # Landing page
│   │   ├── LoginPage.tsx  # Authentication
│   │   ├── FacilitiesPage.tsx
│   │   ├── FacilityDetailPage.tsx
│   │   ├── DashboardPage.tsx
│   │   └── ProfilePage.tsx
│   ├── hooks/             # Custom React hooks
│   │   ├── useFacilities.ts
│   │   └── useBookings.ts
│   ├── services/          # API services
│   │   └── api.ts         # HTTP client and API calls
│   ├── context/           # React Context providers
│   │   └── AuthContext.tsx
│   ├── utils/             # Utility functions
│   │   └── helpers.ts     # Common helpers
│   ├── types/             # TypeScript type definitions
│   │   └── index.ts
│   ├── styles/            # Global styles
│   │   └── index.css      # Tailwind CSS imports
│   ├── App.tsx            # Main app component
│   └── index.tsx          # Entry point
├── tailwind.config.js     # Tailwind configuration
├── postcss.config.js      # PostCSS configuration
└── package.json           # Dependencies and scripts
```

## 🎨 Design System

### Colors
- **Primary**: Emerald (green) - `#059669`
- **Secondary**: Gray scale
- **Success**: Green - `#10b981`
- **Warning**: Yellow - `#f59e0b`
- **Error**: Red - `#ef4444`

### Typography
- **Font Family**: Inter (Google Fonts)
- **Headings**: Various weights (600-700)
- **Body**: Regular (400) and medium (500)

### Components
- **Buttons**: Primary, secondary, outline, danger variants
- **Forms**: Consistent input styling with validation states
- **Cards**: Elevation with border and shadow
- **Badges**: Status indicators with color coding

## 🔧 Available Scripts

```bash
# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Type checking
npm run type-check
```

## 🌐 API Integration

The frontend communicates with the backend API through:

### Authentication
- Login/logout with JWT tokens
- Automatic token refresh
- Protected routes with role-based access

### Data Fetching
- React Query for caching and synchronization
- Optimistic updates for better UX
- Error handling and retry logic

### Real-time Features
- Live booking availability
- Instant notifications
- Auto-refresh for critical data

## 📱 Responsive Design

The application is fully responsive with breakpoints:
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

Key responsive features:
- Mobile-first design approach
- Touch-friendly interface
- Optimized navigation for small screens
- Responsive data tables and forms

## 🔒 Security Features

- **Input Validation**: Client-side form validation
- **XSS Protection**: Sanitized user inputs
- **CSRF Protection**: API token validation
- **Secure Storage**: Encrypted localStorage for sensitive data

## 🚀 Performance Optimizations

- **Code Splitting**: Lazy loading of route components
- **Image Optimization**: Responsive images with lazy loading
- **Bundle Optimization**: Tree shaking and minification
- **Caching**: React Query cache management
- **Memoization**: React.memo and useMemo optimizations

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 🔧 Build and Deployment

### Production Build
```bash
npm run build
```

### Environment-specific Builds
```bash
# Staging
REACT_APP_ENV=staging npm run build

# Production
REACT_APP_ENV=production npm run build
```

## 🐛 Debugging

### Development Tools
- React DevTools
- React Query DevTools (development only)
- Redux DevTools (if using Redux)

### Common Issues
1. **API Connection**: Check REACT_APP_API_URL in .env
2. **Authentication**: Verify JWT token in localStorage
3. **CORS**: Ensure backend allows frontend origin

## 📄 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Code Style
- Use TypeScript for all new components
- Follow ESLint configuration
- Use Prettier for code formatting
- Write meaningful component and function names

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

## 🤝 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation wiki

## 🗺️ Roadmap

### Phase 1 (Current)
- ✅ User authentication and registration
- ✅ Facility browsing and search
- ✅ Basic booking functionality
- ✅ User dashboard

### Phase 2 (Next)
- 🔄 Advanced booking with time slot selection
- 🔄 Payment integration (eSewa)
- 🔄 Review and rating system
- 🔄 Mobile app development

### Phase 3 (Future)
- 📋 Real-time notifications
- 📋 Advanced analytics
- 📋 Multi-language support
- 📋 Progressive Web App features