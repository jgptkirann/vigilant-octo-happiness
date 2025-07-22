import axios, { AxiosResponse, AxiosError } from 'axios';
import { 
  ApiResponse, 
  User, 
  AuthResponse, 
  LoginForm, 
  RegisterForm,
  Facility,
  FacilityDetails,
  SlotResponse,
  Booking,
  BookingForm,
  Review,
  SearchFilters,
  FacilityForm
} from '../types';
import { getStorageItem, removeStorageItem } from '../utils/helpers';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getStorageItem<string>('token', '');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      removeStorageItem('token');
      removeStorageItem('refreshToken');
      removeStorageItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  // Register new user
  register: async (data: RegisterForm): Promise<ApiResponse<{ user: User }>> => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  // Login user
  login: async (data: LoginForm): Promise<ApiResponse<AuthResponse>> => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  // Get current user
  getCurrentUser: async (): Promise<ApiResponse<{ user: User }>> => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Verify account
  verify: async (token: string): Promise<ApiResponse<{ user: User }>> => {
    const response = await api.post('/auth/verify', { token });
    return response.data;
  },

  // Resend verification
  resendVerification: async (email: string): Promise<ApiResponse<null>> => {
    const response = await api.post('/auth/resend-verification', { email });
    return response.data;
  },

  // Forgot password
  forgotPassword: async (email: string): Promise<ApiResponse<null>> => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  // Reset password
  resetPassword: async (token: string, password: string): Promise<ApiResponse<null>> => {
    const response = await api.post('/auth/reset-password', { token, password });
    return response.data;
  },

  // Refresh token
  refreshToken: async (refreshToken: string): Promise<ApiResponse<{ token: string; refreshToken: string }>> => {
    const response = await api.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  // Logout
  logout: async (): Promise<ApiResponse<null>> => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
};

// Facilities API
export const facilitiesAPI = {
  // Get all facilities with filters
  getFacilities: async (filters?: SearchFilters & { page?: number; limit?: number }): Promise<ApiResponse<{ facilities: Facility[] }>> => {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v.toString()));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }

    const response = await api.get(`/facilities?${params.toString()}`);
    return response.data;
  },

  // Get single facility
  getFacility: async (id: number): Promise<ApiResponse<{ facility: FacilityDetails }>> => {
    const response = await api.get(`/facilities/${id}`);
    return response.data;
  },

  // Get facility time slots
  getFacilitySlots: async (id: number, date: string): Promise<ApiResponse<SlotResponse>> => {
    const response = await api.get(`/facilities/${id}/slots?date=${date}`);
    return response.data;
  },

  // Create facility (owner only)
  createFacility: async (data: FacilityForm): Promise<ApiResponse<{ facility: Facility }>> => {
    const response = await api.post('/facilities', data);
    return response.data;
  },

  // Update facility (owner only)
  updateFacility: async (id: number, data: Partial<FacilityForm>): Promise<ApiResponse<{ facility: Facility }>> => {
    const response = await api.put(`/facilities/${id}`, data);
    return response.data;
  },

  // Delete facility (owner only)
  deleteFacility: async (id: number): Promise<ApiResponse<null>> => {
    const response = await api.delete(`/facilities/${id}`);
    return response.data;
  },
};

// Bookings API
export const bookingsAPI = {
  // Get user bookings
  getBookings: async (params?: { page?: number; limit?: number; status?: string }): Promise<ApiResponse<{ bookings: Booking[] }>> => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          query.append(key, value.toString());
        }
      });
    }

    const response = await api.get(`/bookings?${query.toString()}`);
    return response.data;
  },

  // Get single booking
  getBooking: async (id: number): Promise<ApiResponse<{ booking: Booking }>> => {
    const response = await api.get(`/bookings/${id}`);
    return response.data;
  },

  // Create booking
  createBooking: async (data: BookingForm): Promise<ApiResponse<{ booking: Booking }>> => {
    const response = await api.post('/bookings', data);
    return response.data;
  },

  // Update booking
  updateBooking: async (id: number, data: Partial<BookingForm>): Promise<ApiResponse<{ booking: Booking }>> => {
    const response = await api.put(`/bookings/${id}`, data);
    return response.data;
  },

  // Cancel booking
  cancelBooking: async (id: number): Promise<ApiResponse<null>> => {
    const response = await api.delete(`/bookings/${id}`);
    return response.data;
  },
};

// Reviews API
export const reviewsAPI = {
  // Get facility reviews
  getFacilityReviews: async (facilityId: number, params?: { page?: number; limit?: number }): Promise<ApiResponse<{ reviews: Review[] }>> => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          query.append(key, value.toString());
        }
      });
    }

    const response = await api.get(`/reviews/facility/${facilityId}?${query.toString()}`);
    return response.data;
  },

  // Create review
  createReview: async (data: { facilityId: number; rating: number; comment: string }): Promise<ApiResponse<{ review: Review }>> => {
    const response = await api.post('/reviews', data);
    return response.data;
  },

  // Update review
  updateReview: async (id: number, data: { rating: number; comment: string }): Promise<ApiResponse<{ review: Review }>> => {
    const response = await api.put(`/reviews/${id}`, data);
    return response.data;
  },

  // Delete review
  deleteReview: async (id: number): Promise<ApiResponse<null>> => {
    const response = await api.delete(`/reviews/${id}`);
    return response.data;
  },
};

// Users API
export const usersAPI = {
  // Update profile
  updateProfile: async (data: Partial<User>): Promise<ApiResponse<{ user: User }>> => {
    const response = await api.put('/users/profile', data);
    return response.data;
  },

  // Change password
  changePassword: async (data: { currentPassword: string; newPassword: string }): Promise<ApiResponse<null>> => {
    const response = await api.put('/users/password', data);
    return response.data;
  },

  // Upload profile image
  uploadProfileImage: async (file: File): Promise<ApiResponse<{ imageUrl: string }>> => {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await api.post('/users/profile-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

// Health check
export const healthAPI = {
  check: async (): Promise<any> => {
    const response = await api.get('/health');
    return response.data;
  },
};

export default api;