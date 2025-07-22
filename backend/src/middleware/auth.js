const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

// Verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'No token provided'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const result = await query(
      'SELECT id, email, phone, name, role, is_verified FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    // Check if user is verified
    if (!user.is_verified) {
      return res.status(401).json({
        error: 'Account not verified',
        message: 'Please verify your account before accessing this resource'
      });
    }

    // Add user to request object
    req.user = user;
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Token is malformed'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Please login again'
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({
      error: 'Authentication error',
      message: 'Internal server error'
    });
  }
};

// Role-based access control
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please login first'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access forbidden',
        message: `Access denied. Required roles: ${roles.join(', ')}`
      });
    }

    next();
  };
};

// Check if user is facility owner
const checkFacilityOwnership = async (req, res, next) => {
  try {
    const facilityId = req.params.facilityId || req.params.id;
    const userId = req.user.id;

    // Admin can access all facilities
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user owns the facility
    const result = await query(
      'SELECT id FROM facilities WHERE id = $1 AND owner_id = $2',
      [facilityId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({
        error: 'Access forbidden',
        message: 'You can only access your own facilities'
      });
    }

    next();

  } catch (error) {
    console.error('Facility ownership check error:', error);
    return res.status(500).json({
      error: 'Authorization error',
      message: 'Internal server error'
    });
  }
};

// Check if user can access booking
const checkBookingAccess = async (req, res, next) => {
  try {
    const bookingId = req.params.bookingId || req.params.id;
    const userId = req.user.id;

    // Admin can access all bookings
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user owns the booking or owns the facility
    const result = await query(`
      SELECT b.id, b.user_id, f.owner_id
      FROM bookings b
      JOIN facilities f ON b.facility_id = f.id
      WHERE b.id = $1 AND (b.user_id = $2 OR f.owner_id = $2)
    `, [bookingId, userId]);

    if (result.rows.length === 0) {
      return res.status(403).json({
        error: 'Access forbidden',
        message: 'You can only access your own bookings or bookings for your facilities'
      });
    }

    next();

  } catch (error) {
    console.error('Booking access check error:', error);
    return res.status(500).json({
      error: 'Authorization error',
      message: 'Internal server error'
    });
  }
};

// Optional authentication (for public endpoints that benefit from user context)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const result = await query(
      'SELECT id, email, phone, name, role, is_verified FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length > 0 && result.rows[0].is_verified) {
      req.user = result.rows[0];
    } else {
      req.user = null;
    }

    next();

  } catch (error) {
    // If token is invalid, just continue without user
    req.user = null;
    next();
  }
};

// Rate limiting for auth endpoints
const authRateLimit = require('express-rate-limit')({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs for auth endpoints
  message: {
    error: 'Too many authentication attempts',
    message: 'Please try again later',
    retryAfter: 900 // 15 minutes
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  authenticateToken,
  authorize,
  checkFacilityOwnership,
  checkBookingAccess,
  optionalAuth,
  authRateLimit
};