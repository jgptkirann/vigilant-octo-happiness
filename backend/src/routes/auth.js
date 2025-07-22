const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const { authRateLimit, authenticateToken } = require('../middleware/auth');
const {
  hashPassword,
  comparePassword,
  generateToken,
  generateRefreshToken,
  generateRandomToken,
  generateOTP,
  isValidEmail,
  isValidPhoneNumber,
  sanitizePhone,
  successResponse,
  errorResponse,
  createError
} = require('../utils/helpers');

const router = express.Router();

// Validation middleware
const validateRegistration = [
  body('name')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .trim(),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('phone')
    .custom((value) => {
      if (!isValidPhoneNumber(value)) {
        throw new Error('Please provide a valid Nepal phone number');
      }
      return true;
    }),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('role')
    .optional()
    .isIn(['user', 'owner'])
    .withMessage('Role must be either user or owner')
];

const validateLogin = [
  body('identifier')
    .notEmpty()
    .withMessage('Email or phone number is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const validateVerification = [
  body('token')
    .notEmpty()
    .withMessage('Verification token is required')
];

const validateForgotPassword = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
];

const validateResetPassword = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
];

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(
      errorResponse('Validation failed', errors.array())
    );
  }
  next();
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', authRateLimit, validateRegistration, handleValidationErrors, async (req, res) => {
  try {
    const { name, email, phone, password, role = 'user' } = req.body;

    // Sanitize phone number
    const cleanPhone = sanitizePhone(phone);

    // Check if user already exists
    const existingUser = await query(
      'SELECT id, email, phone FROM users WHERE email = $1 OR phone = $2',
      [email, cleanPhone]
    );

    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];
      if (user.email === email) {
        return res.status(409).json(
          errorResponse('User already exists with this email address')
        );
      }
      if (user.phone === cleanPhone) {
        return res.status(409).json(
          errorResponse('User already exists with this phone number')
        );
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Generate verification token
    const verificationToken = generateRandomToken();

    // Create user
    const result = await query(`
      INSERT INTO users (name, email, phone, password_hash, role, verification_token)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, email, phone, role, is_verified, created_at
    `, [name, email, cleanPhone, hashedPassword, role, verificationToken]);

    const user = result.rows[0];

    // TODO: Send verification email/SMS
    console.log(`Verification token for ${email}: ${verificationToken}`);

    res.status(201).json(
      successResponse(
        { 
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            isVerified: user.is_verified
          }
        },
        'User registered successfully. Please check your email for verification instructions.'
      )
    );

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json(
      errorResponse('Registration failed. Please try again.')
    );
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', authRateLimit, validateLogin, handleValidationErrors, async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // Determine if identifier is email or phone
    const isEmail = identifier.includes('@');
    const cleanPhone = isEmail ? null : sanitizePhone(identifier);

    // Find user by email or phone
    const userQuery = isEmail
      ? 'SELECT * FROM users WHERE email = $1'
      : 'SELECT * FROM users WHERE phone = $1';
    
    const userParam = isEmail ? identifier : cleanPhone;

    const result = await query(userQuery, [userParam]);

    if (result.rows.length === 0) {
      return res.status(401).json(
        errorResponse('Invalid credentials')
      );
    }

    const user = result.rows[0];

    // Compare password
    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json(
        errorResponse('Invalid credentials')
      );
    }

    // Check if user is verified
    if (!user.is_verified) {
      return res.status(401).json(
        errorResponse('Please verify your account before logging in')
      );
    }

    // Generate tokens
    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Update last login (optional)
    await query(
      'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    res.json(
      successResponse(
        {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            isVerified: user.is_verified,
            profileImage: user.profile_image
          },
          token,
          refreshToken
        },
        'Login successful'
      )
    );

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json(
      errorResponse('Login failed. Please try again.')
    );
  }
});

// @route   POST /api/auth/verify
// @desc    Verify user account
// @access  Public
router.post('/verify', validateVerification, handleValidationErrors, async (req, res) => {
  try {
    const { token } = req.body;

    // Find user with verification token
    const result = await query(
      'SELECT id, name, email, phone, role FROM users WHERE verification_token = $1 AND is_verified = false',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json(
        errorResponse('Invalid or expired verification token')
      );
    }

    const user = result.rows[0];

    // Update user as verified
    await query(
      'UPDATE users SET is_verified = true, verification_token = NULL WHERE id = $1',
      [user.id]
    );

    res.json(
      successResponse(
        {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            isVerified: true
          }
        },
        'Account verified successfully'
      )
    );

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json(
      errorResponse('Verification failed. Please try again.')
    );
  }
});

