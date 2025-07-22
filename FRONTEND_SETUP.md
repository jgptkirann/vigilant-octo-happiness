# Frontend Setup Guide

## 🎉 Congratulations!

Your FutsalBook Nepal frontend has been successfully created! This is a modern React TypeScript application with a complete UI for the futsal booking platform.

## 🏗️ What's Been Created

### Complete React TypeScript Application
- ✅ **React 18** with TypeScript setup
- ✅ **Tailwind CSS** for modern styling
- ✅ **React Router** for navigation
- ✅ **React Query** for data fetching
- ✅ **Authentication system** with JWT
- ✅ **Responsive design** for all devices

### Pages & Features
- 🏠 **Homepage** - Hero section with featured facilities
- 🏢 **Facilities** - Browse and search futsal courts
- 📋 **Facility Details** - Detailed view with booking
- 👤 **Authentication** - Login and registration
- 📊 **Dashboard** - User statistics and recent bookings
- ⚙️ **Profile** - User account management

### Components & Architecture
- 🧩 **Reusable components** - Layout, LoadingSpinner, etc.
- 🎣 **Custom hooks** - Data fetching and state management
- 🔐 **Context providers** - Authentication and global state
- 🛠️ **API services** - Structured HTTP client
- 📝 **TypeScript types** - Full type safety
- 🎨 **Design system** - Consistent UI patterns

## 🚀 Quick Start

### 1. Start the Frontend

```bash
cd frontend
npm start
```

The app will open at `http://localhost:3000`

### 2. Start the Backend (Required)

Make sure your backend is running:

```bash
cd backend
npm install
npm run dev
```

Backend should be at `http://localhost:5000`

### 3. Environment Configuration

```bash
cd frontend
cp .env.example .env
```

Edit `.env` to match your backend URL:
```
REACT_APP_API_URL=http://localhost:5000/api
```

## 🎯 Key Features

### 🔐 Authentication System
- User registration with role selection (User/Owner)
- Secure login with JWT tokens
- Protected routes and role-based access
- Automatic token refresh

### 🏢 Facility Management
- Browse facilities with search and filters
- Detailed facility pages with images and amenities
- Real-time availability checking
- Booking functionality

### 📊 User Dashboard
- Personal booking statistics
- Recent bookings overview
- Quick action cards
- Profile management

### 📱 Responsive Design
- Mobile-first approach
- Tablet and desktop optimized
- Touch-friendly interface
- Modern UI with Tailwind CSS

## 🛠️ Development

### Available Scripts
```bash
npm start          # Development server
npm run build      # Production build
npm test           # Run tests
npm run lint       # Code linting
npm run type-check # TypeScript checking
```

### Project Structure
```
frontend/src/
├── components/     # Reusable UI components
├── pages/         # Route components
├── hooks/         # Custom React hooks
├── services/      # API integration
├── context/       # React Context providers
├── utils/         # Helper functions
├── types/         # TypeScript definitions
└── styles/        # Global styles
```

## 🎨 UI Components

### Design System
- **Primary Color**: Emerald green (#059669)
- **Typography**: Inter font family
- **Components**: Buttons, forms, cards, badges
- **Responsive**: Mobile, tablet, desktop breakpoints

### Tailwind CSS Classes
```css
/* Custom utility classes */
.btn              /* Base button styles */
.btn-primary      /* Primary button */
.btn-secondary    /* Secondary button */
.form-input       /* Input field styles */
.card             /* Card container */
.badge            /* Status badges */
```

## 🔌 API Integration

### Authentication
- JWT token management
- Automatic API authentication
- Error handling and retry logic

### Data Fetching
- React Query for caching
- Optimistic updates
- Loading and error states

### Backend Endpoints Used
- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration
- `GET /api/facilities` - Browse facilities
- `GET /api/facilities/:id` - Facility details
- `GET /api/bookings` - User bookings

## 🧪 Testing the Application

### 1. Registration Flow
1. Go to `/register`
2. Choose "Book Courts" or "List Facility"
3. Fill in the form and submit
4. Check for success message

### 2. Login Flow
1. Go to `/login`
2. Use email/phone and password
3. Should redirect to dashboard

### 3. Browse Facilities
1. Go to `/facilities`
2. Use search and filters
3. Click on a facility for details

### 4. Dashboard
1. Login as a user
2. View booking statistics
3. Use quick action cards

## 🔧 Customization

### Adding New Pages
1. Create component in `src/pages/`
2. Add route in `src/App.tsx`
3. Update navigation in `src/components/Layout.tsx`

### Modifying Styles
1. Update `tailwind.config.js` for theme changes
2. Modify `src/styles/index.css` for global styles
3. Use Tailwind classes in components

### API Integration
1. Add new endpoints in `src/services/api.ts`
2. Create custom hooks in `src/hooks/`
3. Update TypeScript types in `src/types/`

## 📚 Next Steps

### Immediate
1. ✅ Test the basic functionality
2. ✅ Verify API connectivity
3. ✅ Check responsive design

### Short Term
- 🔄 Add advanced booking functionality
- 🔄 Implement payment integration
- 🔄 Add review and rating system

### Long Term
- 📋 Real-time notifications
- 📋 Advanced analytics
- 📋 Mobile app development

## 🐛 Troubleshooting

### Common Issues

**Frontend won't start:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm start
```

**API connection errors:**
- Check if backend is running on port 5000
- Verify REACT_APP_API_URL in .env file
- Check browser console for CORS errors

**TypeScript errors:**
```bash
# Type checking
npm run type-check

# Fix common issues
npm run lint:fix
```

**Styling issues:**
- Ensure Tailwind CSS is properly configured
- Check if PostCSS is processing styles
- Verify custom CSS classes in index.css

## 🎉 Success!

Your FutsalBook Nepal frontend is now ready! You have:

- ✅ Modern React TypeScript application
- ✅ Beautiful responsive UI
- ✅ Complete authentication system
- ✅ Facility browsing and booking
- ✅ User dashboard and profile
- ✅ Production-ready architecture

**Happy coding!** 🚀

---

Need help? Check the [main README](./README.md) or the [frontend README](./frontend/README.md) for detailed documentation.