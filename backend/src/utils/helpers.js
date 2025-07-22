const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const moment = require('moment-timezone');

// Default timezone for Nepal
const DEFAULT_TIMEZONE = process.env.DEFAULT_TIMEZONE || 'Asia/Kathmandu';

// Password utilities
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// JWT utilities
const generateToken = (userId, expiresIn = process.env.JWT_EXPIRES_IN || '24h') => {
  return jwt.sign(
    { userId, timestamp: Date.now() },
    process.env.JWT_SECRET,
    { expiresIn }
  );
};

const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh', timestamp: Date.now() },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
};

// Generate random tokens
const generateRandomToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
};

// Generate unique booking code
const generateBookingCode = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

// Date and time utilities
const getCurrentNepalTime = () => {
  return moment().tz(DEFAULT_TIMEZONE);
};

const formatNepalTime = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
  return moment(date).tz(DEFAULT_TIMEZONE).format(format);
};

const parseNepalTime = (dateString) => {
  return moment.tz(dateString, DEFAULT_TIMEZONE);
};

const addMinutes = (date, minutes) => {
  return moment(date).add(minutes, 'minutes');
};

const isValidBookingTime = (startTime, endTime, minDuration = 30) => {
  const start = moment(startTime);
  const end = moment(endTime);
  const duration = end.diff(start, 'minutes');
  
  return duration >= minDuration && end.isAfter(start);
};

const isTimeSlotAvailable = (requestedStart, requestedEnd, existingSlots) => {
  const reqStart = moment(requestedStart);
  const reqEnd = moment(requestedEnd);
  
  return !existingSlots.some(slot => {
    const slotStart = moment(slot.start_time);
    const slotEnd = moment(slot.end_time);
    
    // Check for overlap
    return reqStart.isBefore(slotEnd) && reqEnd.isAfter(slotStart);
  });
};

// Data validation utilities
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPhoneNumber = (phone) => {
  // Nepal phone number format: +977-XXXXXXXXX or 98XXXXXXXX
  const phoneRegex = /^(\+977[-\s]?)?[9][6-8]\d{8}$/;
  return phoneRegex.test(phone.replace(/[\s-]/g, ''));
};

const sanitizePhone = (phone) => {
  // Remove all non-digit characters and format
  const cleaned = phone.replace(/\D/g, '');
  
  // If starts with 977, remove it
  if (cleaned.startsWith('977')) {
    return cleaned.substring(3);
  }
  
  // If starts with +977, already cleaned above
  return cleaned;
};

// Price utilities
const calculateCommission = (amount, rate = 0.10) => {
  return Math.round(amount * rate * 100) / 100; // Round to 2 decimal places
};

const formatPrice = (amount, currency = 'NPR') => {
  return `${currency} ${amount.toFixed(2)}`;
};

// File utilities
const getFileExtension = (filename) => {
  return filename.split('.').pop().toLowerCase();
};

const isValidImageFile = (filename) => {
  const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  const extension = getFileExtension(filename);
  return validExtensions.includes(extension);
};

const generateUniqueFilename = (originalFilename) => {
  const extension = getFileExtension(originalFilename);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}_${random}.${extension}`;
};

// Pagination utilities
const getPaginationParams = (query) => {
  const page = parseInt(query.page) || 1;
  const limit = Math.min(parseInt(query.limit) || 10, 50); // Max 50 items per page
  const offset = (page - 1) * limit;
  
  return { page, limit, offset };
};

const getPaginationMeta = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  
  return {
    currentPage: page,
    totalPages,
    totalItems: total,
    itemsPerPage: limit,
    hasNextPage,
    hasPrevPage,
    nextPage: hasNextPage ? page + 1 : null,
    prevPage: hasPrevPage ? page - 1 : null
  };
};

// Error utilities
const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// Response utilities
const successResponse = (data, message = 'Success', meta = null) => {
  const response = {
    success: true,
    message,
    data
  };
  
  if (meta) {
    response.meta = meta;
  }
  
  return response;
};

const errorResponse = (message, errors = null) => {
  const response = {
    success: false,
    error: message
  };
  
  if (errors) {
    response.errors = errors;
  }
  
  return response;
};

// Array utilities
const removeDuplicates = (array, key = null) => {
  if (key) {
    return array.filter((item, index, self) => 
      index === self.findIndex(t => t[key] === item[key])
    );
  }
  return [...new Set(array)];
};

const shuffle = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Distance calculation (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in km
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

// String utilities
const capitalizeWords = (str) => {
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

module.exports = {
  // Password utilities
  hashPassword,
  comparePassword,
  
  // JWT utilities
  generateToken,
  generateRefreshToken,
  
  // Random generators
  generateRandomToken,
  generateOTP,
  generateBookingCode,
  
  // Date/time utilities
  getCurrentNepalTime,
  formatNepalTime,
  parseNepalTime,
  addMinutes,
  isValidBookingTime,
  isTimeSlotAvailable,
  
  // Validation utilities
  isValidEmail,
  isValidPhoneNumber,
  sanitizePhone,
  
  // Price utilities
  calculateCommission,
  formatPrice,
  
  // File utilities
  getFileExtension,
  isValidImageFile,
  generateUniqueFilename,
  
  // Pagination utilities
  getPaginationParams,
  getPaginationMeta,
  
  // Error utilities
  createError,
  
  // Response utilities
  successResponse,
  errorResponse,
  
  // Array utilities
  removeDuplicates,
  shuffle,
  
  // Location utilities
  calculateDistance,
  
  // String utilities
  capitalizeWords,
  slugify
};