// @route   POST /api/auth/resend-verification
// @desc    Resend verification email
// @access  Public
router.post('/resend-verification', authRateLimit, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json(
        errorResponse('Please provide a valid email address')
      );
    }

    // Find unverified user
    const result = await query(
      'SELECT id, name, email FROM users WHERE email = $1 AND is_verified = false',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json(
        errorResponse('User not found or already verified')
      );
    }

    const user = result.rows[0];

    // Generate new verification token
    const verificationToken = generateRandomToken();

    // Update verification token
    await query(
      'UPDATE users SET verification_token = $1 WHERE id = $2',
      [verificationToken, user.id]
    );

    // TODO: Send verification email
    console.log(`New verification token for ${email}: ${verificationToken}`);

    res.json(
      successResponse(
        null,
        'Verification email sent successfully'
      )
    );

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json(
      errorResponse('Failed to resend verification email')
    );
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', authRateLimit, validateForgotPassword, handleValidationErrors, async (req, res) => {
  try {
    const { email } = req.body;

    // Find user by email
    const result = await query(
      'SELECT id, name, email FROM users WHERE email = $1 AND is_verified = true',
      [email]
    );

    // Always return success message for security
    const successMessage = 'If an account with that email exists, a password reset link has been sent.';

    if (result.rows.length === 0) {
      return res.json(successResponse(null, successMessage));
    }

    const user = result.rows[0];

    // Generate reset token
    const resetToken = generateRandomToken();
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

    // Update user with reset token
    await query(
      'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
      [resetToken, resetTokenExpires, user.id]
    );

    // TODO: Send password reset email
    console.log(`Password reset token for ${email}: ${resetToken}`);

    res.json(successResponse(null, successMessage));

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json(
      errorResponse('Failed to process password reset request')
    );
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', authRateLimit, validateResetPassword, handleValidationErrors, async (req, res) => {
  try {
    const { token, password } = req.body;

    // Find user with valid reset token
    const result = await query(
      'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json(
        errorResponse('Invalid or expired reset token')
      );
    }

    const user = result.rows[0];

    // Hash new password
    const hashedPassword = await hashPassword(password);

    // Update password and clear reset token
    await query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
      [hashedPassword, user.id]
    );

    res.json(
      successResponse(null, 'Password reset successful')
    );

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json(
      errorResponse('Password reset failed')
    );
  }
});

// @route   POST /api/auth/refresh
// @desc    Refresh access token
// @access  Public
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json(
        errorResponse('Refresh token is required')
      );
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    if (decoded.type !== 'refresh') {
      return res.status(401).json(
        errorResponse('Invalid refresh token')
      );
    }

    // Get user
    const result = await query(
      'SELECT id, name, email, phone, role, is_verified FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json(
        errorResponse('User not found')
      );
    }

    const user = result.rows[0];

    if (!user.is_verified) {
      return res.status(401).json(
        errorResponse('Account not verified')
      );
    }

    // Generate new tokens
    const newToken = generateToken(user.id);
    const newRefreshToken = generateRefreshToken(user.id);

    res.json(
      successResponse(
        {
          token: newToken,
          refreshToken: newRefreshToken
        },
        'Token refreshed successfully'
      )
    );

  } catch (error) {
    console.error('Token refresh error:', error);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json(
        errorResponse('Invalid refresh token')
      );
    }
    res.status(500).json(
      errorResponse('Token refresh failed')
    );
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, email, phone, role, is_verified, profile_image, address, date_of_birth, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(
        errorResponse('User not found')
      );
    }

    const user = result.rows[0];

    res.json(
      successResponse(
        {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            isVerified: user.is_verified,
            profileImage: user.profile_image,
            address: user.address,
            dateOfBirth: user.date_of_birth,
            createdAt: user.created_at
          }
        },
        'User data retrieved successfully'
      )
    );

  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json(
      errorResponse('Failed to retrieve user data')
    );
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (invalidate token)
// @access  Private
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Note: In a production environment, you would typically:
    // 1. Add the token to a blacklist/redis cache
    // 2. Use shorter token expiry times
    // 3. Track active sessions
    
    res.json(
      successResponse(null, 'Logged out successfully')
    );

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json(
      errorResponse('Logout failed')
    );
  }
});

module.exports = router;