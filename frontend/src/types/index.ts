// User types
export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: 'user' | 'owner' | 'admin';
  isVerified: boolean;
  profileImage?: string;
  address?: string;
  dateOfBirth?: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

// Facility types
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Contact {
  phone?: string;
  email?: string;
}

export interface Pricing {
  perHour: number;
}

export interface OperatingHours {
  [key: string]: {
    open: string;
    close: string;
  };
}

export interface Facility {
  id: number;
  name: string;
  description?: string;
  address: string;
  coordinates?: Coordinates;
  contact: Contact;
  pricing: Pricing;
  amenities: string[];
  images: string[];
  operatingHours: OperatingHours;
  rating: number;
  totalReviews: number;
  ownerName: string;
  distance?: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface FacilityDetails extends Facility {
  owner: {
    name: string;
    phone: string;
    email: string;
  };
  recentReviews: Review[];
}

// Booking types
export interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  duration: number;
}

export interface SlotResponse {
  date: string;
  dayOfWeek: string;
  operatingHours: {
    open: string;
    close: string;
  };
  slots: TimeSlot[];
}

export interface Booking {
  id: number;
  facilityId: number;
  facilityName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  duration: number;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  notes?: string;
  createdAt: string;
}

// Review types
export interface Review {
  id: number;
  rating: number;
  comment: string;
  userName: string;
  createdAt: string;
}

// Payment types
export interface Payment {
  id: number;
  bookingId: number;
  amount: number;
  method: 'esewa' | 'khalti' | 'bank_transfer';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transactionId?: string;
  createdAt: string;
}

// Form types
export interface LoginForm {
  identifier: string;
  password: string;
}

export interface RegisterForm {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  role: 'user' | 'owner';
}

export interface BookingForm {
  facilityId: number;
  date: string;
  startTime: string;
  endTime: string;
  notes?: string;
}

export interface FacilityForm {
  name: string;
  description?: string;
  address: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  pricingPerHour: number;
  amenities: string[];
  operatingHours: OperatingHours;
}

// Search and filter types
export interface SearchFilters {
  search?: string;
  latitude?: number;
  longitude?: number;
  maxDistance?: number;
  minPrice?: number;
  maxPrice?: number;
  amenities?: string[];
  sortBy?: 'rating' | 'price' | 'name' | 'distance';
  sortOrder?: 'asc' | 'desc';
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  error: string;
  message: string;
  details?: any[];
}

// Context types
export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (identifier: string, password: string) => Promise<void>;
  register: (data: RegisterForm) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}